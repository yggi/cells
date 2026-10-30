import { lapsOf } from "../subseq.js";
import { bjorklund } from "./generators.js";
import { MAX_NESTING, MAX_REPS } from "./scanner.js";
import { parseFields } from "./level.js";
import { isMixChord, parseMixChord } from "./mix.js";
import { syntax } from "./syntax.js";
import { MODE_WORDS } from "../../theory/modes.js";
export const MODE_WORD = new RegExp(`(?:${Object.keys(MODE_WORDS).join('|')})(?![A-Za-z0-9_])`, 'y');
export const STEP_SYNTAX = [
    syntax('step', 'n', "A number: an index into the table it reads (over=), or a value (a volume, a waveform's level). Negative and decimal numbers work. A note by name (C, F#, Bb3; octave 4 left out) is a pitch instead: a place on the grid at the root of its tables, whatever they are.", ['&tune step=2 0 2 4 -1 .5', '&tune step=2 C E G C5'], 'cell.md'),
    syntax('step', 'n# · nb · ns · nf', 'A number with accidentals: one step up (# or s) or down (b or f) on the grid below the table it reads — 6# over a scale is its 7th degree raised a semitone; s and f are Strudel’s spelling of the same, mixed and repeated as it allows (6s, 2sb).', ['&tune over=&major step=2 0 4 6# 7 3b', '&tune over=&major step=2 0 4 6s 7 3f'], 'tables.md'),
    syntax('step', 'n/d', 'A fraction: 9/8, 3/2 (the ratios of a map=ratios grid).', ['&just map=ratios 1 9/8 5/4 3/2 2'], 'tuning.md'),
    syntax('step', '~', 'A rest: a step that plays nothing.', ['&tune step=2 0 ~ 4 ~'], 'cell.md'),
    syntax('step', '_', "The step before it, one step longer, as Strudel's elongation: 0 _ _ is 0@3 (inside brackets too: [0 _ 2]).", ['&tune step=2 0 _ _ 2 4 _'], 'cell.md'),
    syntax('step', '=', "In a cell with base=: the base's step here, as it is there (=@2: its pitch, held 2; =!n: n of them). A value in its place changes that step.", ['&answer base=&subject^$7 =!3 12@2'], 'braid.md'),
    syntax('step', '[a, b, c]', 'A chord: the numbers sound together, in one step, commas between them. Its notes can be names, pitches whatever the tables: [C, E, G].', ['&chords step=1 [0,2,4] [3, 5, 7]', '&chords step=1 [C, E, G] [F, A, C5]'], 'time.md'),
    syntax('step', '[a b c] · [a b, c]', "A subsequence, as in Strudel's mini-notation: its steps squeezed into the one step it takes, each as long as its modifiers say ([0 2@2]: a third, then two thirds), nested as deep as you like. A modifier on the bracket acts on all of it ([0 2]*2: twice in the step). Commas stack them, each spanning the step: [0 2, 4]. A cell spliced inside lasts its slot, its steps squeezed into it.", ['&tune step=1 0 [2 4] [5 [7 9]] [0 2@2]', '&tune step=1 [0 ~ 4]!2 [0 2]*2 [0 2, 7]', '&groove step=2 &bd [&hh &hh] &sd [&hh ~ &hh]'], 'cell.md'),
    syntax('step', '[a|b|c] · [a b|c]', 'A choice: one of them, chosen afresh each time round (the same every time it is played). As in Strudel, what goes between the bars can be sequences, each spanning the step: [0 2|4] plays 0 2 or a 4.', ['&tune step=2 0 [2|4|7] 4', '&tune step=2 0 [2 4|7] [5 ~ 4|2]'], 'braid.md'),
    syntax('step', '<a b c>', "An alternation, as Strudel's <…>: one of its steps each lap of the cell, in turn (<0 2 4> is Strudel's [0 2 4]/3: a step held @n lasts n laps). It nests with brackets, <0 [2 4]>, [0 <2 4>]; commas stack alternations, <0 2, 4 5 7>; modifiers work on it as on any step (<0 2>*2: both in one lap).", ['&tune step=2 0 <2 4 7> 4 <5 [7 9]>', '&tune step=2 <0 <2 4>> <0 2>!2 <0 2>*2'], 'cell.md'),
    syntax('step', '&x', "A cell, spliced in: its braid plays in this one's step (as long as its own steps). Picks, shifts and transposing are under References.", ['&theme step=2 &motif &motif^$7 0'], 'braid.md'),
    syntax('step', '&voice (stepped)', 'In a stepped braid of voices (and rests), each step plays its voice: a drum pattern by name. Chords of voices sound together, [&bd, &hh]; a subsequence squeezes them into one step, [&hh &hh]; modifiers work as on any step. Unstepped, a braid of voices is a kit, read by number.', ['&groove step=4 &bd ~ &hh [&bd, &sd] &hh*2 ~'], 'sound.md'),
];
export const OPERATIONS = ['degree', 'inverse'];
const OPERATION = /(degree|inverse)\(/y;
function parseRefOrOperation(s) {
    const op = s.match(OPERATION);
    if (op === null) {
        const r = s.ref('a cell like &motif');
        return {
            kind: 'ref',
            name: r.name,
            pick: r.pick,
            shift: r.shift,
            ...(r.slot ? { slot: r.slot } : {}),
            ...(r.transpose ? { transpose: r.transpose } : {}),
            ...(r.degree ? { values: { mul: 1, add: r.degree } } : {}),
        };
    }
    const name = op.slice(0, -1);
    s.skipSpace();
    if (s.peek() !== '&' && !s.text.startsWith('degree(', s.i) && !s.text.startsWith('inverse(', s.i))
        s.fail(name === 'degree' ? 'degree(&cell, n): a cell, then how many steps of its table up (−n down)' : 'inverse(&cell): a cell, mirrored round 0', s.i);
    const inner = parseRefOrOperation(s);
    s.skipSpace();
    const was = inner.values ?? { mul: 1, add: 0 };
    let m;
    if (name === 'degree') {
        s.expect(',', `',' then the steps: degree(&${inner.name}, 1)`);
        s.skipSpace();
        const n = s.match(/[-+]?\s*[0-9]+(?![0-9.])/y);
        if (n === null)
            s.fail(`degree(&${inner.name}, n) moves it n whole steps of its table, a whole number: degree(&${inner.name}, 1), degree(&${inner.name}, -2)`, s.i);
        m = { mul: was.mul, add: was.add + parseInt(n.replace(/\s+/g, ''), 10) };
    }
    else
        m = { mul: was.mul === 1 ? -1 : 1, add: -was.add };
    s.skipSpace();
    s.expect(')', `')' to close ${name}(…)`);
    return {
        kind: 'ref',
        name: inner.name,
        pick: inner.pick,
        shift: inner.shift,
        ...(inner.slot ? { slot: inner.slot } : {}),
        ...(inner.transpose ? { transpose: inner.transpose } : {}),
        ...(m.mul === 1 && m.add === 0 ? {} : { values: m }),
    };
}
function parseAtom(s, depth) {
    const c = s.peek();
    if (c === '&' || s.text.startsWith('degree(', s.i) || s.text.startsWith('inverse(', s.i))
        return parseRefOrOperation(s);
    if (c === '~') {
        s.i++;
        return { kind: 'rest' };
    }
    if (c === '=') {
        s.i++;
        return { kind: 'rest', keep: true };
    }
    if (c === '_') {
        s.i++;
        return { kind: 'rest', hold: true };
    }
    if (c === '[') {
        if (isMixChord(s.text, s.i))
            return parseMixChord(s);
        return parseBracket(s, depth);
    }
    if (c === '<')
        return parseAngle(s, depth);
    if (c === '-' || c === '.' || (c >= '0' && c <= '9')) {
        const n = s.num('a number');
        const more = s.match(/[#bsf]+(?![A-Za-z0-9_])/y) ?? '';
        const alter = n.alter + [...more].reduce((a, ch) => a + (ch === '#' || ch === 's' ? 1 : -1), 0);
        return { kind: 'note', value: n.value, alter };
    }
    const name = s.noteName();
    if (name !== null)
        return { kind: 'note', value: name, alter: 0, pitched: true };
    const mode = s.match(MODE_WORD);
    if (mode !== null)
        return { kind: 'note', value: MODE_WORDS[mode], alter: 0 };
    return s.fail(`Unexpected '${c}' — expected a number, a note name (C, F#), ~, [chord], &cell or key=value`);
}
function parseBracket(s, depth) {
    const start = s.i;
    if (depth >= MAX_NESTING)
        s.fail(`Brackets nest ${MAX_NESTING} deep at most: name the inner steps (&inner 0 2) and splice them`, start, 1);
    s.i++;
    const layers = [[]];
    let sep = null;
    for (;;) {
        s.skipSpace();
        const c = s.peek();
        if (c === ']')
            break;
        if (c === '')
            s.fail(sep === '|' ? `']' to close the choice: [0|4|7]` : `']' to close the bracket: [0 2] · [0, 4]`, start, s.i - start);
        if (c === ',' || c === '|') {
            if (sep !== null && sep !== c)
                s.fail('A bracket is a chord or a stack (commas) or a choice (bars), not both: [0, 4] · [0|4]', s.i, 1);
            if (!layers[layers.length - 1].length)
                s.fail(c === ',' ? 'A step before the comma: [0, 4]' : 'A step before the bar: [0|4] · [0 2|4]', s.i, 1);
            sep = c;
            layers.push([]);
            s.i++;
            continue;
        }
        pushStep(s, layers[layers.length - 1], parseToken(s, depth + 1));
    }
    s.i++;
    if (!layers[layers.length - 1].length)
        s.fail(sep === null ? 'Empty brackets: [0 2] is a subsequence, [0, 2] a chord' : sep === ',' ? 'A step after the comma: [0, 4]' : 'A step after the bar: [0|4] · [0 2|4]', start, s.i - start);
    const plain = (t) => t.repeat === 1 && t.subdivide === 1 && t.elongate === 1 && t.chance === undefined;
    const single = layers.every((l) => l.length === 1 && plain(l[0]) && l[0].atom.kind === 'note');
    const notes = layers.map((l) => l[0].atom);
    if (sep === '|') {
        if (single && !notes.some((n) => n.pitched))
            return { kind: 'choice', values: notes.map((n) => n.value), alters: notes.map((n) => n.alter) };
        return { kind: 'seq', layers, mode: 'choose' };
    }
    if (single) {
        const pitched = notes.map((n) => !!n.pitched);
        return { kind: 'chord', notes: notes.map((n) => n.value), alters: notes.map((n) => n.alter), ...(pitched.some(Boolean) ? { pitched } : {}) };
    }
    return { kind: 'seq', layers };
}
function parseAngle(s, depth) {
    const start = s.i;
    if (depth >= MAX_NESTING)
        s.fail(`Brackets nest ${MAX_NESTING} deep at most: name the inner steps (&inner 0 2) and splice them`, start, 1);
    s.i++;
    const layers = [[]];
    for (;;) {
        s.skipSpace();
        const c = s.peek();
        if (c === '>')
            break;
        if (c === '')
            s.fail(`'>' to close the alternation: <0 2 4>`, start, s.i - start);
        if (c === '|')
            s.fail('An alternation takes steps, stacked with commas (<0 2, 4 5>); a choice goes in square brackets: [0 2|4]', s.i, 1);
        if (c === ',') {
            if (!layers[layers.length - 1].length)
                s.fail('A step before the comma: <0 2, 4 5>', s.i, 1);
            layers.push([]);
            s.i++;
            continue;
        }
        pushStep(s, layers[layers.length - 1], parseToken(s, depth + 1));
    }
    s.i++;
    if (!layers[layers.length - 1].length)
        s.fail(layers.length > 1 ? 'A step after the comma: <0 2, 4 5>' : 'An empty alternation: <0 2 4> plays one of its steps a lap', start, s.i - start);
    return { kind: 'seq', layers, mode: 'alt' };
}
function parseEuclidOn(s) {
    const at = s.i;
    s.i++;
    const args = [];
    for (;;) {
        s.skipSpace();
        args.push(s.int('a whole number in x(k, n, r)'));
        s.skipSpace();
        if (s.peek() !== ',')
            break;
        s.i++;
    }
    s.expect(')', `')' to close x(k, n, r)`);
    const [k, n, r = 0] = args;
    if (args.length < 2 || args.length > 3 || !(n >= 1 && n <= MAX_REPS) || !(k >= 0 && k <= n))
        s.fail('x(k, n, r): k hits spread evenly over n parts of the step (0 ≤ k ≤ n), turned right by r: 0(3,8), &bd(3,8,2)', at, s.i - at);
    const p = bjorklund(k, n);
    return { k, n, r, hits: Array.from({ length: n }, (_, j) => j).filter((j) => p[(((j - r) % n) + n) % n]) };
}
const MAX_LAPS = 10_000;
export function pushStep(s, tokens, t) {
    if (!(t.atom.kind === 'rest' && t.atom.hold)) {
        tokens.push(t);
        return;
    }
    const at = t.span.col - 1 - s.offset;
    const prev = tokens[tokens.length - 1];
    if (t.repeat !== 1 || t.subdivide !== 1 || t.elongate !== 1 || t.chance !== undefined)
        s.fail('_ lengthens the step before it by one, and takes no modifiers: 0 _ _ is 0@3', at, t.span.len);
    if (!prev)
        s.fail('_ lengthens the step before it: 0 _ _ is 0@3 (in a cell with base=, = keeps a step of the base)', at, t.span.len);
    if (prev.repeat !== 1)
        s.fail('_ after x!n would lengthen only the last copy: write the copies out, or x@n', at, t.span.len);
    tokens[tokens.length - 1] = { ...prev, elongate: prev.elongate + 1, span: { ...prev.span, len: t.span.col - prev.span.col + t.span.len } };
}
export const MODIFIERS = {
    '!': { field: 'repeat', syntax: syntax('modifier', 'x!n', 'Repeat: n copies of the step, each as long as one.', ['&beat step=4 0!4 2!2'], 'cell.md') },
    '*': { field: 'subdivide', syntax: syntax('modifier', 'x*n', 'Ratchet: the step played n times within its own length.', ['&hats step=2 0 0*2 0 0*3'], 'cell.md') },
    '@': { field: 'elongate', syntax: syntax('modifier', 'x@n', 'Hold: the step lasts n steps.', ['&tune step=2 0@2 2 4@3'], 'cell.md') },
};
export const SLOW_SYNTAX = syntax('modifier', 'x/n', "Slow, as Strudel's x/n: the step plays its part of what it holds stretched over n laps — [0 2]/2 is 0 on one lap and 2 the next; a lone note, [0]/2, sounds every other lap, held as long as n steps (a number's own n/d is a fraction).", ['&tune step=2 [0 2]/2 4 [5 7 9]/3', '&tune step=2 [0]/2 2 <4 5>/2'], 'cell.md');
export const EUCLID_SYNTAX = syntax('modifier', 'x(k,n,r)', "A euclid on a step, as Strudel's bd(3,8,2): k hits spread evenly over n parts of the step, turned right by r as euclid(k, n, r) is, each hit 1/n long, playing what the step holds as it begins. Straight after the step, before its other modifiers.", ['&groove step=1 &bd(3,8) &hh(5,8,2)', '&tune step=1 0(3,8) <0 2>(3,8,2) <0 [2 4]>(5,8)'], 'cell.md');
export const CHANCE_SYNTAX = syntax('modifier', 'x? · x?p', "Chance, as Strudel's degradeBy: the step is dropped with probability p (x? alone: the cell's chance=, ½ unless set). Reproducible: the same every time the piece is played; seed= gives another sequence.", ['&hats step=4 0 0? 0?.3 0', '&ghost chance=.8 step=4 0? 0? 0? 0?'], 'cell.md');
export const LEVEL_SYNTAX = syntax('modifier', '&x:0:gain', 'A hit\'s own gain, as Strudel spells a sound\'s fields (s("hh:0:.4")): its number in its table (0; a pitched hit is not yet), then its gain, linear (1 as it is). In a groove, and in its chords: [&bd, &hh:0:.4].', ['&beat step=8 [&bd,&hh] &hh:0:.4 [&sd,&hh] &hh:0:.4'], 'cell.md');
export function parseToken(s, depth = 0) {
    const start = s.i;
    let atom = parseAtom(s, depth);
    const atomSpan = s.span(start);
    const mods = { repeat: 1, subdivide: 1, elongate: 1 };
    let chance;
    let level;
    let slow;
    const seen = new Set();
    if (atom.kind === 'ref')
        level = parseFields(s);
    const euclid = s.peek() === '(' ? parseEuclidOn(s) : undefined;
    while (s.peek() in MODIFIERS || s.peek() === '?' || s.peek() === '/') {
        if (s.peek() === '/') {
            if (slow !== undefined)
                s.fail(`'/' can only appear once per step`);
            s.i++;
            const at = s.i;
            const n = s.int('a count after /');
            if (n < 1 || n > MAX_REPS)
                s.fail(`Count must be between 1 and ${MAX_REPS}`, at, s.i - at);
            slow = n;
            continue;
        }
        if (s.peek() === '?') {
            if (chance !== undefined)
                s.fail(`'?' can only appear once per step`);
            s.i++;
            const at = s.i;
            const p = s.match(/(?:0?\.[0-9]+|0|1(?:\.0+)?)(?![0-9])/y);
            chance = p === null ? null : parseFloat(p);
            if (p === null && /[0-9]/.test(s.peek() ?? ''))
                s.fail('A probability is from 0 to 1: x?.3', at, 1);
            continue;
        }
        const op = s.peek();
        if (seen.has(op))
            s.fail(`'${op}' can only appear once per step`);
        seen.add(op);
        s.i++;
        const at = s.i;
        const n = s.int(`a count after ${op}`);
        if (n < 1 || n > MAX_REPS)
            s.fail(`Count must be between 1 and ${MAX_REPS}`, at, s.i - at);
        mods[MODIFIERS[op].field] = n;
    }
    if (s.peek() === '(')
        s.fail('A euclid goes straight after its step, before its other modifiers: 0(3,8)*2');
    if (!s.atBoundary() && !(depth > 0 && /[\],|>]/.test(s.peek())))
        s.fail(`Unexpected '${s.peek()}' — separate steps with spaces`);
    if (euclid || slow !== undefined) {
        if (atom.kind === 'rest' && (atom.hold || atom.keep))
            s.fail(`${atom.hold ? '_' : '='} takes no euclid and no /n: put them on the step it stands for`, start, s.i - start);
        const how = { ...(euclid ? { euclid } : {}), ...(slow !== undefined ? { slow } : {}) };
        atom =
            atom.kind === 'seq' && !atom.bare ? { ...atom, ...how } : { kind: 'seq', layers: [[{ atom, repeat: 1, subdivide: 1, elongate: 1, span: atomSpan }]], ...how, bare: true };
    }
    if (lapsOf(atom) > MAX_LAPS)
        s.fail(`A step comes round after ${MAX_LAPS.toLocaleString('en')} laps at most: its <…> and /n multiplied out`, start, s.i - start);
    return { atom, ...mods, ...(chance !== undefined ? { chance } : {}), ...(level !== undefined ? { level } : {}), span: s.span(start) };
}
