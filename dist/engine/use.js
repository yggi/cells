import { splitComment } from "./edit.js";
import { readUse, USE_FORM } from "./parser/use.js";
export const USE_DEPTH = 8;
const HEAD = /^&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
const READS = /&([A-Za-z_][A-Za-z0-9_]*)/g;
const CONTINUES = /[+*,[]\s*$/;
function linesOf(text) {
    const out = [];
    let carry = null;
    text.split('\n').forEach((raw, i) => {
        const code = splitComment(raw)[0];
        carry ??= { written: [], code: [], line: i + 1 };
        carry.written.push(raw);
        carry.code.push(code);
        if (CONTINUES.test(code))
            return;
        const whole = carry.code.join(' ').trim().split(/\s+/).join(' ');
        if (whole) {
            const head = HEAD.exec(whole);
            const reads = head ? [...new Set([...whole.slice(head[0].length).matchAll(READS)].map((m) => m[1]))] : [];
            out.push({ name: head?.[1] ?? null, use: readUse(whole), reads, written: carry.written.join('\n'), code: whole, line: carry.line });
        }
        carry = null;
    });
    return out;
}
export const hasUse = (text) => /^\s*use(?![A-Za-z0-9_])/m.test(text);
function hash64(s) {
    let a = 0x811c9dc5;
    let b = 0x01000193 ^ 0x5bd1e995;
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        a = Math.imul(a ^ c, 0x01000193);
        b = Math.imul(b ^ c, 0x01000193) ^ (b >>> 15);
    }
    return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}
export const fragmentHash = (text) => `e1:${hash64(linesOf(text)
    .map((l) => l.code)
    .join('\n'))}`;
