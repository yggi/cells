import { declWords } from "../edit.js";
import { resolveIn } from "../helix.js";
import { codeShifts } from "../program.js";
import { tapWhole } from "./lines.js";
export const THIRDS = [-2, 2];
export const PHRASE_BARS = 4;
const TONE = /^(-?\d+)([#b])?$/;
const STACK = /^\[(-?\d+[#b]?(?:,-?\d+[#b]?)+)\]$/;
const HALVES = /^\[(\[[^[\]]+\])\s+(\[[^[\]]+\])\]$/;
const RUN = /^(.*?)(?:!(\d+))?$/;
function chordOf(text) {
    const m = STACK.exec(text);
    if (!m)
        return null;
    const tones = [];
    for (const t of m[1].split(',')) {
        const n = TONE.exec(t);
        tones.push({ degree: Number(n[1]), alter: n[2] === '#' ? 1 : n[2] === 'b' ? -1 : 0 });
    }
    return tones;
}
function slotOf(token) {
    const [, body, run] = RUN.exec(token);
    const halves = HALVES.exec(body);
    const slot = halves ? [chordOf(halves[1]), chordOf(halves[2])] : [chordOf(body)];
    if (slot.some((c) => c === null))
        return null;
    return { slot: slot, run: run ? Number(run) : 1 };
}
const toneText = (t) => `${t.degree}${t.alter > 0 ? '#' : t.alter < 0 ? 'b' : ''}`;
const chordText = (c) => `[${c.map(toneText).join(',')}]`;
const slotText = (s) => (s.length === 1 ? chordText(s[0]) : `[${s.map(chordText).join(' ')}]`);
export function progressionBraid(slots) {
    const out = [];
    for (let i = 0; i < slots.length;) {
        const text = slotText(slots[i]);
        let n = 1;
        while (i + n < slots.length && slotText(slots[i + n]) === text)
            n++;
        out.push(n > 1 ? `${text}!${n}` : text);
        i += n;
    }
    return out;
}
export function progressionsOf(text, result, own, played) {
    const out = [];
    for (const name of own) {
        const cell = result.cells.get(name);
        if (!cell?.step || played.has(name) || cell.voice)
            continue;
        const meter = result.cells.get(cell.step.driver)?.meter ?? null;
        const stepWhole = tapWhole(cell.step.tap, meter);
        const words = declWords(text, name);
        const over = words?.attrs.find((a) => a.startsWith('over=&'))?.slice('over=&'.length);
        if (stepWhole === null || !words || !over || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(over))
            continue;
        const slots = [];
        let read = true;
        for (const token of words.braid) {
            const s = slotOf(token);
            if (!s) {
                read = false;
                break;
            }
            for (let k = 0; k < s.run; k++)
                slots.push(s.slot);
        }
        if (!read || !slots.length || slots.length !== cell.steps)
            continue;
        out.push({ name: `&${name}`, table: over, slots, stepWhole, meter, cadence: cadenceOf(slots.length, stepWhole, meter) });
    }
    return out;
}
function cadenceOf(steps, stepWhole, meter) {
    const bar = meter ? meter.pulses / meter.unit : 1;
    const lap = (steps * stepWhole) / bar;
    const whole = Math.abs(lap - Math.round(lap)) < 1e-9 ? Math.round(lap) : null;
    const bars = whole !== null && whole % PHRASE_BARS === 0 ? Array.from({ length: whole / PHRASE_BARS }, (_, k) => (k + 1) * PHRASE_BARS - 1) : [Math.ceil(lap) - 1];
    const eps = 1e-9;
    return Array.from({ length: steps }, (_, s) => s).filter((s) => {
        const [from, to] = [(s * stepWhole) / bar, ((s + 1) * stepWhole) / bar];
        return bars.some((b) => from < b + 1 - eps && to > b + eps);
    });
}
export function progressionNotes(p, slots, k) {
    return slots.flatMap((slot, step) => slot.flatMap((chord, h) => {
        const length = p.stepWhole / slot.length;
        return chord.map((t) => ({ at: step * p.stepWhole + h * length, key: `${length} chords#${k} ${p.table}:0:${t.degree}:${t.alter}:0` }));
    }));
}
export function progressionKey(p, slots) {
    return slots
        .map((slot, step) => slot
        .map((chord, h) => `${step}.${h}/${slot.length}:${[...chord]
        .map((t) => `${t.degree}${t.alter}`)
        .sort()
        .join(',')}`)
        .join(' '))
        .join('|');
}
function spansOf(p) {
    const n = p.slots.length;
    if (!p.cadence.length)
        return [Array.from({ length: n }, (_, s) => s)];
    return p.cadence.map((start, k) => {
        const end = p.cadence[(k + 1) % p.cadence.length] + (k + 1 === p.cadence.length ? n : 0);
        return Array.from({ length: end - start - 1 }, (_, j) => (start + 1 + j) % n);
    });
}
function respanned(p, place) {
    const slots = [...p.slots];
    for (const span of spansOf(p))
        for (const [j, step] of span.entries())
            slots[step] = p.slots[span[place(span, j)]];
    return slots;
}
export function progressionCandidates(p, operators, result) {
    const out = [];
    const free = (s) => !p.cadence.includes(s);
    const shifts = codeShifts(result);
    const at = (degree, alter = 0) => resolveIn(result, p.table, 0, degree, alter, shifts).position;
    for (const operator of operators) {
        if (operator === 'rotate')
            out.push({ operator, amounts: [], slots: respanned(p, (span, j) => (j + span.length - 1) % span.length), what: 'each phrase a step later, its last chord to its first' });
        else if (operator === 'reverse')
            out.push({ operator, amounts: [], slots: respanned(p, (span, j) => span.length - 1 - j), what: 'each phrase in reverse order, the cadences kept' });
        else if (operator === 'third')
            p.slots.forEach((slot, s) => {
                if (!free(s) || slot.length !== 1)
                    return;
                for (const n of THIRDS) {
                    const slots = [...p.slots];
                    slots[s] = [slot[0].map((t) => ({ ...t, degree: t.degree + n }))];
                    out.push({ operator, amounts: [s, n], slots, what: `its chord on step ${s} a third ${n > 0 ? 'up' : 'down'}` });
                }
            });
        else if (operator === 'dominant')
            p.slots.forEach((slot, s) => {
                if (!free(s) || slot.length !== 1)
                    return;
                const here = slot[0];
                const next = p.slots[(s + 1) % p.slots.length][0];
                const dominant = dominantOf(next, here, at);
                if (!dominant)
                    return;
                const slots = [...p.slots];
                slots[s] = [here, dominant];
                out.push({ operator, amounts: [s], slots, what: `the dominant of the next chord on step ${s}'s second half` });
            });
    }
    return out;
}
const near = (a, b) => Math.abs(a - b) < 1e-6;
const samePitchClass = (a, b) => near((((a - b + 0.5) % 12) + 12) % 12, 0.5);
function dominantOf(target, here, at) {
    const [root, third, fifth] = target;
    if (!root || !third || !fifth)
        return null;
    const base = at(root.degree, root.alter);
    const from = at(here[0].degree, here[0].alter);
    if (samePitchClass(from, base) || samePitchClass(from, base + 7) || near(at(fifth.degree, fifth.alter) - base, 6))
        return null;
    const intervals = target.length >= 4 ? [0, 4, 7, 10] : [0, 4, 7];
    const spelled = (first, five) => {
        const tones = [];
        for (const [k, iv] of intervals.entries()) {
            const degree = first + 2 * k;
            const alter = [0, 1, -1].find((a) => near(at(degree, a), five + iv));
            if (alter === undefined)
                return null;
            tones.push({ degree, alter });
        }
        return tones;
    };
    const ways = [spelled(root.degree + 4, base + 7), spelled(root.degree - 3, base - 5)].filter((t) => t !== null);
    const away = (t) => Math.abs(at(t[0].degree, t[0].alter) - from);
    return ways.sort((a, b) => away(a) - away(b))[0] ?? null;
}
export function progressionReference(p, slots, written) {
    const delta = [];
    let kept = 0;
    for (const [s, slot] of slots.entries()) {
        if (slotText(slot) === slotText(p.slots[s])) {
            kept++;
            continue;
        }
        if (kept)
            delta.push(kept === 1 ? '=' : `=!${kept}`);
        delta.push(slotText(slot));
        kept = 0;
    }
    if (!delta.length)
        return null;
    const form = `base=${p.name} ${delta.join(' ')}`;
    const line = (name) => `&${name} ${form}`;
    return line(p.name.slice(1)).length <= written.join(' ').length ? { form, line } : null;
}
