import { leaves } from "../subseq.js";
import { TIME_PARAMS } from "../attributes.js";
import { RETIRED_PARAMS } from "../dough-params.js";
import { LABEL_FIELDS, MAIN_KEY, MAX_EVENTS } from "../program.js";
import { CELL_PARAMS, CORE, filterModel, PARAMS, PARAM_ALIASES, nearestAttribute } from "../attributes.js";
import { IDENT, LineScanner } from "./scanner.js";
import { OPERATIONS, parseToken, pushStep } from "./braid.js";
import { FREE_BRAID_WHOLE } from "./free.js";
import { NUMBER_PLACES } from "./numbers.js";
import { isGenerator, parseFifths, parseGenerator, parseScale } from "./generators.js";
import { MODE_WORDS } from "../../theory/modes.js";
import { atTap, parseMap, parseStep } from "./values.js";
import { syntax } from "./syntax.js";
import { AXES, AXIS_NAMES, SLOTS } from "../style.js";
const ADSR_SLOTS = SLOTS.adsr;
export const SHOWS = [
    'braid',
    'pattern',
    'equal',
    'notes',
    'midi',
    'do',
    'degrees',
    'table',
    'scale',
    'mode',
    'key',
    'grid',
    'meter',
    'spectrum',
    'wave',
    'levels',
    'adsr',
    'mix',
    'note',
    'petal',
    'off',
    'matrix',
    'lfo',
    'brightness',
];
export const SHOW_CONVENTIONS = { notes: ['flats', 'sharps', 'german'], do: ['fixed', 'movable'] };
const whole = (key) => (s, b, _word, at) => {
    b[key] = s.int(`a whole number after ${key}=`, NUMBER_PLACES[key]);
    b.paramSpans[key] = s.place(at);
};
const text = (key, example) => (s, b, _word, start) => {
    const at = s.i;
    const q = s.match(/"([^"]*)"/y);
    if (q === null)
        s.fail(`${key}= takes a text in quotes: ${example}`);
    b[key] = q.slice(1, -1);
    if (key !== 'label')
        b.paramSpans[key] = s.place(start);
    if (key === 'label')
        for (const m of q.matchAll(/\{(?:&[A-Za-z_][A-Za-z0-9_]*:)?([A-Za-z_][A-Za-z0-9_]*)\}/g))
            if (!LABEL_FIELDS.includes(m[1]))
                s.warn(`{${m[1]}} isn't a label field: it shows as written (the fields: ${LABEL_FIELDS.map((f) => `{${f}}`).join(' ')})`, at + m.index, m[0].length);
};
const voiceOwn = (key) => (s, b) => {
    b[key] = s.cellRef(`a cell after ${key}=, like ${key}=&pluck or ${key}=&(map=adsr .01 .3 .5 .4)`, `after ${key}=`);
};
const timing = (s, b, word) => {
    b.step = parseStep(s, word === 'loop');
};
const BLANK_TABLE = { over: null, shift: null, off: false, step: null, map: null, stride: null, cycle: null, params: {}, paramSpans: {} };
export const KEYS = {
    over: {
        form: 'over=&table · over=&table[<<n] · over=scale(name, tonic)',
        examples: ['&tune over=&major step=2 0 2 4', '&mode over=&major[<<2] 0 2 4', '&tune over=scale(minor, A) step=2 0 2 4', '&bass over=&key step=16n 0 4 7'],
        read: (s, b) => {
            const bare = /key(?![A-Za-z0-9_])/y;
            bare.lastIndex = s.i;
            if (bare.test(s.text)) {
                const at = s.i;
                s.i += 3;
                if (s.peek() === '[')
                    s.fail('over=key is the old way: name the key, and turn it there (over=&key[<<2])', s.i, 1);
                b.over = { name: MAIN_KEY, pick: null, shift: 0, span: s.place(at) };
            }
            else if (s.text.startsWith('scale(', s.i)) {
                const at0 = s.i;
                s.i += 5;
                const sc = parseScale(s, at0);
                const name = `scale:λ${s.line}_${at0 + s.offset}`;
                s.lambdas.push({
                    ...BLANK_TABLE,
                    name,
                    span: sc.span,
                    lambda: s.text.slice(at0, s.i),
                    over: sc.key,
                    braid: { kind: 'scan', steps: sc.steps, span: sc.span, ...(sc.mode ? { mode: sc.mode } : {}) },
                });
                b.over = { name, pick: null, shift: 0, span: sc.span };
            }
            else
                b.over = s.cellRef('a cell or scale(name, tonic) after over=, like over=&key or over=scale(minor, A)', 'after over=');
            if (b.over.pick)
                s.fail('over= takes a whole table (shifting it is fine: over=&scale[<<])', b.over.span.col - 1, b.over.span.len);
        },
    },
    base: {
        form: 'base=&cell · base=&cell^$n · base=&cell^n',
        examples: ['&answer base=&subject^$7 =!3 12@2', '&last base=&subject =!21 3@2'],
        read: (s, b) => {
            b.base = s.ref('a cell after base=, like base=&subject or base=&subject^$7');
            if (b.base.pick)
                s.fail('base= takes a whole cell (transposing it is fine: base=&subject^$7)', b.base.span.col - 1, b.base.span.len);
        },
    },
    step: { form: 'step=…', examples: ['&tune step=4n 0 2 4', '&tune step=&clock 0 2 4'], read: timing },
    loop: { form: 'loop=…', examples: ['&lead s=saw loop=C4'], read: timing },
    shift: { form: 'shift=n · shift=free(n, lo..hi)', examples: ['&mode over=&major shift=5 0 2 4', '&key shift=free(0, 0..11)'], read: whole('shift') },
    stride: { form: 'stride=n · stride=free(n, lo..hi)', examples: ['&key step=cycle(&theme) stride=7'], read: whole('stride') },
    map: { form: 'map=…', examples: ['&accent map=amp step=&bar 1 .5'], read: (s, b) => (b.map = parseMap(s)) },
    show: {
        form: `show=kind · show=notes:convention · show=do:convention · show=mix:&grid`,
        examples: ['&tune show=notes step=2 0 2 4', '&tune show=notes:german step=2 0 2 4', '&tune show=do:movable step=2 0 2 4', '&band show=mix:&edo19 [&a, &b]'],
        read: (s, b) => {
            const at2 = s.i;
            const w = s.match(/[a-z]+/y);
            if (w === null)
                s.fail(`show= takes one of: ${SHOWS.join(' ')}, or a plugin of the piece`, at2, 1);
            let conv = '';
            if (w === 'mix' && s.peek() === ':' && !s.text.startsWith(':&', s.i))
                s.fail('show=mix:&grid: the grid whose colours the mix wears, like show=mix:&edo19 (no space after the colon)', at2, s.i + 1 - at2);
            if (w === 'mix' && s.text.startsWith(':&', s.i)) {
                s.i += 2;
                const g = s.match(IDENT);
                if (g === null)
                    s.fail('show=mix:&grid: the grid whose colours the mix wears, like show=mix:&edo19', at2, s.i - at2);
                b.show = `mix:&${g}`;
                b.paramSpans.show = s.span(at2);
                return;
            }
            if (s.peek() === ':') {
                s.i++;
                const cw = s.match(/[a-z]+/y) ?? '';
                const ok = SHOW_CONVENTIONS[w]?.includes(cw);
                if (!ok)
                    s.fail(`show=${w}: takes ${w === 'notes' ? 'flats, sharps or german' : w === 'do' ? 'fixed or movable' : 'no convention'}`, at2, s.i - at2);
                conv = `:${cw}`;
            }
            b.show = w + conv;
            b.paramSpans.show = s.span(at2);
        },
    },
    label: {
        form: 'label="text"',
        examples: ['&theme label="the King\'s theme" step=2 0 2 4', '&note label="A note in the graph: alone on its cell."'],
        read: text('label', 'label="the King\'s theme"'),
    },
    env: { form: 'env=&envelope', examples: ['&lead s=saw loop=C4 env=&(map=adsr .01 .3 .5 .4)'], read: voiceOwn('env') },
    pitch: {
        form: 'pitch=&vibrato · pitch=lo..hi * &shape',
        examples: ['&lead s=saw loop=C4 pitch=&(loop=5 0 .1 -.1)', '&bd s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0)'],
        read: (s, b, word, at) => (/^[0-9.]+\.\./.test(s.text.slice(s.i)) ? readParam(s, b, word) : voiceOwn('pitch')(s, b, word, at)),
    },
    cycle: {
        form: 'cycle=n',
        examples: ['&key step=cycle(&theme) stride=2 cycle=2', '&wheel cycle=1 0 4 7', '&drone cycle=0 0 4 7'],
        read: (s, b, _word, at) => {
            const vs = s.i;
            b.cycle = s.int('a whole number after cycle=', NUMBER_PLACES.cycle);
            if (b.cycle < 0)
                s.fail('cycle= counts laps: 0 or more', vs, s.i - vs);
            b.paramSpans.cycle = s.place(at);
            if (b.cycle > MAX_EVENTS)
                s.fail(`cycle=${b.cycle}: at most ${MAX_EVENTS.toLocaleString('en')}, the most steps a cell can hold (a grid's to its period, a table's turns before it comes round)`, vs, s.i - vs);
        },
    },
    size: {
        form: 'size=x',
        examples: ['&theme size=2 step=2 0 2 4'],
        read: (s, b) => {
            const at2 = s.i;
            const f = s.freeNumber(NUMBER_PLACES.size);
            const n = f === null ? s.match(/[0-9]*\.?[0-9]+/y) : String(f);
            if (n === null || !(+n >= 0.25 && +n <= 4))
                s.fail('size= is how large it is drawn, from .25 to 4: size=2', at2, Math.max(1, (n ?? '').length));
            b.size = +n;
        },
    },
    laps: {
        form: 'laps=n',
        examples: ['&bar scan(4 4 4 4) step=84bpm laps=30'],
        read: (s, b, word, at) => {
            const f = s.freeNumber(NUMBER_PLACES.laps);
            const n = f === null ? s.match(/[0-9]+/y) : String(f);
            if (n === null || !(parseInt(n, 10) >= 1))
                s.fail('laps= takes a count of laps, 1 or more: laps=1', at, word.length + 1);
            b.laps = parseInt(n, 10);
        },
    },
    chance: {
        form: 'chance=p · chance=free(p, 0..1)',
        examples: ['&ghost chance=.8 step=4 0? 0? 0? 0?', '&ghost chance=free(.7, 0..1) step=4 0? 0?'],
        read: (s, b) => {
            const f = s.freeNumber(NUMBER_PLACES.chance);
            if (f !== null)
                b.chance = f;
            else {
                const at2 = s.i;
                const n = s.match(/(?:0?\.[0-9]+|0|1(?:\.0+)?)(?![0-9])/y);
                if (n === null)
                    s.fail('chance= is a probability from 0 to 1: chance=.3, or chance=free(.3, 0..1)', at2, 1);
                b.chance = parseFloat(n);
            }
        },
    },
    seed: { form: 'seed=n', examples: ['&ghost seed=7 step=4 0? 0? 0? 0?'], read: (s, b) => (b.seed = s.int('a whole number after seed=', NUMBER_PLACES.seed)) },
    title: { form: 'title="text"', examples: ['&piece title="Swing blues" tags="genre:jazz, rhythm" label="A blues in F."'], read: text('title', 'title="Swing blues"') },
    tags: {
        form: 'tags="tag, tag"',
        examples: ['&lead tags="melody" s=saw loop=C4', '&beam tags="metal" map=ratios 1 2.756 5.404'],
        read: text('tags', 'tags="jazz, blues"'),
    },
    tier: {
        form: 'tier=n',
        examples: ['&piece title="Steps: a tune on one line" tags="tutorial" tier=1 label="Numbers, rests, holds and repeats."'],
        read: (s, b, word, at) => {
            s.free(NUMBER_PLACES.tier);
            const n = s.match(/[0-9]+(?![0-9.])/y);
            if (n === null || !(parseInt(n, 10) >= 1 && parseInt(n, 10) <= 9999))
                s.fail('tier= is a tier of the tutorial, 1 to 9999: tier=1', at, word.length + 1);
            b.tier = parseInt(n, 10);
            b.paramSpans.tier = s.place(at);
        },
    },
    style: {
        form: 'style=&s · style=[&a * w, &b * w] · style=a..b · style=a..b * &curve',
        examples: ['&style label="Funk" style=&funk', '&style label="close to Funk, then Bossa nova" style=[&funk * .8, &bossa * .2]..&bossa'],
        read: (s, b, _word, at) => {
            const from = readStylePoint(s);
            let to = null;
            let curve = null;
            if (s.text.startsWith('..', s.i)) {
                s.i += 2;
                to = readStylePoint(s);
                if (/^\s*\*\s*&/.test(s.text.slice(s.i))) {
                    s.skipSpace();
                    s.i++;
                    s.skipSpace();
                    curve = s.cellRef('a curve after style=a..b *, like * &rise', 'in style=');
                }
            }
            b.style = { from, to, ...(curve ? { curve } : {}), span: s.place(at) };
        },
    },
    about: {
        form: 'about=&cell · about=(&a &b …)',
        examples: ['&fenvNote label="The filter opens on every note." about=&fenv', '&why label="Two cells at once." about=(&fenv &accent)'],
        read: (s, b, word, at) => {
            const what = 'a cell after about=, like about=&fenv or about=(&fenv &accent)';
            const about = [];
            b.about = about;
            if (s.peek() === '(') {
                s.i++;
                s.skipSpace();
                while (s.peek() !== ')') {
                    if (s.done())
                        s.fail(`')' to close about=(…)`);
                    about.push(s.cellRef(what, 'in about='));
                    s.skipSpace();
                }
                s.i++;
                if (about.length === 0)
                    s.fail(what, at, word.length + 1);
            }
            else
                about.push(s.cellRef(what, 'in about='));
        },
    },
};
const FREE_NUMBER = /^\(\s*(?:-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)[a-z]*\s*,)/;
function readRange(s, key) {
    const save = s.i;
    const frees = s.frees.length;
    const end = (name) => {
        if (s.text.startsWith('free(', s.i))
            return s.free(NUMBER_PLACES.end, name).value;
        const n = s.match(/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?![0-9])/y);
        return n === null ? null : parseFloat(n);
    };
    const back = () => {
        s.i = save;
        s.frees.length = frees;
        return null;
    };
    const a = end(`${key} low`);
    if (a === null)
        return back();
    if (s.text.startsWith('..', s.i)) {
        s.i += 2;
        const b = end(`${key} high`);
        if (b === null)
            s.fail(`${key}=: a range's other end, a number or a slider — ${key}=200..3000 * &a`);
        return [a, b];
    }
    const sugar = /\s*(?:±|\+-)\s*/y;
    sugar.lastIndex = s.i;
    if (sugar.test(s.text)) {
        s.i = sugar.lastIndex;
        if (s.frees.length > frees)
            s.frees[frees].param = key;
        const r = end(`${key} reach`);
        if (r === null || r < 0)
            s.fail(`${key}=c ± r: a reach, a number or a slider, 0 or more — ${key}=free(.6, 0..1) ± free(.2, 0..0.5) * &a`);
        const exact = (x) => Math.round(x * 1e12) / 1e12;
        return [Math.max(0, exact(a - r)), exact(a + r)];
    }
    return back();
}
function readAxisFree(s, axis) {
    const at = s.i;
    const f = s.free(NUMBER_PLACES.axis, axis);
    const [lo, hi] = AXES.find((a) => a.name === axis).range;
    if (f.lo < lo || f.hi > hi)
        s.fail(`${axis}=free(…) moves within the axis, ${lo} to ${hi}: ${axis}=free(${f.value}, ${lo}..${hi})`, at, s.i - at);
    return f;
}
function readStylePoint(s) {
    const what = 'a style after style=, like style=&funk, style=&(map=style .3 .45 .55 .55) or style=[&funk * .8, &bossa * .2]';
    if (s.peek() !== '[')
        return { kind: 'cell', ref: s.cellRef(what, 'in style=') };
    s.i++;
    const terms = [];
    for (;;) {
        s.skipSpace();
        const ref = s.cellRef(what, 'in style=[…]');
        s.skipSpace();
        s.expect('*', `'*' and a weight after &${ref.name}: style=[&${ref.name} * .8, …]`);
        s.skipSpace();
        terms.push({ ref, weight: s.num(`a weight after &${ref.name} *`, NUMBER_PLACES.weight).value });
        s.skipSpace();
        if (s.peek() === ',') {
            s.i++;
            continue;
        }
        s.expect(']', `']' to close style=[…]`);
        return { kind: 'mix', terms };
    }
}
const CELL_WANTS = {
    fm: 'a voice after fm=, like fm=&op',
    write: 'what the tape records, like write=&melody',
    play: 'the tape it reads, like play=&tape, or the notes a gate plays, like play=&tune',
    couple: 'the resonator it shares a table with, like couple=&fork',
    excite: 'what drives it, like excite=&mix',
    trigger: 'the melody whose notes it plays with, like trigger=&tune',
    velocity: 'a level cell, like velocity=&accent',
    gate: 'a level cell, like gate=&duck',
};
const readCellParam = (s, b, word) => {
    if (word === 'play')
        return readPlay(s, b);
    const r = s.cellRef(CELL_WANTS[word], `after ${word}=`);
    b.params[word] = r.name;
    b.paramSpans[word] = r.span;
};
function readPlay(s, b) {
    const at = s.i;
    const r = s.ref(CELL_WANTS.play);
    s.rejectTap(at);
    b.params.play = r.name;
    b.paramSpans.play = r.span;
    if (r.transpose || r.degree) {
        const caret = s.text.lastIndexOf('^', s.i - 1);
        b.playMove = { ...(r.transpose ? { transpose: r.transpose } : {}), ...(r.degree ? { degree: r.degree } : {}), at: caret, len: s.i - caret, as: s.text.slice(at, s.i) };
    }
}
const readBend = (s, b) => {
    const level = s.match(/[1-9][0-9]*(?:n\.?|t)(?=:)/y);
    if (level === null)
        s.fail('a level and a table after bend=, the lengths of its nodes: bend=4n:&rubato');
    s.i++;
    b.bend = { level: level, table: s.cellRef('a table after bend=4n:, the lengths of its nodes: bend=4n:&rubato', 'after bend=4n:') };
    b.paramSpans.bend = s.place(s.i);
};
const readLevels = (s, b, word) => {
    if (!/^[1-9][0-9]*(?:n\.?|t):/.test(s.text.slice(s.i)))
        return readParam(s, b, word);
    const vs = s.i;
    const levels = [];
    for (;;) {
        const level = s.match(/[1-9][0-9]*(?:n\.?|t)(?=:)/y);
        if (level === null)
            s.fail(`a level after the comma, a note value and a share: ${word}=8n:.6,16n:.55`);
        s.i++;
        let share;
        const f = s.free(NUMBER_PLACES.share, word);
        const free = f !== null;
        if (free) {
            share = f.value;
            if (levels.length || s.peek() === ',')
                s.fail(`a share left free(…) is one level alone: ${word}=8n:free(.5, .5..75)`, vs, s.i - vs);
        }
        else if (word === 'legato') {
            const n = s.match(/(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?![0-9.])/y);
            if (n === null)
                s.fail(`a share after ${level}:, of each note's held length (.5 staccato, 1 as written): legato=${level}:.5`);
            share = parseFloat(n);
        }
        else {
            const at = s.i;
            const frac = s.match(/[0-9]+\/[0-9]+(?![0-9.])/y);
            if (frac !== null) {
                const [num, den] = frac.split('/').map(Number);
                if (den === 0)
                    s.fail(`a share's denominator can't be 0: swing=${level}:2/3`, at, frac.length);
                if (num > den)
                    s.fail(`a share is from 0 to 1, and ${frac} is above it: swing=${level}:2/3`, at, frac.length);
                share = num / den;
            }
            else {
                const n = s.match(/(?:0?\.[0-9]+|0|1(?:\.0+)?)(?![0-9])/y);
                if (n === null)
                    s.fail(`a share after ${level}:, from 0 to 1, a decimal or a fraction (.5 straight, .67 or 2/3 the triplet swing): swing=${level}:2/3`);
                share = parseFloat(n);
            }
        }
        if (s.peek() === ':') {
            const at = s.i;
            s.i++;
            const named = s.match(/[a-z]+/y);
            if (named !== 'pairs')
                s.fail(`a share takes no word after it: a swing leans a level's pairs alone and keeps its groups of three straight (swing=${level}:2/3)`, at, 1 + (named?.length ?? 0));
            if (word === 'legato')
                s.fail(`:pairs was swing='s word; a legato= share holds every note of its level: legato=${level}:.5`, at, 6);
            if (free && s.peek() === ',')
                s.fail(`a share left free(…) is one level alone: ${word}=8n:free(.5, .5..75)`, vs, s.i - vs);
            s.warn(":pairs says nothing more: every swing leans a level's pairs alone and keeps its groups of three straight (decision 071); Migrate drops it", at, 6);
        }
        levels.push({ level: level, share });
        if (s.peek() !== ',')
            break;
        s.i++;
    }
    if (word === 'legato')
        b.legato = levels;
    else {
        b.swing = levels;
        b.params[word] = levels[0].share;
    }
    b.paramSpans[word] = s.span(vs);
};
function readParam(s, b, key) {
    const vs = s.i;
    if (key === 'level' && (s.peek() === '&' || /^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+|free\([^()]*\))\s*\*/.test(s.text.slice(s.i)))) {
        const factors = [];
        let gain = 1;
        for (let first = true;; first = false) {
            const save = s.i;
            if (!first) {
                s.skipSpace();
                if (s.peek() !== '*') {
                    s.i = save;
                    break;
                }
                s.i++;
                s.skipSpace();
            }
            const f = s.freeNumber(NUMBER_PLACES.level);
            const n = f === null ? s.match(/(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y) : String(f);
            if (n !== null)
                gain *= parseFloat(n);
            else
                factors.push(s.cellRef('a level cell or a number, like level=&accent*&duck*.4', 'in level='));
        }
        b.paramCells[key] = { range: null, factors, span: s.span(vs) };
        if (gain !== 1)
            b.params[key] = gain;
        b.paramSpans[key] = s.span(vs);
        return;
    }
    if ((s.peek() === '&' || atTap(s)) && TIME_PARAMS.has(key)) {
        const st = parseStep(s, false);
        if (st.kind !== 'driven' && st.kind !== 'tap')
            s.fail(`${key}= takes seconds, a clock or a tap: ${key}=&bar*2, ${key}=8n`, vs, s.i - vs);
        b.paramClocks[key] = st;
        b.paramSpans[key] = s.span(vs);
        return;
    }
    const blend = key === 's' ? s.text.slice(s.i).match(/^([A-Za-z]+)\.\.([A-Za-z]+)/) : null;
    if (blend) {
        s.i += blend[0].length;
        const factors = [];
        for (;;) {
            const save = s.i;
            s.skipSpace();
            if (s.peek() !== '*') {
                s.i = save;
                break;
            }
            s.i++;
            s.skipSpace();
            factors.push(s.cellRef(`a cell after *, like s=${blend[0]} * &style[bite]`, 'in s='));
        }
        if (factors.length === 0)
            s.fail(`s=${blend[0]}: a blend of two waves is moved by cells, the share of the second: s=${blend[0]} * &style[bite]`, vs, s.i - vs);
        b.params.s = blend[1];
        b.paramCells.s = { range: [0, 1], factors, span: s.span(vs), to: blend[2] };
        b.paramSpans.s = s.span(vs);
        return;
    }
    const range = readRange(s, key);
    if (s.peek() === '&' || range) {
        const factors = [];
        if (!range)
            factors.push(s.cellRef(`a cell after ${key}=`, `in ${key}=`));
        for (;;) {
            const save = s.i;
            s.skipSpace();
            if (s.peek() !== '*') {
                s.i = save;
                break;
            }
            s.i++;
            s.skipSpace();
            factors.push(s.cellRef(`a cell after *, like ${key}=200..3000 * &fenv`, `in ${key}=`));
        }
        if (range && factors.length === 0)
            s.fail(`${key}=${s.text.slice(vs, s.i)}: a range is scaled by cells — ${key}=${s.text.slice(vs, s.i)} * &fenv`, vs, s.i - vs);
        if (!range && factors.length > 1)
            s.fail(`${key}=: several cells multiply a range — ${key}=200..3000 * &a * &b`, vs, s.i - vs);
        b.paramCells[key] = { range, factors, span: s.span(vs) };
        b.paramSpans[key] = s.span(vs);
        return;
    }
    const f = s.free(NUMBER_PLACES.param, key);
    if (f !== null) {
        b.params[key] = f.value;
        b.paramSpans[key] = s.span(vs);
        return;
    }
    const v = s.match(/-?[A-Za-z0-9_.]+/y);
    if (v === null)
        s.fail(`Expected a value after ${key}=`);
    const value = /^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(v) ? parseFloat(v) : v;
    b.params[key] = key === 'ftype' && typeof value === 'number' ? (filterModel(value) ?? value) : value;
    b.paramSpans[key] = s.span(vs);
}
const RETIRED_KEYS = {
    init: 'init= is now shift=',
    out: 'out= is now a command: out(voice, &cell) / step(&meter, bpm=…)',
    time: 'time= is now a command: out(voice, &cell) / step(&meter, bpm=…)',
    rung: 'rung= is now tier= (decision 020): the tutorial is in tiers, tier=1 to tier=9',
    ...RETIRED_PARAMS,
};
export const LINE_SYNTAX = [
    syntax('line', '&name …', 'A cell: one per line, its name first, then its attributes (key=value) and its braid, in any order.', ['&theme over=&major step=&bar 0 2 4 5'], 'cell.md'),
    syntax('line', '&name label="…"', 'A note: a cell with only a label= (and title=, tags=, about=) explains, in the graph; it does nothing.', ['&why label="The bass walks down a fifth each bar."'], 'display.md'),
    syntax('line', 'off', 'Switched off: it, and everything that reads through it or plays it, is silent (and hidden from the graph).', ['&drums off over=&kit step=&bar 0 1'], 'cell.md'),
    syntax('line', '# … · // …', 'A comment, to the end of the line: # at the start of a line or after a space (a # glued to a number is a sharp), // anywhere.', ['&tune step=2 0 2 4  # the opening'], 'cell.md'),
    syntax('line', '… + · … * · … , · … [', 'A line ending in +, *, a comma or [ continues on the next one (a long mix).', [], 'cell.md'),
    syntax('line', '&x from id(name=…) … · &a, &b from id · * from id', "Where a line's cells come from (decision 065): a fragment by its id, the id a word or in double quotes, the host's resolver finding it. A template (a fragment with a signature) gives a copy, its head named as the line names it, its named arguments in parentheses and its main one the rest of the line; attributes before `from` are the head's. A collection gives the cells it names by their names, or every line (`*`). With no id, a fragment's signature: its head, its optional parameters in parentheses, its main one after them. `use &a, &b from id` is retired: an error, which Migrate rewrites (#387).", ['&key from harmonic_minor D', '&bar from meter(swing=8n:.64) 120bpm', '&bd, &sd from gm_kit', '* from gm_kit', '&bar from (&swing) &tempo'], 'use.md'),
    syntax('line', '&sections step=&bar &a &b', 'Sections of an arrangement (decision 016): a stepped table of names declares them, each stepped as the table is. What a section steps plays while a selector reading the table picks it (`over=&sections`), from its top each time.', ['&sections step=&bar &verseBar &chorusBar'], 'time.md'),
];
function parseFreeBraid(s) {
    const start = s.i;
    s.i += 'free('.length;
    if (s.peek() === '"')
        s.fail('free("…") is a text, for spell(…): a braid left free is steps, free(0 2 4 ~)', start, 6);
    const close = s.text.indexOf(')', s.i);
    if (close < 0)
        s.fail(`')' to close free(…)`, start, s.i - start);
    const inner = s.within(s.text.slice(s.i, close), s.i);
    const tokens = [];
    for (;;) {
        inner.skipSpace();
        if (inner.done())
            break;
        const at = inner.i;
        const t = parseToken(inner);
        if (leaves(t.atom).some((a) => a.kind !== 'note' && a.kind !== 'rest' && a.kind !== 'chord'))
            inner.fail('A braid left free holds steps: numbers, rests (~), chords ([0,4]) and subsequences of them ([0 2]), held (@n) or repeated (!n)', at, inner.i - at);
        pushStep(inner, tokens, t);
    }
    if (!tokens.length)
        s.fail('free(…) around a braid needs steps: free(0 2 4 ~)', start, close - start + 1);
    s.i = close + 1;
    const length = tokens.reduce((n, t) => n + t.repeat * t.elongate, 0);
    s.frees.push({ key: 'braid', value: 0, unit: '', lo: 0, hi: length, span: s.place(start), braid: inner.text.trim().replace(/\s+/g, ' ') });
    return { kind: 'list', tokens };
}
export function parseBody(s, head) {
    const b = {
        over: null,
        base: null,
        shift: null,
        cycle: null,
        step: null,
        map: null,
        stride: null,
        env: null,
        pitch: null,
        show: null,
        label: null,
        laps: null,
        title: null,
        tags: null,
        tier: null,
        about: null,
        style: null,
        chance: null,
        seed: null,
        size: null,
        swing: null,
        bend: null,
        legato: null,
        params: {},
        paramSpans: {},
        paramCells: {},
        paramClocks: {},
        playMove: null,
    };
    const seen = new Map();
    let off = false;
    let oneshot = false;
    const tokens = [];
    let generator = null;
    let scaleKey = null;
    let fifthsShift = null;
    let freeBraid = false;
    let freeEnd = -1;
    let freeSteps = '';
    const axes = new Map();
    const adsr = new Map();
    while (!s.done()) {
        const at = s.i;
        const word = s.match(IDENT);
        if (word !== null && s.peek() === '=') {
            s.i++;
            const key = word in KEYS || word in PARAMS ? word : (PARAM_ALIASES[word] ?? null);
            if (key === null && ADSR_SLOTS.includes(word)) {
                if (adsr.has(word))
                    s.fail(`${word}= is given twice`, at, word.length);
                adsr.set(word, at);
                readParam(s, b, word);
                if (!s.atBoundary())
                    s.fail(`Unexpected '${s.peek()}'`);
                continue;
            }
            if (key === null && AXIS_NAMES.includes(word)) {
                if (axes.has(word))
                    s.fail(`${word}= is given twice`, at, word.length);
                const vat = s.i;
                const ranged = /^(?:free\([^)]*\)|-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+))\s*(?:\.\.|±|\+-)/.test(s.text.slice(s.i));
                if (s.text.startsWith('free(', s.i) && !ranged)
                    axes.set(word, { value: String(readAxisFree(s, word).value), at });
                else if (s.peek() === '&' || ranged) {
                    const frees = s.frees.length;
                    readParam(s, b, word);
                    const pc = b.paramCells[word];
                    if (!pc)
                        s.fail(`${word}=: a moving axis is a range within it and the cell that moves it, ${word}=0..1 * &walk`, vat, s.i - vat);
                    const [alo, ahi] = AXES.find((a) => a.name === word).range;
                    for (const f of s.frees.slice(frees))
                        if (f.param !== `${word} reach` && (f.lo < alo || f.hi > ahi))
                            s.fail(`${word}=: a window's end moves within the axis, ${alo} to ${ahi}: free(${f.value}, ${Math.max(alo, f.lo)}..${Math.min(ahi, f.hi)})`, vat, s.i - vat);
                    const reach = /±|\+-/.test(s.text.slice(vat, s.i));
                    let [lo, hi] = pc.range ?? [alo, ahi];
                    if (reach)
                        [lo, hi] = [Math.min(ahi, Math.max(alo, lo)), Math.min(ahi, Math.max(alo, hi))];
                    else if (!(lo >= alo && lo <= ahi && hi >= alo && hi <= ahi))
                        s.fail(`${word}= moves within the axis, ${alo} to ${ahi}: ${word}=${alo}..${ahi} * &walk`, vat, s.i - vat);
                    if (pc.range)
                        b.paramCells[word] = { ...pc, range: [lo, hi] };
                    axes.set(word, { value: String(lo), at });
                }
                else {
                    s.num(`a number after ${word}= (an axis of a style, 0 to 1), or a slider, ${word}=free(.3, 0..1)`, NUMBER_PLACES.axis, word);
                    axes.set(word, { value: s.text.slice(vat, s.i), at });
                }
                if (!s.atBoundary())
                    s.fail(`Unexpected '${s.peek()}'`);
                continue;
            }
            if (key === null) {
                if (word in RETIRED_KEYS)
                    s.fail(RETIRED_KEYS[word], at, word.length);
                if ((word === 'artic' || word === 'energy') && b.map?.kind === 'style')
                    s.fail(`${word}= is retired: a style's axes are ${AXIS_NAMES.join(' ')}, bite its articulation and energy off the point (decision 076); Migrate rewrites it`, at, word.length);
                const near = nearestAttribute(word);
                s.fail(`Unknown attribute ${word}=${near ? ` — did you mean ${near}=?` : ''} (a cell: ${Object.keys(CORE).join(' ')}; a sound or a physical cell: ${Object.keys(PARAMS).join(' ')})`, at, word.length);
            }
            const slot = key === 'loop' ? 'step' : key;
            if (seen.has(slot)) {
                const first = seen.get(slot);
                s.fail(slot === 'step' && b.step.whole !== (word === 'loop')
                    ? 'step= and loop= say the same thing two ways — pick one'
                    : first !== word
                        ? `${word}= and ${first}= are one parameter, ${key}= — given twice`
                        : `${word}= is given twice`, at, word.length);
            }
            seen.set(slot, word);
            if (word === 'clip')
                s.warn("clip= is Strudel's name for legato= — write legato= (Normalise rewrites it)", at, word.length);
            const read = KEYS[key]?.read ??
                (key === 'swing' || key === 'legato' ? readLevels : key === 'bend' ? readBend : CELL_PARAMS.has(key) ? readCellParam : readParam);
            read(s, b, key, at);
            if (!s.atBoundary())
                s.fail(`Unexpected '${s.peek()}'`);
            continue;
        }
        if (word === 'free' && s.peek() === '(' && b.map?.kind === 'style' && /^\(\s*[^,()]*,/.test(s.text.slice(s.i))) {
            const axis = AXIS_NAMES[tokens.length];
            if (axis === undefined)
                s.fail(`A style has ${AXIS_NAMES.length} axes (${AXIS_NAMES.join(' ')}): this value is one more`, at, word.length);
            s.i = at;
            const inner = s.within(String(readAxisFree(s, axis).value), at);
            pushStep(inner, tokens, parseToken(inner));
            continue;
        }
        if (word === 'free' && s.peek() === '(' && FREE_NUMBER.test(s.text.slice(s.i))) {
            if (generator)
                s.fail(freeBraid ? FREE_BRAID_WHOLE : 'A cell has one braid: a generator or a list of steps', at, word.length);
            s.i = at;
            pushStep(s, tokens, parseToken(s));
            continue;
        }
        if (word === 'free' && s.peek() === '(') {
            if (generator || tokens.length)
                s.fail(FREE_BRAID_WHOLE, at, word.length);
            s.i = at;
            generator = parseFreeBraid(s);
            freeBraid = true;
            freeEnd = s.i;
            freeSteps = s.text.slice(at + 'free('.length, s.i - 1).trim();
            continue;
        }
        if (word !== null && isGenerator(word) && s.peek() === '(') {
            if (generator || tokens.length)
                s.fail(freeBraid ? FREE_BRAID_WHOLE : 'A cell has one braid: a generator or a list of steps', at, word.length);
            if (word === 'fifths') {
                const f = parseFifths(s, at);
                generator = f.braid;
                fifthsShift = f.shift;
            }
            else if (word === 'scale') {
                const sc = parseScale(s, at);
                generator = { kind: 'scan', steps: sc.steps, span: sc.span, ...(sc.mode ? { mode: sc.mode } : {}) };
                scaleKey = sc.key;
            }
            else
                generator = parseGenerator(s, word, at);
            continue;
        }
        if (word !== null && OPERATIONS.includes(word) && s.peek() === '(') {
            if (generator)
                s.fail(freeBraid ? FREE_BRAID_WHOLE : 'A cell has one braid: a generator or a list of steps');
            s.i = at;
            pushStep(s, tokens, parseToken(s));
            continue;
        }
        if (word === 'off' && s.atBoundary()) {
            if (off)
                s.fail('off is given twice', at, word.length);
            off = true;
            continue;
        }
        if (word === 'oneshot' && s.atBoundary()) {
            if (oneshot)
                s.fail('oneshot is given twice', at, word.length);
            oneshot = true;
            s.warn('oneshot is retired as a line word: a voice’s parameter, oneshot=1 (Migrate rewrites it, decision 068)', at, word.length);
            continue;
        }
        if (word !== null && (/^[A-G](?:b?-?[0-9]*)$/.test(word) || word === '_' || Object.hasOwn(MODE_WORDS, word)))
            s.i = at;
        else if (word !== null)
            s.fail(`Unexpected '${word}'`, at, word.length);
        if (generator && freeBraid && s.peek() === ')')
            s.fail(`A ')' with nothing to close: free(${freeSteps}) ends at its first ')'`, at, 1);
        if (generator && at === freeEnd && /[@!*/?:]/.test(s.peek())) {
            const mod = /^\S+/.exec(s.text.slice(at))[0];
            s.fail(`free(${freeSteps})${mod}: a modifier goes on its steps, inside the parentheses: free([${freeSteps}]${mod})`, at, mod.length);
        }
        if (generator)
            s.fail(freeBraid ? FREE_BRAID_WHOLE : 'A cell has one braid: a generator or a list of steps', at, 1);
        pushStep(s, tokens, parseToken(s));
    }
    if (axes.size) {
        const [first, { at }] = [...axes][0];
        if (b.map?.kind !== 'style')
            s.fail(`${first}= is an axis of a style: it goes on a map=style cell (&funk map=style sync=.3 harm=.45 bite=.55 mood=.5)`, at, first.length);
        if (generator || tokens.length)
            s.fail('A style writes its axes by name (sync=.3) or in order (.3 .45 .55 .5), not both', at, first.length);
        const missing = AXIS_NAMES.filter((n) => !axes.has(n));
        if (missing.length)
            s.fail(`A style names every axis: ${missing.map((n) => `${n}=`).join(' ')} ${missing.length === 1 ? 'is' : 'are'} missing (its axes: ${AXIS_NAMES.join(' ')})`, at, first.length);
        for (const name of AXIS_NAMES) {
            const { value, at: where } = axes.get(name);
            const inner = s.within(value, where + name.length + 1);
            pushStep(inner, tokens, parseToken(inner));
        }
    }
    if (adsr.size) {
        const [first, at] = [...adsr][0];
        if (b.map?.kind !== 'adsr')
            s.fail(RETIRED_KEYS[first] ?? `${first}= is a slot of an envelope: it goes on a map=adsr cell`, at, first.length);
        if (generator || tokens.length)
            s.fail('An envelope writes its slots by name (attack=.01) or in order (.01 .3 .5 .4), not both', at, first.length);
        const missing = ADSR_SLOTS.filter((n) => !adsr.has(n));
        if (missing.length)
            s.fail(`An envelope names every slot: ${missing.map((n) => `${n}=`).join(' ')} ${missing.length === 1 ? 'is' : 'are'} missing (its slots: ${ADSR_SLOTS.join(' ')})`, at, first.length);
        for (const name of ADSR_SLOTS) {
            const where = adsr.get(name);
            const moving = b.paramCells[name];
            const value = moving ? String(moving.range?.[0] ?? 0) : b.params[name];
            if (typeof value !== 'number' && typeof value !== 'string')
                s.fail(`${name}= takes a number, a range scaled by cells, or a cell`, where, name.length);
            delete b.params[name];
            const inner = s.within(String(value), where + name.length + 1);
            pushStep(inner, tokens, parseToken(inner));
        }
    }
    const braid = generator ?? (tokens.length ? { kind: 'list', tokens } : { kind: 'blank' });
    if (b.params.oneshot !== undefined) {
        const at = b.paramSpans.oneshot;
        const v = b.params.oneshot;
        if (v !== 0 && v !== 1)
            s.fail('oneshot= is 1 (each note played through) or 0 (as its step, the default)', at ? at.col - 1 : 0, 7);
        if (oneshot)
            s.fail('oneshot is given twice: write oneshot=1 alone', at ? at.col - 1 : 0, 7);
        oneshot = v === 1;
        delete b.params.oneshot;
        delete b.paramSpans.oneshot;
    }
    if (oneshot && typeof b.params.glide === 'number' && b.params.glide > 0) {
        const at = b.paramSpans.glide;
        s.fail('oneshot or glide=: a voice plays each note through, or ties them as one', at ? at.col - 1 : 0, 5);
    }
    if (fifthsShift !== null && fifthsShift !== 0) {
        if (b.shift !== null)
            s.fail('fifths(n) turns it already: write fifths() and shift=, or fifths(n) alone');
        b.shift = fifthsShift;
    }
    if (scaleKey) {
        if (b.over)
            s.fail('scale(…) reads through a key of its own: drop over=, or write the key as a cell (&mode over=&key scan(…))', b.over.span.col - 1, b.over.span.len);
        b.over = scaleKey;
    }
    if (b.playMove && braid.kind === 'blank')
        s.warn(`${b.playMove.as} after play=: ^ and ^$ move what a gate plays (one with a braid: &out play=${b.playMove.as} &lead); a read head reads the tape itself, so the move is ignored`, b.playMove.at, b.playMove.len);
    const playMove = b.playMove && braid.kind !== 'blank'
        ? { ...(b.playMove.transpose ? { transpose: b.playMove.transpose } : {}), ...(b.playMove.degree ? { degree: b.playMove.degree } : {}) }
        : null;
    const { over, base, shift, step, map, stride, cycle, env, pitch, show, label, title, tags, tier, about, style, laps, chance, seed, size, swing, bend, legato, params, paramSpans, paramCells, paramClocks, } = b;
    return {
        name: head.name,
        span: head.span,
        over,
        ...(base ? { base } : {}),
        shift,
        off,
        ...(oneshot ? { oneshot } : {}),
        step,
        map,
        stride,
        cycle,
        env,
        pitch,
        show,
        label,
        title,
        tags,
        tier,
        about: about ?? undefined,
        ...(style ? { style } : {}),
        laps,
        chance,
        seed,
        size,
        ...(swing ? { swing } : {}),
        ...(bend ? { bend } : {}),
        ...(legato ? { legato } : {}),
        params,
        paramSpans,
        paramCells,
        paramClocks,
        ...(playMove ? { playMove } : {}),
        braid,
        frees: [...s.frees],
    };
}
export function parseCell(s) {
    s.skipSpace();
    if (s.text.startsWith('&(', s.i))
        s.fail('An unnamed cell &( … ) goes where a cell is used; a line declares a named one: &name …');
    const head = s.cellRef('a cell name like &theme', 'names the line');
    if (head.pick || head.shift)
        s.fail('Brackets go where a cell is used (&x[0], &x[<<]), not where it is named — use shift= here', head.span.col - 1, head.span.len);
    if (s.peek() === '(')
        s.fail(`&name(…) is gone — write over=&…`);
    return parseBody(s, head);
}
