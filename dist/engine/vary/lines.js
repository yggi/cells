import { declWords, splitWords } from "../edit.js";
import { gmDrumNote } from "../midi.js";
import { noteValue } from "../meter.js";
import { bjorklund } from "../parser/generators.js";
export const pitchOf = (voice) => gmDrumNote(voice.slice(1)) ?? 128;
const REST = /^~(?:!(\d+))?$/;
const HIT = /^&([A-Za-z_][A-Za-z0-9_]*)(?::0(?::([0-9]*\.?[0-9]+))?)?(?:!(\d+))?$/;
const CHORD = /^\[([^[\]]*,[^[\]]*)\]$/;
const SEQ = /^\[([^[\],]*)\]$/;
const EUCLID = /^&([A-Za-z_][A-Za-z0-9_]*)\((\d+),\s*(\d+)(?:,\s*(-?\d+))?\)$/;
const NUMBER = /^([0-9]*\.?[0-9]+)(?:!(\d+))?$/;
function hitOf(token) {
    const m = HIT.exec(token);
    return m && !m[3] ? { voice: `&${m[1]}`, own: m[2] ?? null } : null;
}
function stepsOf(tokens) {
    const out = [];
    for (const token of tokens) {
        const rest = REST.exec(token);
        const hit = HIT.exec(token);
        const chord = CHORD.exec(token);
        if (rest)
            for (let i = 0; i < Number(rest[1] ?? 1); i++)
                out.push([]);
        else if (hit)
            for (let i = 0; i < Number(hit[3] ?? 1); i++)
                out.push([{ voice: `&${hit[1]}`, own: hit[2] ?? null }]);
        else if (chord) {
            const hits = chord[1].split(',').map((t) => hitOf(t.trim()));
            if (hits.some((h) => !h))
                return null;
            out.push(hits);
        }
        else
            return null;
    }
    return out;
}
function numbersOf(tokens) {
    const out = [];
    for (const token of tokens) {
        const m = NUMBER.exec(token);
        if (!m)
            return null;
        for (let i = 0; i < Number(m[2] ?? 1); i++)
            out.push(m[1]);
    }
    return out;
}
export const euclidHits = (k, n, r) => {
    const p = bjorklund(k, n);
    return Array.from({ length: n }, (_, j) => j).filter((j) => p[(((j - r) % n) + n) % n]);
};
function tapWhole(tap, meter) {
    if (!tap || !meter)
        return null;
    const bar = meter.pulses / meter.unit;
    if (tap === '1m')
        return bar;
    if (tap === 'pulse')
        return 1 / meter.unit;
    return noteValue(tap);
}
function entriesOf(source, card) {
    const braid = declWords(source, card)?.braid ?? [];
    if (braid.length !== 1 || !/^\[.*\]$/.test(braid[0]))
        return [];
    return braid[0]
        .slice(1, -1)
        .split(',')
        .map((entry) => entry.trim());
}
export function linesOf(source, result) {
    const cards = [...result.cells.values()].filter((c) => (c.map?.kind === 'midi' || c.sink) && !c.implicit);
    const out = [];
    for (const card of cards) {
        const entries = entriesOf(source, card.name);
        for (const entry of entries) {
            const factors = entry.split('*').map((f) => f.trim());
            const refs = factors.filter((f) => f.startsWith('&'));
            if (factors.some((f) => !/^&[A-Za-z_][A-Za-z0-9_]*$/.test(f) && !NUMBER.test(f)))
                continue;
            const cells = refs.map((r) => result.cells.get(r.slice(1)));
            if (cells.some((c) => !c))
                continue;
            const levelCells = cells.filter((c) => c.map?.kind === 'amp');
            const triggers = cells.filter((c) => c.map?.kind !== 'amp');
            if (triggers.length !== 1 || levelCells.length > 1)
                continue;
            const line = lineOf(source, result, triggers[0].name, levelCells[0]?.name, { name: card.name, entries, entry });
            if (line)
                out.push(line);
        }
    }
    return out;
}
function lineOf(source, result, trigger, levelCell, card) {
    const words = declWords(source, trigger);
    const cell = result.cells.get(trigger);
    if (!words || !cell.step)
        return null;
    const meter = result.cells.get(cell.step.driver)?.meter ?? null;
    const tap = tapWhole(cell.step.tap, meter);
    const isVoice = (voice) => !!result.cells.get(voice.slice(1))?.voice;
    let form = 'steps';
    let steps;
    let euclid;
    if (words.braid.length === 1 && EUCLID.test(words.braid[0])) {
        const [, voice, k, n, r] = EUCLID.exec(words.braid[0]);
        form = 'euclid';
        euclid = { voice: `&${voice}`, k: Number(k), n: Number(n), r: Number(r ?? 0) };
        const hits = new Set(euclidHits(euclid.k, euclid.n, euclid.r));
        steps = Array.from({ length: euclid.n }, (_, j) => (hits.has(j) ? [{ voice: euclid.voice, own: null }] : []));
    }
    else if (words.braid.length === 1 && SEQ.test(words.braid[0])) {
        form = 'seq';
        steps = stepsOf(splitWords(SEQ.exec(words.braid[0])[1]));
    }
    else
        steps = stepsOf(words.braid);
    if (!steps?.length || steps.some((s) => s.some((h) => !isVoice(h.voice))))
        return null;
    if (form === 'steps' && steps.length !== cell.steps)
        return null;
    let levels;
    if (levelCell) {
        const tokens = numbersOf(declWords(source, levelCell)?.braid ?? []);
        if (!tokens || tokens.length !== steps.length)
            return null;
        levels = { cell: levelCell, tokens };
    }
    const notes = steps
        .flatMap((hits, step) => hits.map((h) => ({ step, voice: h.voice, own: h.own, level: Number(h.own ?? 1) * Number(levels?.tokens[step] ?? 1) })))
        .filter((n) => n.level > 0)
        .sort((a, b) => a.step - b.step || pitchOf(a.voice) - pitchOf(b.voice));
    return {
        name: `&${trigger}`,
        trigger,
        card,
        form,
        ...(euclid ? { euclid } : {}),
        ...(levels ? { levels } : {}),
        steps: steps.length,
        notes,
        stepWhole: tap === null ? null : form === 'steps' ? tap : tap / steps.length,
        meter,
    };
}
const hitText = (n) => (n.own === null ? n.voice : `${n.voice}:0:${n.own}`);
export function written(line, notes, levels, rotated = false) {
    const out = new Map();
    if (!notes.length) {
        const entries = line.card.entries.filter((e) => e !== line.card.entry);
        if (!entries.length)
            return null;
        out.set(line.card.name, [`[${entries.join(', ')}]`]);
    }
    if (line.euclid && rotated) {
        const { voice, k, n, r } = line.euclid;
        out.set(line.trigger, [`${voice}(${k},${n},${(r + 1) % n})`]);
    }
    else {
        const tokens = Array.from({ length: line.steps }, (_, step) => {
            const hits = notes.filter((n) => n.step === step).map(hitText);
            return hits.length === 0 ? '~' : hits.length === 1 ? hits[0] : `[${hits.join(',')}]`;
        });
        out.set(line.trigger, line.form === 'steps' ? tokens : [`[${tokens.join(' ')}]`]);
    }
    if (line.levels && levels)
        out.set(line.levels.cell, [...levels]);
    return out;
}
