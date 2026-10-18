const OPEN = /^(`{3,})([^`]*)$/;
export function readBlocks(lines, from) {
    const blocks = [];
    const gaps = [];
    const map = [];
    let gap = [];
    let i = from;
    while (i < lines.length) {
        const line = lines[i];
        const fence = OPEN.exec(line);
        const close = fence ? lines.findIndex((l, j) => j > i && /^`{3,}\s*$/.test(l) && l.trim().length >= fence[1].length) : -1;
        if (fence && fence[2].trim() === 'cells') {
            if (close < 0)
                return { problems: [{ line: i + 1, message: 'the ```cells block is never closed (a line ```)' }] };
            gap.push(line);
            gaps.push(gap);
            gap = [];
            const code = lines.slice(i + 1, close);
            code.forEach((_, k) => map.push({ block: blocks.length, line: i + 2 + k }));
            blocks.push(code);
            gap.push(lines[close]);
            i = close + 1;
        }
        else if (fence) {
            const end = close < 0 ? lines.length - 1 : close;
            gap.push(...lines.slice(i, end + 1));
            i = end + 1;
        }
        else {
            gap.push(line);
            i++;
        }
    }
    if (!blocks.length)
        return { problems: [{ line: Math.max(from, 1), message: 'no ```cells block after the frontmatter' }] };
    const tail = gap.slice(1);
    gaps.push(gap.slice(0, 1));
    const prose = tail
        .join('\n')
        .replace(/^\s*\n/, '')
        .trimEnd();
    return { text: blocks.flat().join('\n'), map, layout: { blocks, gaps }, head: lines.slice(0, from), tail, prose, raw: false };
}
export function readLiterate(source) {
    const lines = source.split(/\r?\n/);
    let from = 0;
    if (lines[0] === '---') {
        const close = lines.indexOf('---', 1);
        if (close < 0)
            return { problems: [{ line: 1, message: 'the frontmatter is never closed: no second line `---`' }] };
        from = close + 1;
    }
    const read = readBlocks(lines, from);
    if ('problems' in read && from === 0 && !lines.some((l) => OPEN.test(l))) {
        return { text: source, map: lines.map((_, k) => ({ block: 0, line: k + 1 })), layout: { blocks: [lines], gaps: [] }, head: [], tail: [], prose: '', raw: true };
    }
    return read;
}
export const fileLine = (map, line) => map[line - 1]?.line ?? line;
function align(a, b) {
    let head = 0;
    while (head < a.length && head < b.length && a[head] === b[head])
        head++;
    let tail = 0;
    while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail])
        tail++;
    const kept = b.map(() => -1);
    for (let k = 0; k < head; k++)
        kept[k] = k;
    for (let k = 0; k < tail; k++)
        kept[b.length - 1 - k] = a.length - 1 - k;
    const n = a.length - head - tail;
    const m = b.length - head - tail;
    if (n === 0 || m === 0 || n * m > MAX_TABLE)
        return kept;
    const w = m + 1;
    const lcs = new Uint32Array((n + 1) * w);
    for (let x = n - 1; x >= 0; x--)
        for (let y = m - 1; y >= 0; y--)
            lcs[x * w + y] = a[head + x] === b[head + y] ? lcs[(x + 1) * w + y + 1] + 1 : Math.max(lcs[(x + 1) * w + y], lcs[x * w + y + 1]);
    for (let x = 0, y = 0; x < n && y < m;) {
        if (a[head + x] === b[head + y])
            kept[head + y++] = head + x++;
        else if (lcs[(x + 1) * w + y] >= lcs[x * w + y + 1])
            x++;
        else
            y++;
    }
    return kept;
}
export const MAX_TABLE = 4_000_000;
export function rewrite(layout, text) {
    const old = layout.blocks.flat();
    if (text === old.join('\n'))
        return layout;
    const lines = text === '' ? [] : text.split('\n');
    if (layout.blocks.length <= 1)
        return { ...layout, blocks: [lines] };
    const blockOf = layout.blocks.flatMap((b, k) => b.map(() => k));
    const kept = align(old, lines);
    const before = [];
    let last = -1;
    kept.forEach((j, k) => (before[k] = j >= 0 ? (last = j) : last));
    const after = [];
    let next = old.length;
    for (let k = kept.length - 1; k >= 0; k--)
        after[k] = kept[k] >= 0 ? (next = kept[k]) : next;
    const blocks = layout.blocks.map(() => []);
    lines.forEach((line, k) => {
        const from = kept[k] >= 0 ? kept[k] : after[k] - before[k] > 1 ? before[k] + 1 : before[k];
        blocks[from < 0 ? 0 : blockOf[from]].push(line);
    });
    return { ...layout, blocks };
}
export function writeBody(layout, prose) {
    const out = [];
    layout.gaps.forEach((gap, k) => {
        out.push(...(k === 0 && gap.every((l, j) => !l.trim() || j === gap.length - 1) ? ['', gap[gap.length - 1]] : gap));
        if (k < layout.blocks.length)
            out.push(...layout.blocks[k]);
    });
    return out.join('\n') + '\n' + (prose ? `\n${prose}\n` : '');
}
export function renderFile(file, layout) {
    const out = [...file.head];
    layout.gaps.forEach((gap, k) => {
        out.push(...gap);
        if (k < layout.blocks.length)
            out.push(...layout.blocks[k]);
    });
    return [...out, ...file.tail].join('\n');
}