const quoted = (id) => JSON.stringify(id);
const pathOf = (path) => path.map(quoted).join(' → ');
function merge(own, used, say, host) {
    const defined = new Set(own.flatMap((l) => (l.name ? [l.name] : [])));
    const given = new Map();
    const lines = own.filter((l) => l.name);
    const per = used.map(({ id, names, lines: theirs, resolved }, i) => {
        const byName = new Map();
        for (const l of theirs)
            if (l.name && !byName.has(l.name))
                byName.set(l.name, l);
        if (names && resolved) {
            const lacking = [...names].filter((n) => !byName.has(n));
            for (const n of lacking)
                say(i, `&${n} is not in ${quoted(id)}: it defines ${[...byName.keys()].map((m) => `&${m}`).join(', ')}`);
        }
        const asked = names ?? new Set(byName.keys());
        const overrode = [...asked].filter((n) => byName.has(n) && defined.has(n)).map((n) => `&${n}`);
        const take = new Set();
        const clashed = new Set();
        const queue = [...asked].filter((n) => byName.has(n) && !defined.has(n));
        for (let n = queue.shift(); n !== undefined; n = queue.shift()) {
            if (take.has(n))
                continue;
            take.add(n);
            for (const r of byName.get(n).reads) {
                if (!byName.has(r) || take.has(r) || asked.has(r) || clashed.has(r))
                    continue;
                if (!defined.has(r))
                    queue.push(r);
                else {
                    clashed.add(r);
                    say(i, `&${r} is ${quoted(id)}'s, read by its &${n}, and ${host}'s too: rename ${host}'s, or name &${r} in the use to override it`);
                }
            }
        }
        const gave = new Set();
        for (const l of theirs) {
            if (!l.name || !take.has(l.name))
                continue;
            const there = given.get(l.name);
            if (there) {
                if (there.id !== id && there.code === l.code)
                    gave.add(`&${l.name}`);
                else if (there.id !== id)
                    say(i, `&${l.name} is defined by ${quoted(there.id)} and by ${quoted(id)}, by different lines: write it in the piece, or drop one use`);
                continue;
            }
            given.set(l.name, { id, code: l.code });
            gave.add(`&${l.name}`);
            lines.push(l);
        }
        const read = overrode.filter((n) => [...take].some((t) => byName.get(t).reads.includes(n.slice(1))));
        return { gave: [...gave], overrode, read };
    });
    return { lines, per };
}
const namesOf = (u) => (u.names ? new Set(u.names.map((n) => n.slice(1))) : null);
function fragmentLines(path, text, resolve, say) {
    const own = linesOf(text);
    const where = ` (in ${pathOf(path)})`;
    const used = own.flatMap((l) => {
        if (l.use === undefined)
            return [];
        if (l.use === null) {
            say(`${USE_FORM}${where}`);
            return [];
        }
        const { id } = l.use;
        const names = namesOf(l.use);
        const next = [...path, id];
        if (path.includes(id))
            say(`use ${quoted(id)} is a cycle: ${pathOf(next)}`);
        else if (next.length > USE_DEPTH)
            say(`use ${quoted(id)} nests past ${USE_DEPTH} deep: ${pathOf(next)}`);
        else {
            const theirs = resolve(id);
            if (theirs === null)
                say(`No fragment ${quoted(id)} to use${where}`);
            else
                return [{ id, names, lines: fragmentLines(next, theirs, resolve, say), resolved: true }];
        }
        return [{ id, names, lines: [], resolved: false }];
    });
    return merge(own, used, (_, message) => say(`${message}${where}`), quoted(path.at(-1))).lines;
}
export function expansion(text, { resolve, locked = [] } = {}) {
    const own = linesOf(text);
    const uses = own.filter((l) => !!l.use);
    const diagnostics = [];
    const spanOf = (l) => {
        const first = l.written.split('\n')[0] ?? '';
        const col = first.search(/\S/);
        return { line: l.line, col: col + 1, len: first.trimEnd().length - col };
    };
    const hashes = [];
    const used = uses.map((u) => {
        const { id } = u.use;
        const names = namesOf(u.use);
        const span = spanOf(u);
        const say = (message) => diagnostics.push({ severity: 'error', message, span });
        const recorded = locked.find((k) => k.id === id)?.hash;
        const theirs = resolve ? resolve(id, ...(recorded ? [recorded] : [])) : null;
        if (theirs === null) {
            say(resolve ? `No fragment ${quoted(id)} to use` : `No library to use ${quoted(id)} from: compileSource(text, env, { resolve })`);
            hashes.push(null);
            return { id, names, lines: [], resolved: false };
        }
        const hash = fragmentHash(theirs);
        hashes.push(hash);
        if (recorded && recorded !== hash)
            diagnostics.push({ severity: 'warning', message: `${quoted(id)} has changed since this piece was saved: its current version plays`, span });
        return { id, names, lines: fragmentLines([id], theirs, resolve, say), resolved: true };
    });
    const merged = merge(own, used, (i, message) => diagnostics.push({ severity: 'error', message, span: spanOf(uses[i]) }), 'the piece');
    uses.forEach((u, i) => {
        const { gave, overrode, read } = merged.per[i];
        if (!used[i].resolved)
            return;
        const warn = (message) => diagnostics.push({ severity: 'warning', message, span: spanOf(u) });
        const { id, names } = u.use;
        const earlier = uses.findIndex((v) => v.use.id === id);
        if (!gave.length && earlier < i)
            warn(`${quoted(id)} is used already, on line ${uses[earlier].line}: this use adds nothing`);
        else if (names)
            for (const n of overrode.filter((o) => !read.includes(o)))
                warn(`The piece defines ${n}, so taking it from ${quoted(id)} adds nothing`);
        else if (!gave.length && overrode.length)
            warn(`The piece defines all ${quoted(id)} gives (${overrode.join(', ')}): this use adds nothing`);
    });
    const head = text.split('\n').length;
    const from = new Map(used.flatMap((u, i) => u.lines.map((l) => [l, i])));
    const added = merged.lines.filter((l) => from.has(l));
    const through = [];
    for (const l of added)
        for (let k = l.written.split('\n').length; k > 0; k--)
            through.push(spanOf(uses[from.get(l)]));
    return {
        text: added.length ? [text, ...added.map((l) => l.written)].join('\n') : text,
        uses: uses.map((u, i) => ({ id: u.use.id, names: u.use.names, span: spanOf(u), hash: hashes[i] ?? null, gave: merged.per[i].gave, overrode: merged.per[i].overrode })),
        given: new Set(added.flatMap((l) => (l.name ? [l.name] : []))),
        diagnostics,
        through: (line) => (line > head ? (through[line - head - 1] ?? null) : null),
    };
}
export function expand(text, resolve, locked) {
    if (!hasUse(text))
        return text;
    const x = expansion(text, { resolve, ...(locked ? { locked } : {}) });
    const kept = new Set(x.uses.filter((u) => u.hash === null).map((u) => u.span.line));
    const own = text
        .split('\n')
        .filter((raw, i) => readUse(splitComment(raw)[0]) === undefined || kept.has(i + 1))
        .join('\n');
    const added = x.text.split('\n').slice(text.split('\n').length);
    return [own.replace(/\s+$/, ''), ...added].join('\n') + (text.endsWith('\n') ? '\n' : '');
}
