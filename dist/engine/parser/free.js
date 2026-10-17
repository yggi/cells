import { UNIT } from "./units.js";
import { syntax } from "./syntax.js";
const TEMPI = {
    largo: [40, 60],
    larghetto: [60, 66],
    adagio: [66, 76],
    andante: [76, 108],
    moderato: [108, 120],
    allegro: [120, 156],
    vivace: [156, 176],
    presto: [168, 200],
};
export const FREE_SYNTAX = [
    syntax('free', 'free(v, lo..hi)', 'A number left to the performer: a slider from lo to hi, starting at v. Wherever a number goes in an attribute (a rate with its units: free(90bpm, 60..240)), in a scan, or as a gain in a mix.', ['&bar scan(4 4 4 4) step=free(90bpm, 60..240)', '&lead s=saw loop=C4 lpf=free(1200, 200..5000)', '&key step=cycle(&theme) shift=free(0, 0..11)'], 'free.md'),
    syntax('free', 'free(marking)', `A rate as a tempo marking, a slider over its range: ${Object.entries(TEMPI)
        .map(([k, [lo, hi]]) => `${k} ${lo}–${hi}`)
        .join(', ')} (bpm).`, ['&bar scan(4 4 4 4) step=free(andante)'], 'free.md'),
    syntax('free', 'free(v, lo..hi, "names")', 'Named choices: the names spread evenly over the range (one per value, or every 2nd …), shown instead of the numbers.', ['&bar meter(free(2, 0..3, "2/4 3/4 4/4 6/8")) step=90bpm'], 'free.md'),
    syntax('free', 'free(0 2 4 ~ …)', "A braid left to the performer: it plays as written until a take recorded from the keys (MIDI in, the computer's, the on-screen ones) is held in its place; Keep writes the take. Only as a cell's whole braid; its length in steps is the frame a take fills. Steps are numbers, rests and chords, held (@n) or repeated (!n).", ['&riff over=&key step=&bar*4 free(0 2 4 ~ 4 2 0 ~)'], 'free.md'),
    syntax('free', 'free("text")', 'A text left to the performer: a field to type in (for spell(…)).', ['&dial spell(free("867 5309"), &keys, "1 2 3 4 5 6 7 8 9 0")'], 'free.md'),
];
export const FREE_BRAID_WHOLE = "free(0 2 4 ~ …), a braid left to the performer, is a cell's whole braid: &riff over=&key free(0 2 4 ~), with nothing else as its braid";
export function parseFree(s, key, units) {
    const start = s.i;
    if (s.match(/free\(/y) === null)
        s.fail('free(…)');
    s.skipSpace();
    if (s.peek() === '"') {
        const q = s.match(/"[^"]*"/y);
        s.skipSpace();
        s.expect(')', `')' to close free("…")`);
        const spec = { key: 'text', value: 0, unit: '', lo: 0, hi: 0, span: s.place(start), text: q.slice(1, -1) };
        s.frees.push(spec);
        return spec;
    }
    if (/(?:~|\[|-?[0-9.]+[#b]*(?:[@!*][0-9]+)?\s+[^\s,])/y.test(s.text.slice(s.i)) || /^-?[0-9.]+[#b]*\)/.test(s.text.slice(s.i)))
        s.fail(FREE_BRAID_WHOLE, start, s.i - start);
    const at = s.i;
    const named = key === 'shift' || key === 'tonic' ? s.noteName() : null;
    if (named !== null && /[0-9]/.test(s.text.slice(at, s.i)))
        s.warn(`free(${s.text.slice(at, s.i)}): a key is a pitch class — the octave is left out: free(${s.text.slice(at, s.i).replace(/-?[0-9]+$/, '')})`, at, s.i - at);
    const word = named === null ? s.match(/[a-z]+/y) : null;
    let value;
    let unit = '';
    let lo;
    let hi;
    let names;
    if (named !== null) {
        value = ((named % 12) + 12) % 12;
        [lo, hi] = [0, 11];
        names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    }
    else if (word !== null) {
        const range = TEMPI[word];
        if (!range || key === 'shift' || key === 'stride' || key === 'gain' || key === 'tonic')
            s.fail(`free(${word}): a tempo marking (${Object.keys(TEMPI).join(', ')}) — for a rate`, start, s.i - start);
        [lo, hi] = range;
        value = Math.round((lo + hi) / 2);
        unit = 'bpm';
    }
    else {
        const n = s.match(/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y);
        if (n === null)
            s.fail('free(default, lo..hi), like free(90bpm, 60..240) or free(.8, 0..1)');
        value = parseFloat(n);
        if (units)
            unit = s.match(UNIT) ?? '';
        s.skipSpace();
        s.expect(',', `',' then the range, like free(${n}${unit}, 60..240)`);
        s.skipSpace();
        const a = s.match(/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y);
        if (s.match(/\.\./y) === null)
            s.fail('a range lo..hi, like 60..240');
        const b = s.match(/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y);
        if (a === null || b === null)
            s.fail('a range lo..hi, like 60..240');
        lo = parseFloat(a);
        hi = parseFloat(b);
        if (!(lo < hi))
            s.fail(`free(…): the range runs low to high (${lo}..${hi})`, start, s.i - start);
        if (value < lo || value > hi)
            s.fail(`free(…): ${value} is outside ${lo}..${hi}`, start, s.i - start);
    }
    s.skipSpace();
    let labels;
    if (s.peek() === ',') {
        s.i++;
        s.skipSpace();
        const q = s.match(/"[^"]*"/y);
        if (q === null)
            s.fail('names for the choices, in quotes: free(0, 0..3, "a b c d")');
        labels = q.slice(1, -1).trim().split(/\s+/).filter(Boolean);
        const gap = labels.length > 1 ? (hi - lo) / (labels.length - 1) : 0;
        if (named !== null) {
            const comma = s.text.lastIndexOf(',', s.i - q.length);
            s.warn(`free(${s.text.slice(at, comma).trim()}, ${q}): a key by name has the twelve pitch names as its choices, so these names are ignored (names of your own go on a range: free(3, 0..11, "…"))`, comma, s.i - comma);
            labels = undefined;
        }
        else if (!Number.isInteger(lo) || !Number.isInteger(hi) || labels.length < 2 || !Number.isInteger(gap) || gap < 1)
            s.fail(`free(…, "${labels.join(' ')}"): the names spread evenly over ${lo}..${hi} — ${labels.length} names need ${labels.length - 1} equal whole steps (${lo}..${lo + labels.length - 1}, or every 2nd: ${lo}..${lo + 2 * (labels.length - 1)})`, start, s.i - start);
        s.skipSpace();
    }
    s.expect(')', `')' to close free(…)`);
    labels ??= names;
    const spec = {
        key,
        value,
        unit,
        lo,
        hi,
        span: s.place(start),
        ...(labels ? { labels } : {}),
        ...(named !== null ? { byName: true } : {}),
    };
    s.frees.push(spec);
    return spec;
}
