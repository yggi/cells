import { syntax } from "./syntax.js";
import { parseFree } from "./free.js";
import { agogic as agogicPositions, even as evenPositions, intervals, SCALES, scaleOfPhase } from "../../theory/modes.js";
import { TONAL_SCALES } from "../../theory/tonal.js";
function parseScan(s, start) {
    s.i++;
    const steps = [];
    for (;;) {
        s.skipSpace();
        if (s.peek() === ')')
            break;
        const at = s.i;
        if (s.text.startsWith('geo(', s.i)) {
            s.i += 4;
            s.skipSpace();
            const r = s.num('a ratio, like geo(5, 25, 0 10 5)').value;
            s.skipSpace();
            s.expect(',', `',' then the steps per ratio: geo(${r}, 25, 0 10 5)`);
            s.skipSpace();
            const n = s.int('the steps per ratio');
            s.skipSpace();
            s.expect(',', `',' then the exponents: geo(${r}, ${n}, 0 10 5)`);
            const ks = [];
            for (;;) {
                s.skipSpace();
                if (s.peek() === ')')
                    break;
                ks.push(s.num('an exponent').value);
            }
            s.i++;
            if (!(r > 0) || n < 1 || ks.length === 0)
                s.fail('geo(r, n, k …): r above 0, n ≥ 1, at least one k', at, s.i - at);
            for (const k of ks)
                steps.push(+Math.pow(r, k / n).toFixed(9));
            continue;
        }
        if (s.text.startsWith('free(', s.i)) {
            const f = parseFree(s, 'interval', false);
            if (!(f.lo > 0))
                s.fail('A scan interval stays positive: give free(…) a range above 0', at, s.i - at);
            steps.push(f.value);
        }
        else {
            const n = s.match(/[0-9]+(?:\.[0-9]+)?|\.[0-9]+/y);
            if (n === null || !(parseFloat(n) > 0))
                s.fail('scan(…) takes positive intervals, like scan(2 2 1 2 2 2 1)', at);
            let times = 1;
            if (s.peek() === '!') {
                s.i++;
                const r = s.match(/[0-9]+/y);
                if (r === null || !(parseInt(r, 10) >= 1))
                    s.fail('x!n repeats an interval n times: scan(1!4 2)', at, s.i - at);
                times = parseInt(r, 10);
            }
            for (let k = 0; k < times; k++)
                steps.push(parseFloat(n));
        }
        s.skipSpace();
        if (s.peek() === ',')
            s.i++;
    }
    s.expect(')', `')' to close scan(…)`);
    if (steps.length === 0)
        s.fail('scan(…) needs at least one interval', start, s.i - start);
    const span = s.span(start);
    if (!s.atBoundary())
        s.fail(`Unexpected '${s.peek()}'`);
    return { kind: 'scan', steps, span };
}
export function bjorklund(k, n) {
    if (k <= 0)
        return Array(n).fill(false);
    let a = Array.from({ length: k }, () => [true]);
    let b = Array.from({ length: n - k }, () => [false]);
    while (b.length > 1) {
        const m = Math.min(a.length, b.length);
        const paired = Array.from({ length: m }, (_, i) => [...a[i], ...b[i]]);
        const rest = a.length > m ? a.slice(m) : b.slice(m);
        a = paired;
        b = rest;
    }
    return [...a, ...b].flat();
}
function parseSpell(s, start) {
    s.i++;
    s.skipSpace();
    let text;
    if (s.peek() === 'f')
        text = parseFree(s, 'text', false).text ?? '';
    else {
        const q = s.match(/"[^"]*"/y);
        if (q === null)
            s.fail('spell(text, &table, "names"): the text first — "867 5309" or free("867 5309")');
        text = q.slice(1, -1);
    }
    s.skipSpace();
    s.expect(',', `',' then the table, like spell("867", &keys, "1 2 3 …")`);
    s.skipSpace();
    const table = s.cellRef('the table its characters pick from, like &keys', 'in spell(…)');
    s.skipSpace();
    s.expect(',', `',' then the names of the table's entries, in quotes`);
    s.skipSpace();
    const q = s.match(/"[^"]*"/y);
    if (q === null)
        s.fail('the names of the table’s entries, in quotes: "1 2 3 A 4 5 6 B …"');
    const names = q.slice(1, -1).trim().split(/\s+/).filter(Boolean);
    s.skipSpace();
    s.expect(')', `')' to close spell(…)`);
    const span = s.span(start);
    if (!s.atBoundary())
        s.fail(`Unexpected '${s.peek()}'`);
    const rest = { atom: { kind: 'rest' }, repeat: 1, subdivide: 1, elongate: 1, span };
    const tokens = [...text].flatMap((ch) => {
        const k = names.indexOf(ch);
        if (k < 0)
            return [rest, rest];
        return [
            { atom: { kind: 'ref', name: table.name, pick: { kind: 'at', i: k, abs: true }, shift: 0 }, repeat: 1, subdivide: 1, elongate: 1, span },
            rest,
        ];
    });
    if (!tokens.length)
        tokens.push(rest);
    return { kind: 'list', tokens, span };
}
export const SIGNATURES = {
    '2/4': [1, 1],
    '3/4': [1, 1, 1],
    '4/4': [1, 1, 1, 1],
    '5/4': [1, 1, 1, 1, 1],
    '6/8': [3, 3],
    '7/8': [3, 2, 2],
    '9/8': [3, 3, 3],
    '10/8': [3, 2, 3, 2],
    '12/8': [3, 3, 3, 3],
    '5/8': [3, 2],
};
export function signatureOf(sig, sub) {
    const [num, den] = sig.split('/').map((x) => parseInt(x, 10));
    const groups = SIGNATURES[sig] ?? [];
    return { pulses: num, unit: den, beats: sig.endsWith('/8') ? groups : groups.map(() => 1), sub };
}
export function meterLevels(sig, sub) {
    if (/^[*+\-.,]+$/.test(sig))
        return sig;
    const groups = SIGNATURES[sig];
    if (!groups)
        return '';
    const compound = sig.endsWith('/8');
    let out = '';
    groups.forEach((g, i) => {
        if (!compound) {
            out += i === 0 ? '*' : '+';
            for (let k = 1; k < sub; k++)
                out += sub % 2 === 0 && k === sub / 2 ? '.' : sub === 3 ? '.' : ',';
        }
        else {
            for (let e = 0; e < g; e++) {
                out += e === 0 ? (i === 0 ? '*' : '+') : '.';
                for (let k = 1; k < sub; k++)
                    out += ',';
            }
        }
    });
    return out;
}
function parseMeter(s, start) {
    s.i++;
    s.skipSpace();
    const arg = (what) => {
        if (s.peek() === '"')
            return s.match(/"[^"]*"/y).slice(1, -1);
        if (s.peek() === 'f') {
            const f = parseFree(s, 'choice', false);
            if (f.key === 'text' || f.text !== undefined)
                return f.text ?? '';
            if (f.labels)
                return f.labels[Math.round((f.value - f.lo) / ((f.hi - f.lo) / Math.max(1, f.labels.length - 1) || 1))] ?? '';
            return String(f.value);
        }
        const n = s.match(/[0-9]+/y);
        if (n === null)
            s.fail(`${what}: in quotes ("4/4"), a number, or free(…)`);
        return n;
    };
    const sig = arg('the time signature');
    s.skipSpace();
    let sub = 1;
    if (s.peek() === ',') {
        s.i++;
        s.skipSpace();
        sub = Math.max(1, Math.min(8, parseInt(arg('steps a pulse'), 10) || 1));
        s.skipSpace();
    }
    s.expect(')', `')' to close meter(…)`);
    const span = s.span(start);
    if (!s.atBoundary())
        s.fail(`Unexpected '${s.peek()}'`);
    const levels = meterLevels(sig, sub);
    if (!levels)
        s.fail(`meter("${sig}"): a time signature (${Object.keys(SIGNATURES).join(' ')}) or levels like "*.+.+.+." (* bar, + beat, . subdivision, , finer)`, start, span.len);
    const value = (ch) => Math.max(0, '*+-.,'.indexOf(ch));
    const tokens = [...levels].map((ch) => ({ atom: { kind: 'note', value: value(ch), alter: 0 }, repeat: 1, subdivide: 1, elongate: 1, span }));
    const beats = [...levels].filter((ch) => ch === '*' || ch === '+').length || 1;
    return { kind: 'list', tokens, span, perBeat: levels.length / beats, ...(SIGNATURES[sig] ? { signature: signatureOf(sig, sub) } : {}) };
}
function numbers(s, name, start) {
    s.i++;
    const args = [];
    for (;;) {
        s.skipSpace();
        args.push(s.int(`a number in ${name}(…)`));
        s.skipSpace();
        if (s.peek() !== ',')
            break;
        s.i++;
    }
    s.expect(')', `')' to close ${name}(…)`);
    const span = s.span(start);
    if (!s.atBoundary())
        s.fail(`Unexpected '${s.peek()}'`);
    return { args, span };
}
function parseEuclid(s, start) {
    const { args, span } = numbers(s, 'euclid', start);
    const [k, n, shift = 0] = args;
    if (args.length < 2 || args.length > 3 || !(n >= 1) || !(k >= 0 && k <= n))
        s.fail('euclid(k, n): k hits spread evenly over n steps (0 ≤ k ≤ n), euclid(k, n, shift) turned', start, span.len);
    const pattern = bjorklund(k, n);
    const tokens = Array.from({ length: n }, (_, j) => {
        const i = (((j - shift) % n) + n) % n;
        const hit = pattern[i];
        return { atom: hit ? { kind: 'note', value: 0, alter: 0 } : { kind: 'rest' }, repeat: 1, subdivide: 1, elongate: 1, span };
    });
    return { kind: 'list', tokens, span };
}
const WAVE_NAMES = { sin: 'a sine', saw: 'a saw', tri: 'a triangle', square: 'a square' };
const parseWave = (shape) => (s, start) => {
    const { args, span } = numbers(s, shape, start);
    const [n] = args;
    if (args.length !== 1 || n < 2)
        s.fail(`${shape}(n): one cycle of ${WAVE_NAMES[shape]} in n steps, n ≥ 2`, start, span.len);
    return { kind: 'wave', shape, n, span };
};
export function waveValues(shape, n) {
    const at = (t) => shape === 'sin' ? Math.sin(2 * Math.PI * t) : shape === 'saw' ? 2 * t - 1 : shape === 'tri' ? (t < 0.5 ? 4 * t - 1 : 3 - 4 * t) : Math.floor(2 * t) % 2 ? 1 : -1;
    return Array.from({ length: n }, (_, i) => +at(i / n).toFixed(6) + 0);
}
const TONICS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const tonicName = (pc) => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][((pc % 12) + 12) % 12];
export const SCALE_KEY = 'key:λ';
export function parseScale(s, start) {
    s.i++;
    s.skipSpace();
    let steps;
    let tonic = 0;
    let tonicText = '0';
    const legacy = s.match(/-?[0-9]+/y);
    const quoted = legacy === null ? s.match(/"[^"]*"/y) : null;
    if (quoted !== null) {
        const m = /^"([A-G](?:#|b)?)([0-9]*)((?::[a-z0-9#'-]+)+)"$/.exec(quoted);
        if (!m)
            s.fail('scale("tonic:name"): a tonic and a scale\'s name, as in Strudel — scale("D:minor"), scale("F#:harmonic:minor")', start, s.i - start);
        if (m[2])
            s.fail(`scale("${m[1]}${m[2]}:…"): the octave is the voice's (loop=), not the scale's: scale("${m[1]}${m[3]}")`, start, s.i - start);
        const words = m[3].slice(1).split(':');
        const [tonal, ours] = [words.join(' '), words.join('')];
        const scale = Object.hasOwn(TONAL_SCALES, tonal) ? TONAL_SCALES[tonal] : Object.hasOwn(SCALES, ours) ? SCALES[ours].steps : undefined;
        if (!scale)
            s.fail(`scale("…${m[3]}"): a scale by name — ours (${Object.keys(SCALES).join(' ')}) or tonal's, as Strudel reads them (harmonic:minor, minor:pentatonic, whole:tone, diminished, chromatic, bebop … listed in tables.md)`, start, s.i - start);
        steps = [...scale];
        const note = m[1];
        tonic = (((TONICS[note[0]] + (note[1] === '#' ? 1 : note[1] === 'b' ? -1 : 0)) % 12) + 12) % 12;
        tonicText = String(tonic);
        s.skipSpace();
        s.expect(')', "')' to close scale(…)");
    }
    else if (legacy !== null) {
        s.skipSpace();
        s.expect(',', "',' then the mode — better by name: scale(minor, A)");
        s.skipSpace();
        const at = s.i;
        const phase = s.int('the mode, 0 (the darkest) to 6');
        if (phase > 6)
            s.fail(`scale(tonic, phase): the phase is a mode, 0 (the darkest, Locrian) to 6 (the brightest, Lydian) — not ${phase}`, at, String(phase).length);
        tonic = parseInt(legacy, 10);
        tonicText = legacy;
        steps = intervals(evenPositions(7, 12, phase), 12);
        s.skipSpace();
        s.expect(')', "')' to close scale(…)");
        s.warn(`scale(${tonic}, ${phase}) is written scale(${scaleOfPhase(phase)}, ${tonicName(tonic)}): the mode by name, then the tonic`, start, s.i - start);
    }
    else {
        const at = s.i;
        const name = s.match(/[a-z]+/y);
        const scale = name ? SCALES[name] : undefined;
        if (!scale)
            s.fail(`scale(name, tonic): a scale by name — ${Object.keys(SCALES).join(' ')}`, at, Math.max(1, (name ?? '').length));
        steps = [...scale.steps];
        s.skipSpace();
        if (s.peek() === ',') {
            s.i++;
            s.skipSpace();
            const t0 = s.i;
            const note = s.match(/[A-G](?:#|b)?(?![A-Za-z0-9])/y);
            if (note !== null) {
                tonic = (((TONICS[note[0]] + (note[1] === '#' ? 1 : note[1] === 'b' ? -1 : 0)) % 12) + 12) % 12;
                tonicText = String(tonic);
            }
            else if (s.text.startsWith('free(', s.i)) {
                tonic = Math.round(parseFree(s, 'tonic', false).value);
                tonicText = s.text.slice(t0, s.i);
            }
            else {
                tonic = s.int('the tonic: a note name (D, F#, Bb), a number or free(…)');
                tonicText = String(tonic);
                if (Math.abs(tonic) > 11)
                    s.warn(`scale(…, ${tonic}): the tonic is a pitch class, 0 (C) to 11 (B)`, t0, s.i - t0);
            }
            s.skipSpace();
        }
        s.expect(')', "')' to close scale(…)");
    }
    const span = s.span(start);
    const key = `${SCALE_KEY}${s.line}_${start + s.offset}`;
    s.lambdas.push({
        name: key,
        span,
        lambda: `shift=${tonicText}`,
        over: null,
        shift: tonic,
        off: false,
        step: null,
        map: null,
        stride: null,
        cycle: null,
        params: {},
        paramSpans: {},
        braid: { kind: 'blank' },
    });
    return { steps, key: { name: key, pick: null, shift: 0, span }, span };
}
export function parseFifths(s, start) {
    s.i++;
    s.skipSpace();
    let shift = 0;
    if (s.peek() !== ')') {
        const at = s.i;
        const name = s.noteName();
        if (name !== null)
            shift = ((((name % 12) + 12) % 12) * 7) % 12;
        else
            shift = s.int('how many fifths round it starts (fifths(1): on G), or the note it starts on: fifths(G)');
        if (name === null && Math.abs(shift) > 11) {
            const laps = Math.trunc(shift / 12);
            const rest = shift % 12;
            const note = 'C G D A E B F# C# Ab Eb Bb F'.split(' ')[(rest + 12) % 12];
            s.warn(`fifths(${shift}): the circle comes round after 12, and a turn past a lap climbs one, as every shift does: fifths(${rest}) ${laps > 0 ? 'up' : 'down'} ${Math.abs(laps)} octave${Math.abs(laps) === 1 ? '' : 's'}${rest ? ` (fifths(${note}) names the note, no octave)` : ''}`, at, s.i - at);
        }
        s.skipSpace();
    }
    s.expect(')', "')' to close fifths(…)");
    const span = s.span(start);
    const tokens = Array.from({ length: 12 }, (_, k) => ({ atom: { kind: 'note', value: (k * 7) % 12, alter: 0 }, repeat: 1, subdivide: 1, elongate: 1, span }));
    return { braid: { kind: 'list', tokens, span }, shift };
}
const WAVE_SYNTAX = syntax('generator', 'sin(n) · saw(n) · tri(n) · square(n)', "One cycle of a waveform in n steps, from −1 to 1, as Strudel's bipolar signals (sine2, saw2, tri2, square2) at each step: a sine from 0, a saw rising from −1, a triangle rising from −1 to 1 at the half and falling back, a square −1 then 1. A waveform, or a slow swell.", ['&sine loop=220 sin(12)', '&ramp loop=220 saw(8)', '&swell map=lin loop=.25 tri(4)', '&pulse loop=110 square(2)'], 'braid.md');
export const GENERATORS = {
    scan: {
        parse: parseScan,
        syntax: syntax('generator', 'scan(i …)', 'Running totals of intervals: a scale or a meter. An interval can repeat (`1!4`), be geometric (`geo(r, n, k …)`: r^(k/n) for each k) or be `free(…)`.', ['&major scan(2 2 1 2 2 2 1)', '&bar scan(27 23 26 24) step=84bpm', '&tempo scan(1!4 .5!2)', '&series scan(geo(5, 25, 0 10 5))', '&swing scan(free(2, 1..3) 1)'], 'braid.md'),
    },
    euclid: {
        parse: parseEuclid,
        syntax: syntax('generator', 'euclid(k, n) · euclid(k, n, shift)', "k hits spread as evenly as they go over n steps (the Euclidean rhythms), turned right by shift steps, as Strudel's (k, n, r).", ['&tresillo euclid(3, 8)', '&clave euclid(5, 16, 2)'], 'braid.md'),
    },
    sin: { parse: parseWave('sin'), syntax: WAVE_SYNTAX },
    saw: { parse: parseWave('saw'), syntax: WAVE_SYNTAX },
    tri: { parse: parseWave('tri'), syntax: WAVE_SYNTAX },
    square: { parse: parseWave('square'), syntax: WAVE_SYNTAX },
    scale: {
        parse: (s, start) => s.fail('scale(…) is read by its cell', start, 5),
        syntax: syntax('generator', 'scale(name) · scale(name, tonic) · scale("tonic:name")', `A scale by name over the 12, turned to its tonic (a note name, a number or free(…); C if left out): the scan of its steps over a key of its own. Its shift= walks its modes; the tonic transposes. The names: ${Object.keys(SCALES).join(' ')}. Strudel's spelling reads the same: scale("D:minor"), its words after colons (scale("F#:harmonic:minor")), with every scale tonal knows (${Object.keys(TONAL_SCALES).length} names: whole:tone, diminished, bebop:major, chromatic …); the octave is the voice's, not the scale's.`, ['&scale scale(minor, D)', '&blues scale(blues)', '&scale scale(dorian, free(2, 0..11))', '&scale scale("F#:harmonic:minor")'], 'tables.md'),
    },
    fifths: {
        parse: (s, start) => s.fail('fifths(…) is read by its cell', start, 6),
        syntax: syntax('generator', 'fifths() · fifths(n) · fifths(note)', 'The circle of fifths: the twelve pitch classes a fifth apart, C G D A E B F# C# Ab Eb Bb F, as written from C; turned n fifths round, or to start on a note (its shift=: [0] is where it starts, [$0] is C). Drawn round its wheel in its own order.', ['&circle fifths()', '&circleG fifths(1)', '&circleG fifths(G)'], 'tables.md'),
    },
    meter: {
        parse: parseMeter,
        syntax: syntax('generator', 'meter("sig") · meter("sig", sub) · meter("levels")', `A bar as levels, one per step: 0 the downbeat, 1 a beat, then finer. A time signature (${Object.keys(SIGNATURES).join(' ')}) with sub steps a pulse, or levels written out (* bar, + beat, - half, . subdivision, , finer). Its bpm counts beats. Each argument can be free(…).`, ['&bar meter("4/4", 2) step=100bpm', '&bar meter("6/8") step=60bpm', '&bar meter("*.+.+..") step=90bpm'], 'time.md'),
    },
    spell: {
        parse: parseSpell,
        syntax: syntax('generator', 'spell("text", &table, "names")', 'A text spelled through a table: each character that is one of the names plays that entry of the table, then a pause; anything else rests as long. The text can be free("…"), a field to type in.', ['&dial spell("867 5309", &keys, "1 2 3 A 4 5 6 B 7 8 9 C * 0 # D")', '&dial spell(free("867 5309"), &keys, "1 2 3 A 4 5 6 B 7 8 9 C * 0 # D")'], 'braid.md'),
    },
};
const RETIRED_GENERATORS = {
    even: (s, start) => {
        const { args, span } = numbers(s, 'even', start);
        const [k, n = 12, phase = 0] = args;
        const steps = k >= 1 && n >= k ? intervals(evenPositions(k, n, phase), n) : null;
        return s.fail(steps
            ? `even(…) is gone: for a scale write scan(${steps.join(' ')}); for a rhythm, euclid(${k}, ${n}${phase ? `, ${phase}` : ''})`
            : 'even(…) is gone: write the intervals, scan(2 2 1 2 2 2 1), or a rhythm, euclid(3, 8)', start, span.len);
    },
    agogic: (s, start) => {
        const { args, span } = numbers(s, 'agogic', start);
        const [n, d] = args;
        const pct = agogicPositions(n, d).map((p) => Math.round((p / 12) * 100));
        return s.fail(`agogic(…) is gone: write the beats as a scan, scan(${intervals(pct, 100).join(' ')})`, start, span.len);
    },
};
export const isGenerator = (word) => word in GENERATORS || word in RETIRED_GENERATORS;
export function parseGenerator(s, name, start) {
    return (GENERATORS[name]?.parse ?? RETIRED_GENERATORS[name])(s, start);
}
