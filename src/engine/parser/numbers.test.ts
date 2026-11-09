import { describe, expect, it } from 'vitest';
import { parse } from './index';
import { NUMBER_PLACES, type NumberPlace } from './numbers';

// Decision 078 (#580): every number may be a free(); a number read while the piece plays may also be a range moved by
// cells. Each place a number is written, with each of the four spellings: a number, free(…), a cell &k, a range moved
// by cells lo..hi * &k — accepted, or refused with an error that names the rule.

const errors = (src: string) => parse(src).diagnostics.filter((d) => d.severity === 'error');
const ok = (src: string) => expect(errors(src), src).toEqual([]);
const refused = (src: string, why: RegExp) => {
  const e = errors(src);
  expect(e.length, src).toBeGreaterThan(0);
  expect(e[0].message, src).toMatch(why);
};

/** Read as the piece is built: a cell there is refused by the rule. */
const BUILT = /read as the piece is built.*decision 078/;
/** Read while it plays, but not (yet) moved by a cell there: refused, naming the rule. */
const NOT_HERE = /isn't read here.*decision 078/;
/** A free() where the number stays as it is. */
const FIXED = /a number, not free\(…\)/;

type Want = 'ok' | RegExp;
/** Each place: its text with X where the number goes, then the number, its free(…), and what a cell and a moving range do. */
const ROWS: Readonly<Record<keyof typeof NUMBER_PLACES, readonly [string, string, string, Want, Want, Want?]>> = {
  param: ['&lead s=saw loop=C4 lpf=X', '1200', 'free(1200, 200..5000)', 'ok', 'ok'],
  level: ['&out play=&tune level=X &tune', '.4', 'free(.4, 0..1)', 'ok', 'ok'],
  slot: ['&env map=adsr attack=X decay=.3 sustain=.5 release=.4', '.01', 'free(.01, 0..1)', 'ok', 'ok'],
  axis: ['&mine map=style sync=X harm=.45 artic=.55 energy=.55', '.3', 'free(.3, 0..1)', 'ok', 'ok'],
  end: ['&lead s=saw loop=C4 lpf=X..2400 * &lfo', '400', 'free(400, 200..800)', /Unexpected '\.'/, /Unexpected '\.'/],
  share: ['&bar meter("4/4") step=90bpm swing=8n:X', '.6', 'free(.6, .5...75)', 'ok', 'ok'],
  depth: ['&bar meter("*.-.+.-.") step=90bpm bend=4n:&rubato:X\n&rubato 27 23 26 24', '.5', 'free(1, -1..2)', 'ok', 'ok'],
  legatoShare: ['&bar meter("4/4") step=90bpm legato=8n:X', '.5', 'free(.5, .25..1)', NOT_HERE, NOT_HERE],
  gain: ['&out [&strings * X]', '.4', 'free(.4, 0..1)', 'ok', NOT_HERE],
  hit: ['&beat step=8 &bd &hh:0:X', '.4', 'free(.4, 0..1)', NOT_HERE, NOT_HERE],
  weight: ['&s style=[&funk * X, &bossa * .2]', '.8', 'free(.8, 0..1)', NOT_HERE, NOT_HERE],
  tonic: ['&key scale(dorian, X)', '2', 'free(2, 0..11)', 'ok', NOT_HERE],
  rate: ['&bar scan(4 4 4 4) step=X', '90bpm', 'free(90bpm, 60..240)', 'ok', NOT_HERE],
  by: ['&fast step=&bar*X 0 2', '2', 'free(2, 1..4)', BUILT, BUILT],
  shift: ['&key step=cycle(&theme) shift=X', '3', 'free(0, 0..11)', BUILT, BUILT],
  stride: ['&key step=cycle(&theme) stride=X', '2', 'free(0, 0..7)', BUILT, BUILT],
  cycle: ['&wheel cycle=X 0 4 7', '1', 'free(1, 0..4)', BUILT, BUILT],
  laps: ['&bar scan(4 4 4 4) step=84bpm laps=X', '30', 'free(30, 1..60)', BUILT, BUILT],
  chance: ['&ghost chance=X step=4 0? 0?', '.7', 'free(.7, 0..1)', BUILT, BUILT],
  seed: ['&ghost seed=X step=4 0? 0?', '7', 'free(7, 0..99)', BUILT, BUILT],
  size: ['&theme size=X step=2 0 2 4', '2', 'free(2, .25..4)', BUILT, BUILT],
  interval: ['&swing scan(X 1) step=120bpm', '2', 'free(2, 1..3)', BUILT, BUILT],
  intervals: ['&map scan(1!X 2)', '4', 'free(4, 1..8)', BUILT, BUILT],
  geo: ['&series scan(geo(X, 25, 0 10 5))', '5', 'free(5, 2..8)', BUILT, BUILT],
  args: ['&hits euclid(X, 8) step=8', '3', 'free(3, 0..8)', BUILT, BUILT],
  fifths: ['&circle fifths(X)', '1', 'free(1, 0..11)', BUILT, BUILT],
  phase: ['&key scale(2, X)', '3', 'free(3, 0..6)', BUILT, BUILT],
  meter: ['&bar meter(X) step=90bpm', '"4/4"', 'free(2, 0..3, "2/4 3/4 4/4 6/8")', BUILT, BUILT],
  grid: ['&edo map=edo(X)', '19', 'free(19, 5..31)', BUILT, BUILT],
  ratio: ['&bp cycle=13 map=ed(X)', '3', 'free(3, 1.5..4)', BUILT, BUILT],
  step: ['&tune step=2 0 X 4', '2', 'free(2, 0..7)', 'ok', NOT_HERE],
  modifier: ['&beat step=4 0!X 2', '4', 'free(4, 1..8)', BUILT, BUILT],
  drop: ['&hats step=4 0 0?X', '.3', 'free(.3, 0..1)', BUILT, BUILT],
  euclidOn: ['&groove step=1 0(X,8)', '3', 'free(3, 0..8)', BUILT, BUILT],
  pick: ['&tune step=2 &motif[X]', '0', 'free(0, 0..3)', BUILT, BUILT],
  turn: ['&canon step=2 &theme[>>X]', '4', 'free(4, 0..7)', BUILT, BUILT],
  move: ['&tune step=2 &motif^X', '1', 'free(1, -7..7)', BUILT, BUILT],
  tier: ['&piece title="Steps" tags="tutorial" tier=X', '1', 'free(1, 1..9)', BUILT, BUILT, FIXED],
  hitNumber: ['&beat step=8 &bd:X', '0', 'free(0, 0..1)', BUILT, BUILT, FIXED],
};

