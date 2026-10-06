import { describe, expect, test } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { distribute, type Sort } from './algebra';
import { parse } from './parser';

// The mix algebra's laws (docs/decisions/006-mix-algebra.md), checked on what plays: both sides of
// each law, written as mixes, must sound the same — every note's time, voice, pitch, bends, gains
// and levels. Random cases come from a seeded generator, so a failure names its input every run.

const CELLS = `&m step=4
&a step=&m 0 2 4 5 7 4
&vib loop=5 0 .1 -.1
&up 12
&acc map=amp step=&m 1 .5 .8
&swell map=lin loop=.5 .2 1
&fast loop=30 0 .3 0 -.3
&v s=saw
&w s=sine
`;

function sounds(mix: string) {
  const r = compileSource(`${CELLS}&out loop=SAMPLE_RATE map=sample [${mix}]`);
  expect(r.diagnostics.filter((d) => d.severity === 'error'), mix).toEqual([]);
  const n = (x: number) => Math.round(x * 1e9) / 1e9;
  return eventsBetween(plan(r, codeShifts(r)), 0, 3)
    .map((e) =>
      JSON.stringify([n(e.at), n(e.dur), e.voice, n(e.freq), e.gains.map(n), e.bends.map((b) => [n(b.at), n(b.cents), !!b.ramp]), e.levels.map((l) => [n(l.at), n(l.level), !!l.ramp])]),
    )
    .sort();
}
const same = (a: string, b: string) => expect(sounds(b), `${a}  ≡  ${b}`).toEqual(sounds(a));

/** mulberry32 */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = <T>(xs: readonly T[], rnd: () => number) => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
/** A random binary grouping of factors joined by op: a * ((b * c) * d) … */
const group = (xs: readonly string[], op: string, rnd: () => number): string => {
  if (xs.length === 1) return xs[0];
  const k = 1 + Math.floor(rnd() * (xs.length - 1));
  return `(${group(xs.slice(0, k), op, rnd)} ${op} ${group(xs.slice(k), op, rnd)})`;
};
/** A product: the melody, the voice, and some of the rest (pitches, volumes, numbers). */
const factors = (rnd: () => number) => ['&a', rnd() < 0.5 ? '&v' : '&w', ...['&vib', '&up', '(&vib + 7)', '&acc', '&swell', '.5', '2'].filter(() => rnd() < 0.5)];

const CASES = 40;

describe('the laws of the mix', () => {
  test('a * b = b * a: the voice is the factor that is a sound, wherever it is written', () => {
    const rnd = random(1);
    for (let i = 0; i < CASES; i++) {
      const f = factors(rnd);
      same(f.join(' * '), shuffle(f, rnd).join(' * '));
    }
  });

  test('(a * b) * c = a * (b * c), however grouped', () => {
    const rnd = random(2);
    for (let i = 0; i < CASES; i++) {
      const f = shuffle(factors(rnd), rnd);
      same(f.join(' * '), group(f, '*', rnd));
    }
  });

  test('a + b = b + a and (a + b) + c = a + (b + c): pitches add, sounds mix', () => {
    const rnd = random(3);
    for (let i = 0; i < CASES; i++) {
      const p = ['&a', ...['&vib', '&up', '12', '-5', '&swell'].filter(() => rnd() < 0.5)];
      same(`(${p.join(' + ')}) * &v`, `${group(shuffle(p, rnd), '+', rnd)} * &v`);
    }
    same('&a * &v + (&a + 7) * &w', '(&a + 7) * &w + &a * &v');
    same('&a * &v + (&a + 7) * &w', '&a * &v, (&a + 7) * &w');
  });

  test('x * (s + t) = x * s + x * t: a pitch or a volume acting on a mix acts on each voice', () => {
    const rnd = random(4);
    for (let i = 0; i < CASES; i++) {
      const x = group(shuffle(['&a', ...['&vib', '&up', '&acc', '.5', '3'].filter(() => rnd() < 0.5)], rnd), '*', rnd);
      same(`${x} * (&v + &w)`, `${x} * &v + ${x} * &w`);
      same(`(&v + &w) * ${x}`, `${x} * &v, &w * ${x}`);
    }
  });

  test('(p + q) * s = p * (q * s) = (p * q) * s for pitches: transposing twice adds', () => {
    for (const [p, q] of [['&a', '&up'], ['&a', '&vib'], ['&a', '(&up + 7)'], ['(&a + 7)', '&vib']]) {
      same(`(${p} + ${q}) * &v`, `${p} * (${q} * &v)`);
      same(`(${p} + ${q}) * &v`, `(${p} * ${q}) * &v`);
    }
  });

  test('a braid at audio rate with no sound of its own: a pitch beside a sound (FM), the sound alone', () => {
    same('(&a + &fast) * &v', '&a * &fast * &v');
    same('(&a + &fast) * &v', '&v * (&fast * &a)');
    same('(&a + &fast) * &v', '&a * (&fast * &v)');
    same('&a * &fast', '&fast * &a'); // alone, it is the voice (a waveform)
    expect(sounds('&a * &fast').every((n) => JSON.parse(n)[2] === 'fast')).toBe(true);
  });

  test('a number takes its operator’s sort: semitones in a sum, a gain in a product', () => {
    same('12 * &a * &v', '&a * &v * 12');
    same('(&a * 12) * &v', '&a * (12 * &v)');
    expect(sounds('(&a + 12) * &v')).not.toEqual(sounds('&a * (12 * &v)')); // an octave up, against twelve times louder
    same('(&a + 12) * &v', '(&a + &up) * &v');
    same('(&a + 2 * 3) * &v', '(&a + 6) * &v'); // numbers among themselves: plain arithmetic
    same('&a * 2 * 3 * &v', '&a * 6 * &v');
    // a map=lin cell likewise: a volume in a product, a pitch in a sum
    same('&a * &swell * &v', '&swell * (&a * &v)');
  });
});

describe('the sorts refuse what has no meaning', () => {
  const SORTS: Record<string, Sort> = { v: 'signal', w: 'signal', a: 'pitch', b: 'pitch', acc: 'volume', swell: 'plain' };
  const msg = (mix: string) => {
    const a = parse(`&m [${mix}]`).cells[0].braid;
    const atom = a.kind === 'list' ? a.tokens[0].atom : null;
    if (atom?.kind !== 'mix') throw new Error('not a mix');
    try {
      atom.exprs.forEach((e) => distribute(e, (n) => SORTS[n] ?? 'pitch'));
      return '';
    } catch (x) {
      return (x as Error).message;
    }
  };
  test.each([
    ['two sounds multiplied', '&a * &v * &w', /Two sounds can't multiply \(&v \* &w\): mix them with \+ or ,/],
    ['a sound subtracted', '&a * &v - &a * &w', /no subtracting a voice/],
    ['a pitch added to a sound', '&a * &v + &b', /can't be added to a sound/],
    ['a volume added', '(&a + &acc) * &v', /&acc is a volume: it multiplies, it can't be added/],
    ['a gain in a pitch sum', '(&a + 2 * &b) * &v', /A gain inside a pitch sum/],
    ['no voice', '&a * &b * 2', /&a \* &b has no voice/],
    ['a number alone', '&a * &v, 12', /A number is a gain or a pitch: it needs a voice/],
  ])('%s', (_, mix, message) => {
    expect(msg(mix)).toMatch(message);
  });
});
