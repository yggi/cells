import { splitComment } from "./edit.js";
import { readUse, USE_FORM } from "./parser/use.js";
export const USE_DEPTH = 8;
const HEAD = /^&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
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
        if (whole)
            out.push({ name: HEAD.exec(whole)?.[1] ?? null, use: readUse(whole), written: carry.written.join('\n'), code: whole, line: carry.line });
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
function merge(own, used, say) {
    const defined = new Set(own.flatMap((l) => (l.name ? [l.name] : [])));
    const given = new Map();
    const lines = own.filter((l) => l.name);
    const per = used.map(({ id, lines: theirs }, i) => {
        const gave = new Set();
        const overrode = new Set();
        for (const l of theirs) {
            if (!l.name)
                continue;
            if (defined.has(l.name)) {
                overrode.add(`&${l.name}`);
                continue;
            }
            const there = given.get(l.name);
            if (there && there.id !== id) {
                if (there.code === l.code)
                    gave.add(`&${l.name}`);
                else
                    say(i, `&${l.name} is defined by ${quoted(there.id)} and by ${quoted(id)}, by different lines: write it in the piece, or drop one use`);
                continue;
            }
            given.set(l.name, { id, code: l.code });
            gave.add(`&${l.name}`);
            lines.push(l);
        }
        return { gave: [...gave], overrode: [...overrode] };
    });
    return { lines, per };
}
function fragmentLines(path, text, resolve, say) {
    const own = linesOf(text);
    const where = ` (in ${pathOf(path)})`;
    const seen = new Set();
    const used = own.flatMap((l) => {
        if (l.use === undefined)
            return [];
        if (l.use === null) {
            say(`${USE_FORM}${where}`);
            return [];
        }
        const id = l.use;
        if (seen.has(id))
            return [];
        seen.add(id);
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
                return [{ id, lines: fragmentLines(next, theirs, resolve, say) }];
        }
        return [{ id, lines: [] }];
    });
    return merge(own, used, (_, message) => say(`${message}${where}`)).lines;
}
export function expansion(text, { resolve, locked = [] } = {}) {
    const own = linesOf(text);
    const uses = own.filter((l) => typeof l.use === 'string');
    const diagnostics = [];
    const spanOf = (l) => {
        const first = l.written.split('\n')[0] ?? '';
        const col = first.search(/\S/);
        return { line: l.line, col: col + 1, len: first.trimEnd().length - col };
    };
    const hashes = [];
    const first = new Map();
    const used = uses.map((u, i) => {
        const span = spanOf(u);
        const earlier = first.get(u.use);
        if (earlier !== undefined) {
            diagnostics.push({ severity: 'warning', message: `use ${quoted(u.use)} is written already, on line ${uses[earlier].line}: this one adds nothing`, span });
            hashes.push(hashes[earlier] ?? null);
            return { id: u.use, lines: [] };
        }
        first.set(u.use, i);
        const say = (message) => diagnostics.push({ severity: 'error', message, span });
        const recorded = locked.find((k) => k.id === u.use)?.hash;
        const theirs = resolve ? resolve(u.use, ...(recorded ? [recorded] : [])) : null;
        if (theirs === null) {
            say(resolve ? `No fragment ${quoted(u.use)} to use` : `No library to use ${quoted(u.use)} from: compileSource(text, env, { resolve })`);
            hashes.push(null);
            return { id: u.use, lines: [] };
        }
        const hash = fragmentHash(theirs);
        hashes.push(hash);
        if (recorded && recorded !== hash)
            diagnostics.push({ severity: 'warning', message: `${quoted(u.use)} has changed since this piece was saved: its current version plays`, span });
        return { id: u.use, lines: fragmentLines([u.use], theirs, resolve, say) };
    });
    const merged = merge(own, used, (i, message) => diagnostics.push({ severity: 'error', message, span: spanOf(uses[i]) }));
    const head = text.split('\n').length;
    const from = new Map(used.flatMap((u, i) => u.lines.map((l) => [l, i])));
    const added = merged.lines.filter((l) => from.has(l));
    const through = [];
    for (const l of added)
        for (let k = l.written.split('\n').length; k > 0; k--)
            through.push(spanOf(uses[from.get(l)]));
    return {
        text: added.length ? [text, ...added.map((l) => l.written)].join('\n') : text,
        uses: uses.map((u, i) => ({ id: u.use, span: spanOf(u), hash: hashes[i] ?? null, gave: merged.per[i].gave, overrode: merged.per[i].overrode })),
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
