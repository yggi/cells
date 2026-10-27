import { stepTokens } from "./lines.js";
const HELD = /@(\d+)$/;
const RUN = /^(.+)!(\d+)$/;
function tokensOf(braid, steps) {
    const out = [];
    let at = 0;
    for (const text of braid) {
        const held = HELD.exec(text);
        const run = RUN.exec(text);
        const len = held ? Number(held[1]) : run ? Number(run[2]) : 1;
        out.push({ start: at, len });
        at += len;
    }
    return at === steps ? out : null;
}
const DISPLAY = /^(label|tags|show|about|title)=/;
export function referenceOf(line, braid, attrs, operator, notes, pinned, amount) {
    if (line.form !== 'steps' || line.levels || line.euclid || !notes.length)
        return null;
    const tokens = tokensOf(braid, line.steps);
    if (!tokens)
        return null;
    const x = line.name;
    const n = line.steps;
    const T = tokens.length;
    const before = stepTokens(line, line.notes);
    const after = stepTokens(line, notes);
    const writtenOut = (a, b, as = after) => as.slice(a, b).filter((t) => t !== null);
    const own = attrs.filter((a) => !DISPLAY.test(a));
    const pins = [...pinned].sort((a, b) => a - b);
    const based = (base, at) => {
        const delta = [];
        let kept = 0;
        for (let s = 0; s < n; s++) {
            const token = at(s);
            if (token === null) {
                if (before[s] !== null)
                    kept++;
                continue;
            }
            if (kept)
                delta.push(kept === 1 ? '=' : `=!${kept}`);
            delta.push(token);
            kept = 0;
        }
        return { form: `base=${base} ${delta.join(' ')}`.trim(), line: (name) => `&${name} base=${base} ${delta.join(' ')}`.trim() };
    };
    const index = (k) => (k === T - 1 && T > 1 ? '-1' : String(k));
    const pickText = (i, j) => i === 0 && j === T ? x : j - i === 1 ? `${x}[${index(i)}]` : i === 0 ? `${x}[:${j === T - 1 ? '-1' : j}]` : j === T ? `${x}[${index(i)}:]` : `${x}[${i}:${j}]`;
    const pickOf = (a, b) => {
        const i = tokens.findIndex((t) => t.start === a);
        const j = tokens.findIndex((t) => t.start === b);
        return i < 0 || (j < 0 && b !== n) ? null : [i, j < 0 ? T : j];
    };
    const moved = (a, b, move) => {
        const p = pickOf(a, b);
        return p ? [move(pickText(...p))] : writtenOut(a, b);
    };
    const braided = (parts) => {
        const form = parts.join(' ');
        return { form, line: (name) => [`&${name}`, ...own, form].join(' ') };
    };
    let ref = null;
    if (operator === 'rotate') {
        if (tokens.at(-1).len === 1)
            ref = { form: `${x}[<<]`, line: (name) => `&${name} [${x}[<<]]` };
    }
    else if (operator === 'transpose') {
        ref = pins.length ? based(`${x}^${amount}`, (s) => (pinned.has(s) ? before[s] : null)) : braided([`${x}^${amount}`]);
    }
    else if (operator === 'invert') {
        const mirror = (pick) => (amount ? `degree(inverse(${pick}), ${amount})` : `inverse(${pick})`);
        const parts = [];
        let at = 0;
        for (const p of [...pins, n]) {
            if (p > at)
                parts.push(...moved(at, p, mirror));
            if (p < n)
                parts.push(...moved(p, p + 1, (pick) => pick));
            at = p + 1;
        }
        ref = braided(parts);
    }
    else if (operator === 'reverse') {
        if (!pins.length)
            ref = braided([`${x}[::-1]`]);
        else {
            const wraps = pins[0] > 0;
            const parts = wraps ? writtenOut(0, pins[0]) : [];
            for (const [k, p] of pins.entries()) {
                parts.push(...moved(p, p + 1, (pick) => pick));
                const [a, b] = [p + 1, pins[k + 1] ?? n];
                const span = pickOf(a, b);
                if (b <= a)
                    continue;
                if (wraps && k === pins.length - 1)
                    parts.push(...writtenOut(a, b));
                else if (b - a === 1)
                    parts.push(...moved(a, b, (pick) => pick));
                else if (span)
                    parts.push(`${x}[${span[1] === T ? '' : span[1] - 1}:${span[0] - 1}:-1]`);
                else
                    parts.push(...writtenOut(a, b));
            }
            ref = braided(parts);
        }
    }
    else
        ref = based(x, (s) => (before[s] === after[s] ? null : after[s]));
    if (!ref || !ref.form.includes(x))
        return null;
    return ref.line(line.trigger).length <= [x, ...own, ...writtenOut(0, n)].join(' ').length ? ref : null;
}
