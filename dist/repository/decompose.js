const MOTIF_FRAGMENTS = seedFragments('motifs');
const FORM_FRAGMENTS = seedFragments('forms');
import { compileSource } from "../engine/compile.js";
import { flatten, tapped } from "../engine/flatten.js";
import { codeShifts } from "../engine/program.js";
import { structureOf } from "../engine/measure.js";
import { tapWhole } from "../engine/vary/lines.js";
import { resolveSeed } from "./library.js";
import { seedFragments } from "./seed.js";
const benchOf = (meter) => `&bar meter("${meter}") step=120bpm\n&key scale(ionian, C)`;
const keyOf = (n) => `${Math.round(n.at * 1e6)}:${n.degree}:${n.alter}`;
const same = (a, b) => a.length === b.length && a.every((n, i) => keyOf(n) === keyOf(b[i]));
function readCell(text, cell, meter) {
    const result = compileSource(`${benchOf(meter)}\n${text}`, undefined, { resolve: resolveSeed });
    if (!result.ok)
        return null;
    const c = result.cells.get(cell);
    const bench = result.cells.get('bar')?.meter ?? null;
    if (!c?.step || !bench)
        return null;
    const whole = tapWhole(c.step.tap, bench);
    if (whole === null)
        return null;
    const shifts = codeShifts(result);
    const notes = [];
    for (const e of flatten(result, cell, shifts)) {
        if (e.table !== 'key')
            return null;
        const { value, alter } = tapped(result, e, shifts);
        notes.push({ at: e.step * whole, degree: value + 0, alter: alter + 0 });
    }
    return { notes: notes.sort((a, b) => a.at - b.at || a.degree - b.degree), lap: c.steps * whole, bar: bench.pulses / bench.unit };
}
const tokenOf = (n) => `${n.degree}${(n.alter > 0 ? '#' : 'b').repeat(Math.abs(n.alter))}`;
function eighthsText(cell, notes, length) {
    const slots = Math.round(length * 8);
    const at = notes.map((n) => n.at * 8);
    if (at.some((x) => Math.abs(x - Math.round(x)) > 1e-6))
        return null;
    const steps = at.map(Math.round);
    if (new Set(steps).size !== steps.length)
        return null;
    const tokens = [];
    if (steps[0] > 0)
        tokens.push(steps[0] > 1 ? `~@${steps[0]}` : '~');
    steps.forEach((s, i) => {
        const held = (steps[i + 1] ?? slots) - s;
        tokens.push(held > 1 ? `${tokenOf(notes[i])}@${held}` : tokenOf(notes[i]));
    });
    return `&${cell} over=&key step=8n ${tokens.join(' ')}`;
}
export function writtenOut(text, cell, meter, as = cell) {
    const read = readCell(text, cell, meter);
    return read && read.notes.length > 0 ? eighthsText(as, read.notes, read.lap) : null;
}
const window = (notes, from, length) => notes.filter((n) => n.at >= from - 1e-9 && n.at < from + length - 1e-9).map((n) => ({ ...n, at: n.at - from }));
const readMotifs = new WeakMap();
function motifsRead(motifs, meter) {
    const byMeter = readMotifs.get(motifs) ?? new Map();
    readMotifs.set(motifs, byMeter);
    if (!byMeter.has(meter))
        byMeter.set(meter, motifs.flatMap((m) => {
            const read = readCell(`&${m.id} from ${m.id} &key`, m.id, meter);
            return read ? [{ id: m.id, ...read }] : [];
        }));
    return byMeter.get(meter);
}
function partsOf(form) {
    const signature = /^&(\w+) from (?:\(([^)]*)\) )?&(\w+)\s*$/m.exec(form.text);
    if (!signature)
        return null;
    const helpers = (signature[2] ?? '')
        .split(',')
        .map((h) => h.trim().replace(/^&/, ''))
        .filter(Boolean);
    return { head: signature[1], helpers, hole: signature[3] };
}
export function decompose(line, cell, meter, options = {}) {
    const forms = options.forms ?? FORM_FRAGMENTS;
    const motifs = options.motifs ?? MOTIF_FRAGMENTS;
    const asItWas = {
        text: line,
        form: null,
        call: null,
        helpers: {},
        structure: structureOf(line).total,
    };
    const target = readCell(line, cell, meter);
    if (!target || target.notes.length === 0)
        return asItWas;
    const { notes, lap, bar } = target;
    const bars = Math.round(lap / bar);
    if (Math.abs(lap - bars * bar) > 1e-9 || bars < 2)
        return asItWas;
    const known = motifsRead(motifs, meter);
    const motifOf = (segment, length) => known.find((m) => Math.abs(m.lap - length) < 1e-9 && same(m.notes, segment))?.id ?? null;
    const lineOf = (segment, length, name) => {
        const id = motifOf(segment, length);
        if (id)
            return { name: id, text: `&${id} from ${id} &key`, id };
        const text = eighthsText(name, segment, length);
        return text ? { name, text, id: null } : null;
    };
    let best = asItWas;
    for (const form of forms) {
        const parts = partsOf(form);
        if (!parts)
            continue;
        for (let calls = 1; calls <= bars; calls++) {
            const length = (bars / calls) * bar;
            if (bars % calls !== 0)
                continue;
            const call = lineOf(window(notes, 0, length), length, `${cell}Call`);
            if (!call)
                continue;
            const play = (helpers) => {
                const lines = [call.text, ...helpers.map((h) => h.text)];
                const args = helpers.length ? `(${helpers.map((h) => `${h.param}=&${h.name}`).join(', ')})` : '';
                const text = [...new Set(lines), `&${cell} from ${form.id}${args} &${call.name}`].join('\n');
                return { text, read: readCell(text, cell, meter) };
            };
            const firstAt = new Map();
            for (const helper of parts.helpers) {
                const probe = { name: `${cell}Probe`, param: helper, text: `&${cell}Probe over=&key step=8n ${'40 '.repeat(Math.round(length * 8)).trim()}` };
                const at = play([probe]).read?.notes.find((n) => n.degree >= 30)?.at;
                if (at !== undefined)
                    firstAt.set(helper, at);
            }
            const settable = parts.helpers.filter((h) => firstAt.has(h));
            for (let mask = 0; mask < 1 << settable.length; mask++) {
                const set = settable.filter((_, i) => mask & (1 << i));
                const helpers = set.map((param) => {
                    const named = lineOf(window(notes, firstAt.get(param), length), length, `${cell}${param[0].toUpperCase()}${param.slice(1)}`);
                    return named ? { ...named, param } : null;
                });
                if (helpers.some((h) => h === null))
                    continue;
                const { text, read } = play(helpers);
                if (!read || Math.abs(read.lap - lap) > 1e-9 || !same(read.notes, notes))
                    continue;
                const structure = structureOf(text).total;
                if (structure < best.structure)
                    best = {
                        text,
                        form: form.id,
                        call: call.id,
                        helpers: Object.fromEntries(helpers.map((h) => [h.param, h.id])),
                        structure,
                    };
            }
        }
    }
    return best;
}
