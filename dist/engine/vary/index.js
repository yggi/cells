import { declarations } from "../../repository/fit.js";
import { compileSource } from "../compile.js";
import { flatten } from "../flatten.js";
import { codeShifts } from "../program.js";
import { declWords, setBraid } from "../edit.js";
import { anchorsAmong } from "./anchors.js";
import { drumNoteOf, linesOf, moved, pitchKey, pitchOf, tapWhole, written } from "./lines.js";
import { referenceOf } from "./reference.js";
import { answeredIn } from "../use.js";
import { formsOf, FORM_FIXED } from "./form.js";
import { EMPTY, fixedOf, shiftMoves, SLOT_OPERATORS, slotMoves, slotReference } from "./slots.js";
import { progressionBraid, progressionCandidates, progressionKey, progressionNotes, progressionReference, progressionsOf } from "./progression.js";
export { backbeatOf } from "./anchors.js";
export { THIRDS, PHRASE_BARS } from "./progression.js";
export const RHYTHM_OPERATORS = ['rotate', 'drop', 'add'];
export const PITCHED_OPERATORS = ['transpose', 'invert', 'reverse', 'bend', 'trim'];
export const HARMONY_OPERATORS = ['rotate', 'reverse', 'third', 'dominant', 'swap', 'substitute'];
export const FORM_OPERATORS = SLOT_OPERATORS;
const REST = JSON.stringify([]);
const LINE_SLOT_OPERATORS = ['swap', 'substitute'];
export const SHIFT = 'shift';
const SLOT_LEVEL = ['third', 'dominant', 'swap', 'substitute', 'shift'];
export const DEGREES = [-2, -1, 1, 2];
export const BENDS = [-2, -1, 1, 2];
export const TRIM_FEWEST = 2;
function read(source, workbench = '', resolve) {
    const fragment = resolve ? answeredIn(source, resolve) : source;
    const own = new Set(declarations(fragment).map((l) => l.name));
    const bench = declarations(workbench)
        .filter((l) => !own.has(l.name))
        .map((l) => l.written);
    const text = [...bench, fragment].join('\n');
    const result = compileSource(text, undefined, resolve ? { resolve } : {});
    if (!result.ok)
        return { lines: [], anchors: [], result: null, own, progressions: [], forms: [] };
    const lines = linesOf(text, result);
    const progressions = progressionsOf(fragment, result, own, playedBy(lines));
    const cadences = progressions.flatMap((p) => p.cadence.map((step) => ({ line: p.name, step, reason: 'cadence' })));
    const forms = formsOf(own, (name) => declWords(fragment, name), new Set([...playedBy(lines), ...progressions.map((p) => p.name.slice(1))]), (name) => !!result.cells.get(name)?.voice);
    return { lines, anchors: [...anchorsAmong(lines, result), ...cadences], result, own, progressions, forms };
}
const playedBy = (lines) => new Set(lines.flatMap((l) => [l.trigger, l.card.name, ...(l.levels ? [l.levels.cell] : [])]));
export const anchorsOf = (fragment, workbench, resolve) => read(fragment, workbench, resolve).anchors;
function fixedLookup(anchors, keep, mask) {
    const kept = new Set(keep.map(named));
    return (name, n, own) => {
        const every = Array.from({ length: n }, (_, s) => s);
        if (kept.has(name))
            return every;
        const given = mask?.[name] ?? mask?.[name.slice(1)];
        if (given)
            return fixedOf(given, n);
        if (own)
            return fixedOf(own, n);
        const mine = anchors.filter((a) => a.line === name);
        return mine.some((a) => a.step === undefined)
            ? every
            : fixedOf(mine.map((a) => a.step), n);
    };
}
export function fixedStepsOf(fragment, options = {}) {
    const { lines, anchors, own, progressions, forms } = read(fragment, options.workbench, options.resolve);
    const fixedFor = fixedLookup(anchors, options.keep ?? [], options.fixed);
    return Object.fromEntries([
        ...lines.filter((l) => own.has(l.trigger)).map((l) => [l.name, fixedFor(l.name, l.steps)]),
        ...progressions.map((p) => [p.name, fixedFor(p.name, p.slots.length, p.cadence)]),
        ...forms.map((f) => [f.name, fixedFor(f.name, f.slots.length, FORM_FIXED)]),
    ]);
}
const named = (name) => (name.startsWith('&') ? name : `&${name}`);
export const variations = (fragment, options) => readVariations(fragment, options).variations.map((v) => v.variation);
export function readVariations(fragment, options = {}) {
    return readSome(fragment, options);
}
function readSome(fragment, options, only) {
    const { workbench, keep = [], fewest = 1, degrees = DEGREES, resolve } = options;
    const operators = only ? [only.operator] : (options.operators ?? RHYTHM_OPERATORS);
    const { lines, anchors, result, own, progressions, forms } = read(fragment, workbench, resolve);
    if (!result)
        return { notes: null, span: null, bar: null, variations: [] };
    const fixedFor = fixedLookup(anchors, keep, options.fixed);
    const lineFixed = new Map(lines.map((l) => [l.name, fixedFor(l.name, l.steps)]));
    const fixedOfLine = (line) => lineFixed.get(line.name);
    const pinned = (line, n) => fixedOfLine(line).includes(n.step);
    const onset = (i, step) => {
        const w = lines[i].stepWhole;
        return w === null ? `${i}@${step}` : (step * w).toFixed(9);
    };
    const sound = (voice) => String(drumNoteOf(result, voice) ?? voice);
    const pitch = (n) => (n.pitch ? ` ${pitchKey(n.pitch)}` : '');
    const keysOf = (i, notes) => notes.map((n) => `${onset(i, n.step)} ${lines[i].stepWhole ?? i} ${n.voice}${pitch(n)}`);
    const strikesOf = (i, notes) => notes.map((n) => `${onset(i, n.step)} ${sound(n.voice)}${pitch(n)}`);
    const places = new Map([...new Set(lines.flatMap((l) => (l.pitched ? [l.pitched.voice] : [])))].map((v, k) => [v, `voice#${k}`]));
    const heardOf = (i, notes) => {
        const { stepWhole, name } = lines[i];
        return notes.map((n) => {
            const what = `${stepWhole ?? name} ${n.pitch ? `${places.get(n.voice)} ${pitchKey(n.pitch)}` : sound(n.voice)}`;
            return stepWhole === null ? { at: null, key: `${name}@${n.step} ${what}` } : { at: n.step * stepWhole, key: what };
        });
    };
    const heardKeys = lines.map((l, i) => heardOf(i, l.notes));
    const chords = harmoniesOf(result, own, lines, progressions);
    const laps = [...lines.map((l) => (l.stepWhole === null ? null : l.steps * l.stepWhole)), ...chords.map((h) => h.lap)];
    const meter = lines.find((l) => l.meter)?.meter ?? chords.find((h) => h.meter)?.meter ?? null;
    const span = laps.length && laps.every((l) => l !== null) ? laps.reduce((a, b) => lcm(a, b)) : null;
    const bar = meter ? meter.pulses / meter.unit : null;
    const played = slotsPlayed(forms, fragment, workbench, resolve, degrees);
    const formNotes = (f, after, k) => [after.main, ...(after.partner ? [after.partner] : [])].flatMap((tokens, h) => tokens.map((token, i) => ({ at: null, key: `form#${k}.${h} ${i} ${played(h ? f.partner : f, token)}` })));
    const asWritten = (f) => ({ main: f.slots, ...(f.partner ? { partner: f.partner.slots } : {}) });
    const fixed = [...chords.flatMap((h) => h.notes), ...forms.flatMap((f, k) => formNotes(f, asWritten(f), k))];
    const fixedBut = (name, notes) => [
        ...chords.flatMap((h) => (h.name === name ? notes : h.notes)),
        ...forms.flatMap((f, k) => (f.name.slice(1) === name ? notes : formNotes(f, asWritten(f), k))),
    ];
    const noteKeys = lines.map((l, i) => keysOf(i, l.notes));
    const strikeKeys = lines.map((l, i) => strikesOf(i, l.notes));
    const total = lines.reduce((sum, l) => sum + l.notes.length, 0);
    const others = new Map();
    const othersOf = (i) => {
        let o = others.get(i);
        if (!o) {
            const strikes = lines.flatMap((_, j) => (j === i ? [] : strikeKeys[j]));
            const set = new Set(strikes);
            o = { keys: lines.flatMap((_, j) => (j === i ? [] : noteKeys[j])).sort(), strikes: set.size < strikes.length ? null : set };
            others.set(i, o);
        }
        return o;
    };
    const signature = (i, notes) => {
        const a = othersOf(i).keys;
        const b = i < 0 ? [] : keysOf(i, notes).sort();
        const merged = [];
        let x = 0;
        let y = 0;
        while (x < a.length || y < b.length)
            merged.push(y >= b.length || (x < a.length && a[x] <= b[y]) ? a[x++] : b[y++]);
        return merged.join('|');
    };
    const struckOnce = (i, notes) => {
        const other = othersOf(i).strikes;
        if (!other)
            return false;
        const mine = new Set();
        for (const k of strikesOf(i, notes)) {
            if (other.has(k) || mine.has(k))
                return false;
            mine.add(k);
        }
        return true;
    };
    const seen = new Set([signature(-1, [])]);
    const out = [];
    const words = new Map();
    const wordsOf = (name) => {
        if (!words.has(name))
            words.set(name, declWords(fragment, name));
        return words.get(name);
    };
    const offer = (i, operator, notes, amount, braids, what, about = typeof amount === 'number' ? amount : null) => {
        if (!braids || total - lines[i].notes.length + notes.length < fewest)
            return;
        if (!struckOnce(i, notes))
            return;
        const sig = signature(i, notes);
        if (seen.has(sig))
            return;
        seen.add(sig);
        const line = lines[i].name;
        const code = (name, braid) => {
            const w = wordsOf(name);
            return w ? [...w.head, ...w.attrs, ...(braid ?? w.braid)].join(' ') : '';
        };
        const own = wordsOf(lines[i].trigger);
        const pins = new Set(lines[i].notes.filter((n) => pinned(lines[i], n) && !(operator === 'invert' && n.pitch?.written === (about ?? 0) / 2 && !n.pitch.alter)).map((n) => n.step));
        const reference = own && referenceOf(lines[i], own.braid, own.attrs, operator, notes, pins, about);
        const variation = {
            id: `vary:${operator}:${line}${amount === null ? '' : `:${amount}`}:${out.length}`,
            tool: 'vary',
            rule: operator,
            title: `${line}: ${what}`,
            before: [...braids.keys()].map((name) => code(name)).join('\n'),
            after: [...braids].map(([name, braid]) => code(name, braid)).join('\n'),
            apply: (source) => [...braids].reduce((text, [name, braid]) => setBraid(text, name, braid), source),
            line,
            by: `${operator} ${line}${amount === null ? '' : ` ${amount}`}`,
            ...(reference ? { reference } : {}),
        };
        out.push({ variation, notes: [...lines.flatMap((_, j) => (j === i ? heardOf(i, notes) : heardKeys[j])), ...fixed] });
    };
    const inOrder = (notes) => notes.sort((a, b) => a.step - b.step || pitchOf(result, a.voice) - pitchOf(result, b.voice));
    const first = (i) => {
        const n = lines[i].notes[0];
        return [n.step * (lines[i].stepWhole ?? 1), pitchOf(result, n.voice)];
    };
    const order = lines
        .map((_, i) => i)
        .filter((i) => lines[i].notes.length > 0 && own.has(lines[i].trigger) && fixedOfLine(lines[i]).length < lines[i].steps && (!only || only.line === lines[i].name))
        .sort((a, b) => first(a)[0] - first(b)[0] || first(a)[1] - first(b)[1]);
    for (const i of order) {
        const line = lines[i];
        const levels = line.levels?.tokens;
        const [before, last] = line.notes.slice(-2);
        const ends = line.notes.length >= 2 && !pinned(line, last);
        const stepKeys = Array.from({ length: line.steps }, (_, s) => JSON.stringify(line.notes.filter((n) => n.step === s)));
        const fixedSteps = fixedOfLine(line);
        const movedFrom = (from) => inOrder(from.flatMap((src, t) => line.notes.filter((n) => n.step === src).map((n) => ({ ...n, step: t }))));
        const levelsFrom = (from) => levels && levels.map((own, t) => (from[t] === EMPTY ? own : levels[from[t]]));
        for (const operator of operators) {
            if (!LINE_SLOT_OPERATORS.includes(operator) && [...PITCHED_OPERATORS, SHIFT].includes(operator) !== !!line.pitched)
                continue;
            if (line.notes.some((n) => n.hold) && !['transpose', 'invert', 'shift'].includes(operator))
                continue;
            if (operator === 'bend') {
                if (ends)
                    for (const n of BENDS) {
                        const notes = line.notes.map((x) => (x === last ? { ...x, pitch: moved(before.pitch, 1, n) } : x));
                        offer(i, operator, notes, n, written(line, notes), `its last note bent to ${Math.abs(n)} degree${Math.abs(n) === 1 ? '' : 's'} ${n > 0 ? 'above' : 'below'} the one before it`);
                    }
            }
            else if (operator === 'trim') {
                if (!ends || line.notes.length - 1 < TRIM_FEWEST)
                    continue;
                const notes = line.notes.filter((x) => x !== last);
                offer(i, operator, notes, last.step, written(line, notes), `its last note, on step ${last.step}, left out: the one before it held`);
            }
            else if (operator === 'shift')
                for (const { slot, by } of shiftMoves(line.steps, fixedSteps, degrees, (s) => line.notes.some((x) => x.step === s))) {
                    const notes = line.notes.map((x) => (x.step === slot ? { ...x, pitch: moved(x.pitch, 1, by) } : x));
                    offer(i, operator, notes, `${slot} ${by}`, written(line, notes), `its note on step ${slot} ${by > 0 ? 'up' : 'down'} ${Math.abs(by)} degree${Math.abs(by) === 1 ? '' : 's'}`, null);
                }
            else if (operator === 'transpose')
                for (const n of degrees) {
                    const notes = line.notes.map((x) => (pinned(line, x) ? x : { ...x, pitch: moved(x.pitch, 1, n) }));
                    offer(i, operator, notes, n, written(line, notes), `every note ${n > 0 ? 'up' : 'down'} ${Math.abs(n)} degree${Math.abs(n) === 1 ? '' : 's'}`);
                }
            else if (operator === 'invert') {
                const { written: f, alter } = line.notes[0].pitch;
                if (typeof f !== 'number' || alter)
                    continue;
                const notes = line.notes.map((x) => (pinned(line, x) ? x : { ...x, pitch: moved(x.pitch, -1, 2 * f) }));
                offer(i, operator, notes, null, written(line, notes), `every note mirrored about its first`, 2 * f);
            }
            else if (operator === 'reverse') {
                for (const m of slotMoves(stepKeys, fixedSteps, [operator])) {
                    const notes = movedFrom(m.from);
                    offer(i, operator, notes, null, written(line, notes), 'its notes in reverse order between its anchors');
                }
            }
            else if (operator === 'rotate') {
                for (const m of slotMoves(stepKeys, fixedSteps, [operator])) {
                    const notes = movedFrom(m.from);
                    offer(i, operator, notes, null, written(line, notes, levelsFrom(m.from) ?? undefined, !fixedSteps.length), 'every note a step later, the last to the first');
                }
            }
            else if (operator === 'swap' || operator === 'substitute') {
                for (const m of slotMoves(stepKeys, fixedSteps, [operator])) {
                    const notes = movedFrom(m.from);
                    offer(i, operator, notes, m.amounts.join(' '), written(line, notes, levelsFrom(m.from) ?? undefined), m.what, null);
                }
            }
            else if (operator === 'drop' || operator === 'add') {
                const loudest = line.notes.reduce((a, b) => (b.level > a.level ? b : a));
                for (const m of slotMoves(stepKeys, fixedSteps, [operator], { key: REST, fill: loudest.step })) {
                    const notes = movedFrom(m.from);
                    const [step] = m.amounts;
                    const what = operator === 'drop' ? `step ${step} left a rest` : `step ${step} given its loudest, step ${loudest.step}'s`;
                    offer(i, operator, notes, step, written(line, notes, levelsFrom(m.from) ?? undefined), what);
                }
            }
        }
    }
    const base = signature(-1, []);
    const slotLevel = !!only || operators.some((o) => SLOT_LEVEL.includes(o));
    const formKey = (g, after) => after.main.map((t, i) => `${played(g, t)}${g.partner ? `/${played(g.partner, after.partner[i])}` : ''}`).join(' ');
    const keyOf = (p, slots, f, after) => [base, ...progressions.map((q) => (q === p ? progressionKey(q, slots) : progressionKey(q, q.slots))), ...forms.map((g) => formKey(g, g === f ? after : asWritten(g)))].join('#');
    if (progressions.length || forms.length)
        seen.add(keyOf(null, null, null, null));
    const offerSlots = (name, rule, amounts, what, braids, sig, notes, reference) => {
        if (seen.has(sig))
            return;
        seen.add(sig);
        const code = (cell, braid) => {
            const w = wordsOf(cell);
            return w ? [...w.head, ...w.attrs, ...(braid ?? w.braid)].join(' ') : '';
        };
        const variation = {
            id: `vary:${rule}:${name}${amounts.map((a) => `:${a}`).join('')}:${out.length}`,
            tool: 'vary',
            rule,
            title: `${name}: ${what}`,
            before: [...braids.keys()].map((cell) => code(cell)).join('\n'),
            after: [...braids].map(([cell, braid]) => code(cell, braid)).join('\n'),
            apply: (source) => [...braids].reduce((text, [cell, braid]) => setBraid(text, cell, [...braid]), source),
            line: name,
            by: `${rule} ${name}${amounts.length ? ` ${amounts.join(' ')}` : ''}`,
            ...(reference ? { reference } : {}),
        };
        out.push({ variation, notes: [...heardKeys.flat(), ...notes] });
    };
    for (const p of progressions) {
        if (!slotLevel || (only && only.line !== p.name))
            continue;
        const k = chords.findIndex((h) => h.name === p.name.slice(1));
        const asked = operators.filter((o) => HARMONY_OPERATORS.includes(o) || o === SHIFT);
        for (const c of progressionCandidates(p, asked, result, fixedFor(p.name, p.slots.length, p.cadence), degrees)) {
            const braid = progressionBraid(c.slots);
            const w = wordsOf(p.name.slice(1));
            const reference = w && progressionReference(p, c.slots, [...w.head, ...w.attrs, ...braid]);
            offerSlots(p.name, c.operator, c.amounts, c.what, new Map([[p.name.slice(1), braid]]), keyOf(p, c.slots, null, null), fixedBut(p.name.slice(1), progressionNotes(p, c.slots, k)), reference || null);
        }
    }
    for (const [k, f] of forms.entries()) {
        if (!slotLevel || (only && only.line !== f.name))
            continue;
        const keys = f.slots.map((t, i) => `${played(f, t)}${f.partner ? `/${played(f.partner, f.partner.slots[i])}` : ''}`);
        const fixedSlots = fixedFor(f.name, f.slots.length, FORM_FIXED);
        const offerForm = (operator, amounts, what, after) => {
            const braids = new Map([[f.name.slice(1), after.main]]);
            if (f.partner && after.partner)
                braids.set(f.partner.name.slice(1), after.partner);
            offerSlots(f.name, operator, amounts, what, braids, keyOf(null, null, f, after), fixedBut(f.name.slice(1), formNotes(f, after, k)), formReference(f, after));
        };
        for (const operator of operators) {
            if (operator === 'shift') {
                if (!f.partner && f.attrs.some((a) => a.startsWith('step=')))
                    for (const { slot, by } of shiftMoves(f.slots.length, fixedSlots, degrees, (s) => shiftedToken(f.slots[s], 1) !== null)) {
                        const main = f.slots.map((t, s) => (s === slot ? shiftedToken(t, by) : t));
                        offerForm(operator, [slot, by], `its letter on slot ${slot} moved ${by} degree${Math.abs(by) === 1 ? '' : 's'}`, { main });
                    }
            }
            else if (FORM_OPERATORS.includes(operator))
                for (const m of slotMoves(keys, fixedSlots, [operator])) {
                    const main = m.from.map((i) => f.slots[i]);
                    offerForm(m.operator, m.amounts, m.what, { main, ...(f.partner ? { partner: m.from.map((i) => f.partner.slots[i]) } : {}) });
                }
        }
    }
    return { notes: [...heardKeys.flat(), ...fixed], span, bar, variations: out };
}
function slotsPlayed(forms, fragment, workbench = '', resolve, degrees = DEGREES) {
    const cells = new Map();
    const lines = [];
    for (const f of forms)
        for (const g of [f, ...(f.partner ? [f.partner] : [])])
            for (const token of g.attrs.some((x) => x.startsWith('step='))
                ? [...g.slots, ...g.slots.flatMap((t) => degrees.map((n) => shiftedToken(t, n)).filter((x) => x !== null))]
                : []) {
                const key = `${g.attrs.join(' ')}|${token}`;
                if (cells.has(key))
                    continue;
                const cell = `vary_slot_${cells.size}`;
                cells.set(key, cell);
                lines.push([`&${cell}`, ...g.attrs, token].join(' '));
            }
    const keys = new Map();
    if (lines.length) {
        const own = new Set(declarations(fragment).map((l) => l.name));
        const bench = declarations(workbench)
            .filter((l) => !own.has(l.name))
            .map((l) => l.written);
        const result = compileSource([...bench, fragment, ...lines].join('\n'), undefined, resolve ? { resolve } : {});
        if (result.ok)
            for (const [key, cell] of cells)
                try {
                    const events = flatten(result, cell, codeShifts(result));
                    keys.set(key, events.map((e) => `${e.step}:${e.duration}:${e.table}:${e.tableShift}:${e.value}:${e.alter}:${e.transpose ?? 0}`).join(' '));
                }
                catch {
                }
    }
    return (g, token) => keys.get(`${g.attrs.join(' ')}|${token}`) || token;
}
function formReference(f, after) {
    const ref = slotReference(f.name, f.slots, after.main);
    if (!ref)
        return null;
    const written = (g, slots) => [...g.head, ...g.attrs, ...slots].join(' ').length;
    const p = f.partner;
    const pref = p && after.partner && slotReference(p.name, p.slots, after.partner);
    const length = ref.line(f.name.slice(1)).length + (pref ? pref.line(p.name.slice(1)).length : 0);
    const whole = written(f, after.main) + (p && after.partner ? written(p, after.partner) : 0);
    if (length > whole)
        return null;
    return p && pref ? { ...ref, partner: { of: p.name, ...pref } } : ref;
}
function shiftedToken(token, n) {
    const m = /^&([A-Za-z_][A-Za-z0-9_]*)(?:\^(-?\d+))?$/.exec(token);
    if (!m)
        return null;
    const k = Number(m[2] ?? 0) + n;
    return k === 0 ? `&${m[1]}` : `&${m[1]}^${k}`;
}
function lcm(a, b) {
    const gcd = (x, y) => (y ? gcd(y, x % y) : x);
    const [x, y] = [Math.round(a * 3840), Math.round(b * 3840)];
    return x && y ? ((x / gcd(x, y)) * y) / 3840 : Math.max(a, b);
}
function harmoniesOf(result, own, lines, progressions) {
    const played = playedBy(lines);
    const out = [];
    for (const name of own) {
        const cell = result.cells.get(name);
        if (!cell?.step || played.has(name) || cell.voice)
            continue;
        const meter = result.cells.get(cell.step.driver)?.meter ?? null;
        const whole = tapWhole(cell.step.tap, meter);
        if (whole === null)
            continue;
        const events = flatten(result, name, codeShifts(result));
        const at = new Map();
        for (const e of events)
            at.set(e.step, (at.get(e.step) ?? 0) + 1);
        if (![...at.values()].some((n) => n > 1))
            continue;
        const k = out.length;
        const p = progressions.find((q) => q.name === `&${name}`);
        const notes = p
            ? progressionNotes(p, p.slots, k)
            : events.map((e) => ({ at: e.step * whole, key: `${whole * e.duration} chords#${k} ${e.table}:${e.tableShift}:${e.value}:${e.alter}:${e.transpose ?? 0}` }));
        out.push({ name, notes, lap: cell.steps * whole, meter });
    }
    return out;
}
export function drawn(draw, n) {
    if (!(draw >= 0 && draw < 1))
        throw new Error(`varied: draw ${draw} is outside [0, 1)`);
    return Math.floor(draw * n);
}
const BY = /^([a-z]+) (&[A-Za-z_][A-Za-z0-9_]*)((?: -?\d+)*)$/;
export function variationBy(fragment, by, options = {}) {
    const m = BY.exec(by.trim());
    if (!m || !OPERATORS.includes(m[1]))
        return null;
    const variations = readSome(fragment, options, { line: m[2], operator: m[1] }).variations;
    return variations.find((v) => v.variation.by === by.trim())?.variation ?? null;
}
const OPERATORS = [...new Set([...RHYTHM_OPERATORS, ...PITCHED_OPERATORS, ...HARMONY_OPERATORS, SHIFT])];
export function varied(fragment, draw, options) {
    drawn(draw, 1);
    const all = variations(fragment, options);
    return all.length ? all[drawn(draw, all.length)] : null;
}
