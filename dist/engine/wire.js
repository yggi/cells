import { parse } from "./parser/index.js";
import { compile } from "./compiler/index.js";
import { DEFAULT_ENV, codeShifts } from "./program.js";
import { flatten, stepsOf } from "./flatten.js";
import { entries, resolveIn, semitones, tableChain } from "./helix.js";
import { readsOf } from "./reads.js";
export const WIRE = 1;
const ARG = '__wire_arg';
const PLAIN = /^(-?\d+(\.\d+)?(\/\d+)?|[A-Za-z_][A-Za-z0-9_#-]*)$/;
function written(x) {
    for (let d = 1; d <= 64; d++) {
        const n = Math.round(x * d);
        if (Math.abs(n / d - x) < 1e-9)
            return d === 1 ? String(n) : `${n}/${d}`;
    }
    return null;
}
const pitch = (e) => {
    const v = written(e.value);
    const alter = e.alter + (e.transpose ?? 0);
    if (v === null || !Number.isInteger(alter))
        return null;
    return `${v}${alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter)}`;
};
export function wireArg(value, context) {
    if (PLAIN.test(value))
        return { text: value };
    if (/\bfree\(/.test(value))
        return { refused: 'free() is a hand, and a plugin is handed no hands (wire 1)' };
    let result;
    let decls;
    try {
        const parsed = parse(`${context}\n&${ARG} ${value}`, { old: false });
        decls = new Map(parsed.cells.map((d) => [d.name, d]));
        result = compile(parsed, DEFAULT_ENV);
    }
    catch (e) {
        return { refused: `${value} doesn't read: ${e instanceof Error ? e.message : String(e)}` };
    }
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    if (errors.length || !result.cells.has(ARG))
        return { refused: `${value} doesn't read: ${errors[0]?.message ?? 'no cell'}` };
    const shifts = codeShifts(result);
    const events = flatten(result, ARG, shifts);
    const lap = stepsOf(result, ARG, null);
    if (events.some((e) => e.chance !== undefined || e.options || e.chosen))
        return { refused: `${value} draws by chance, and a plugin can't draw cells' (wire 1)` };
    if (events.some((e) => e.named))
        return { refused: `${value} names a note: write it as a degree (wire 1)` };
    if (events.some((e) => e.laps || e.via || e.reads))
        return { refused: `${value} changes from lap to lap, or reads a value as it moves: a braid fill is filled once (wire 1)` };
    if (events.some((e) => (result.cells.get(e.cell)?.frees.length ?? 0) > 0))
        return { refused: 'free() is a hand, and a plugin is handed no hands (wire 1)' };
    const starts = [...new Set(events.map((e) => e.step))].sort((a, b) => a - b);
    const out = [];
    let at = 0;
    for (const s of starts) {
        const here = events.filter((e) => e.step === s);
        const duration = here[0].duration;
        if (here.some((e) => Math.abs(e.duration - duration) > 1e-9) || s < at - 1e-9)
            return { refused: `${value} overlaps its own notes: a flat braid can't write it (wire 1)` };
        if (s > at + 1e-9)
            out.push(`~${length(s - at)}`);
        const pitches = here.map(pitch);
        if (pitches.some((p) => p === null) || written(duration) === null || written(s) === null)
            return { refused: `${value} has a step the wire can't write` };
        out.push(`${pitches.length === 1 ? pitches[0] : `[${pitches.join(', ')}]`}${length(duration)}`);
        at = s + duration;
    }
    if (lap > at + 1e-9)
        out.push(`~${length(lap - at)}`);
    const text = out.join(' ');
    const tables = [...new Set(events.map((e) => `${e.table}|${e.tableShift}`))];
    if (tables.length > 1)
        return { refused: `${value} is read over ${tables.length} keys: a plugin is handed one (wire 1)` };
    const table = events[0]?.table;
    const cell = table ? result.cells.get(table) : undefined;
    if (!table || !cell || cell.root)
        return { text };
    if (moves(tableChain(result, table), decls))
        return { refused: `${value} is read over a key that moves, and a plugin is handed one key (wire 1)` };
    const tableShift = events[0].tableShift;
    const key = Array.from({ length: entries(result, table, 0).length }, (_, i) => {
        const r = resolveIn(result, table, tableShift, i, 0, shifts);
        return written(semitones(result, r.root, r.position)) ?? String(semitones(result, r.root, r.position));
    }).join(' ');
    return { text, key };
}
const length = (x) => (Math.abs(x - 1) < 1e-9 ? '' : `@${written(x) ?? x}`);
function moves(chain, decls) {
    const seen = new Set();
    for (const queue = [...chain]; queue.length;) {
        const n = queue.shift();
        if (seen.has(n))
            continue;
        seen.add(n);
        const d = decls.get(n);
        if (!d)
            continue;
        if (d.step)
            return true;
        queue.push(...readsOf(d).map((r) => r.name));
    }
    return false;
}