describe('every number may be a free(); a number read while the piece plays may be moved by cells (decision 078)', () => {
  it('has a row for every place in the table', () => {
    expect(Object.keys(ROWS).sort()).toEqual(Object.keys(NUMBER_PLACES).sort());
  });

  for (const [id, [tpl, num, free, cell, range, freeWant = 'ok']] of Object.entries(ROWS)) {
    const place: NumberPlace = NUMBER_PLACES[id as keyof typeof NUMBER_PLACES];
    describe(`${id}: ${place.form}`, () => {
      const at = (x: string) => tpl.replace('X', x);
      const lo = /^-?[.0-9]/.test(num) && !num.endsWith('bpm') ? '0' : '60';
      it('a number', () => ok(at(num)));
      it('free(…)', () => (freeWant === 'ok' ? ok(at(free)) : refused(at(free), freeWant)));
      it('a cell, &k', () => (cell === 'ok' ? ok(at('&k')) : refused(at('&k'), cell)));
      it('a range moved by cells, lo..hi * &k', () => (range === 'ok' ? ok(at(`${lo}..1 * &k`)) : refused(at(`${lo}..1 * &k`), range)));
      it('its example parses, with no errors', () => ok(place.example));
      if (freeWant === 'ok')
        it("free(…)'s slider is the place's", () => {
          const f = parse(at(free)).cells.flatMap((c) => c.frees ?? []);
          expect(f.length).toBe(1);
          expect(f[0].key).toBe(place.key ?? 'param');
          if (!place.key) expect(f[0].param).toBeTruthy();
          expect(!!f[0].whole).toBe(!!place.whole);
        });
    });
  }

  it('a whole place takes a whole free(…), and one within its range', () => {
    refused('&wheel cycle=free(1, 0..4.5) 0 4 7', /cycle=n takes a whole number/);
    // (its value rounded: a slider that moves by less than one still compiles)
    expect(parse('&wheel cycle=free(1.6, 0..4) 0 4 7').cells[0].cycle).toBe(2);
    refused('&wheel cycle=free(1, -2..4) 0 4 7', /cycle=n: free\(…\) moves within 0\.\./);
    refused('&beat step=4 0!free(4, 0..8) 2', /moves within 1\.\.4096/);
    // (read before decision 078, a shift's free(…) is rounded, as it always was)
    ok('&key step=cycle(&theme) shift=free(.4, 0..6)');
  });

  it('a structural free(…) is the number it holds now', () => {
    const c = parse('&wheel cycle=free(3, 0..4) seed=free(7, 0..99) 0 4 7').cells[0];
    expect(c.cycle).toBe(3);
    expect(c.seed).toBe(7);
    const t = parse('&tune step=2 0!free(3, 1..8) &motif[$free(2, 0..3)] &motif^free(-2, -7..7)').cells[0];
    if (t.braid.kind !== 'list') throw new Error();
    expect(t.braid.tokens[0].repeat).toBe(3);
    expect(t.braid.tokens[1].atom).toMatchObject({ kind: 'ref', pick: { kind: 'at', i: 2, abs: true } });
    expect(t.braid.tokens[2].atom).toMatchObject({ kind: 'ref', values: { mul: 1, add: -2 } });
  });

  it('a step left free is a step, and a braid left free stays the whole braid', () => {
    const c = parse('&tune step=2 0 free(2, 0..7) 4').cells[0];
    if (c.braid.kind !== 'list') throw new Error();
    expect(c.braid.tokens.map((t) => t.atom)).toMatchObject([{ value: 0 }, { value: 2 }, { value: 4 }]);
    expect(parse('&riff step=16n free(0 2 4 ~)').cells[0].frees?.[0].key).toBe('braid');
    // (and in order, an envelope's slot)
    ok('&env map=adsr free(.01, 0..1) .3 .5 .4');
  });

  it('a tempo marking is a rate’s, never a count', () => {
    refused('&wheel cycle=free(andante) 0 4 7', /a tempo marking .* for a rate/);
    refused('&key step=cycle(&theme) shift=free(andante)', /a tempo marking .* for a rate/);
    ok('&tempo step=free(andante)');
  });
});
