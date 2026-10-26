import { declWords, splitComment, splitWords } from "../edit.js";
import { flatten } from "../flatten.js";
import { gmDrumNote } from "../midi.js";
import { noteValue } from "../meter.js";
import { bjorklund } from "../parser/generators.js";
import { codeShifts } from "../program.js";
export const moved = (p, sign, by) => ({ ...p, sign: (p.sign * sign), by: p.by * sign + by });
export const pitchKey = (p) => `${p.table}:${p.sign * p.value + p.by}:${p.sign * p.alter}:${p.transpose}`;
export function pitchText(p) {
    if (typeof p.written === 'number') {
        const alter = p.sign * p.alter;
        return `${p.sign * p.written + p.by}${alter > 0 ? '#' : alter < 0 ? 'b' : ''}`;
    }
    const inner = p.sign === -1 ? `inverse(${p.written})` : p.written;
    if (p.by === 0)
        return inner;
    return /^&[A-Za-z_][A-Za-z0-9_]*$/.test(inner) ? `${inner}^${p.by}` : `degree(${inner}, ${p.by})`;
}
export const pitchOf = (voice) => gmDrumNote(voice.slice(1)) ?? 128;
const REST = /^~(?:!(\d+))?$/;
const HIT = /^&([A-Za-z_][A-Za-z0-9_]*)(?::0(?::([0-9]*\.?[0-9]+))?)?(?:!(\d+))?$/;
const CHORD = /^\[([^[\]]*,[^[\]]*)\]$/;
const SEQ = /^\[([^[\],]*)\]$/;
const EUCLID = /^&([A-Za-z_][A-Za-z0-9_]*)\((\d+),\s*(\d+)(?:,\s*(-?\d+))?\)$/;
const NUMBER = /^([0-9]*\.?[0-9]+)(?:!(\d+))?$/;
const DEGREE = /^(-?\d+)[#b]?(?:!(\d+))?$/;
const REF = String.raw `&[A-Za-z_][A-Za-z0-9_]*(?:\^\$?-?\d+)?`;
const SPLICE = new RegExp(String.raw `^(?:${REF}|inverse\(${REF}\)|degree\((?:${REF}|inverse\(${REF}\)),\s*-?\d+\))$`);
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
export function tapWhole(tap, meter) {
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
    const readBy = new Set(source.split('\n').flatMap((raw) => [
        ...splitComment(raw)[0]
            .replace(/^\s*&[A-Za-z_][A-Za-z0-9_]*/, '')
            .matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g),
    ].map((m) => m[1])));
    const unread = [...result.cells.values()].filter((c) => !c.implicit && !c.lambda && !readBy.has(c.name));
    const cards = [
        ...[...result.cells.values()].filter((c) => (c.map?.kind === 'midi' || c.sink) && !c.implicit).map((c) => c.name),
        ...unread.filter((c) => !c.map && !c.voice && !c.step && entriesOf(source, c.name).length).map((c) => c.name),
    ];
    const out = [];
    const seen = new Set();
    const read = (card) => {
        if (seen.has(card))
            return;
        seen.add(card);
        const entries = entriesOf(source, card);
        for (const entry of entries) {
            const mix = /^&([A-Za-z_][A-Za-z0-9_]*)$/.exec(entry)?.[1];
            const cell = mix ? result.cells.get(mix) : undefined;
            if (cell && !cell.voice && !cell.step && entriesOf(source, mix).length) {
                read(mix);
                continue;
            }
            const factors = entry.split('*').map((f) => f.trim());
            const refs = factors.filter((f) => f.startsWith('&'));
            if (factors.some((f) => !/^&[A-Za-z_][A-Za-z0-9_]*$/.test(f) && !NUMBER.test(f)))
                continue;
            const cells = refs.map((r) => result.cells.get(r.slice(1)));
            if (cells.some((c) => !c))
                continue;
            const levelCells = cells.filter((c) => c.map?.kind === 'amp');
            const triggers = cells.filter((c) => c.map?.kind !== 'amp');
            const voices = triggers.filter((c) => c.voice);
            const at = { name: card, entries, entry };
            if (triggers.length === 2 && voices.length === 1 && !levelCells.length) {
                const line = pitchedLineOf(source, result, triggers.find((c) => !c.voice).name, voices[0].name, at);
                if (line)
                    out.push(line);
                continue;
            }
            if (triggers.length !== 1 || levelCells.length > 1)
                continue;
            const line = lineOf(source, result, triggers[0].name, levelCells[0]?.name, at);
            if (line)
                out.push(line);
        }
    };
    for (const card of cards)
        read(card);
    for (const c of unread) {
        if (!c.over || !c.step || c.voice || c.map)
            continue;
        const line = pitchedLineOf(source, result, c.name, null, { name: c.name, entries: [], entry: `&${c.name}` });
        if (line)
            out.push(line);
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
function pitchedLineOf(source, result, trigger, voice, card) {
    const words = declWords(source, trigger);
    const cell = result.cells.get(trigger);
    if (!words || !cell.step)
        return null;
    const meter = result.cells.get(cell.step.driver)?.meter ?? null;
    const written = [];
    for (const token of words.braid) {
        const rest = REST.exec(token);
        const degree = DEGREE.exec(token);
        if (rest)
            for (let i = 0; i < Number(rest[1] ?? 1); i++)
                written.push(null);
        else if (degree)
            for (let i = 0; i < Number(degree[2] ?? 1); i++)
                written.push(Number(degree[1]));
        else if (SPLICE.test(token))
            written.push(token);
        else
            return null;
    }
    if (!written.length || written.length !== cell.steps)
        return null;
    const events = flatten(result, trigger, codeShifts(result));
    const notes = [];
    for (const [step, w] of written.entries()) {
        const at = events.filter((e) => Math.abs(e.step - step) < 1e-9);
        if (w === null ? at.length : at.length !== 1 || Math.abs(at[0].duration - 1) > 1e-9)
            return null;
        if (w === null)
            continue;
        const e = at[0];
        const pitch = { written: w, sign: 1, by: 0, table: `${e.table}:${e.tableShift}`, value: e.value, alter: e.alter, transpose: e.transpose ?? 0 };
        notes.push({ step, voice: voice === null ? '' : `&${voice}`, own: null, level: 1, pitch });
    }
    if (events.length !== notes.length)
        return null;
    return {
        name: `&${trigger}`,
        trigger,
        card,
        form: 'steps',
        steps: written.length,
        notes,
        stepWhole: tapWhole(cell.step.tap, meter),
        meter,
        pitched: { table: cell.over, voice: voice === null ? '' : `&${voice}` },
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
            const hits = notes.filter((n) => n.step === step).map((n) => (n.pitch ? pitchText(n.pitch) : hitText(n)));
            return hits.length === 0 ? '~' : hits.length === 1 ? hits[0] : `[${hits.join(',')}]`;
        });
        out.set(line.trigger, line.form === 'steps' ? tokens : [`[${tokens.join(' ')}]`]);
    }
    if (line.levels && levels)
        out.set(line.levels.cell, [...levels]);
    return out;
}
