// A number read from a cell as the piece is built (decision 105, after 093 and 101): `seed=&s`, `cycle=&n`, one reader of
// a cell's value and one phase that fills every attribute that reads one, so a place reads a cell exactly as it reads the
// number written.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { parse } from './parser';
import { NUMBER_PLACES } from './parser/numbers';
import { soundsIdentical } from './sameness';
import { constantOf } from './valuesum';
import { writtenGraph } from './graph';
import { eventsBetween, plan } from './realize';
import { codeShifts } from './program';

const lines = (...xs: string[]) => xs.join('\n');
const piece = (attr: string, ...defs: string[]) =>
  lines('&bar meter("4/4") step=100bpm', '&v s=saw loop=C4', ...defs, `&t ${attr} step=4 0? 1? 2? 3? 4? 5? 6? 7?`, '&out map=sample [&t * &v]');
const errors = (text: string) =>
  compileSource(text)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);
const notes = (text: string) => eventsBetween(plan(compileSource(text), codeShifts(compileSource(text))), 0, 6).map((e) => `${e.voice}@${e.at.toFixed(3)}:${Math.round(e.freq)}`);

/** Every place that fills a cell, as the attribute it sets, a literal for it and a cell that holds the same. */
const PLACES: readonly (readonly [string, string, string, string[]])[] = [
  ['seed', 'seed=7', 'seed=&k', ['&k 7']],
  ['shift', 'shift=2', 'shift=&k', ['&k 2']],
  ['stride', 'stride=2', 'stride=&k', ['&k 2']],
  ['cycle', 'cycle=2', 'cycle=&k', ['&k 2']],
  ['laps', 'laps=2', 'laps=&k', ['&k 2']],
  ['chance', 'chance=.3', 'chance=&k', ['&k .3']],
  ['size', 'size=2', 'size=&k', ['&k 2']],
];

describe('the places that fill a cell are the table’s', () => {
  it('seven attributes and ten braid, rate and table places, each with the number it holds until compile fills it', () => {
    const filling = Object.values(NUMBER_PLACES).flatMap((p) => (p.fills ? [p.fills.read] : []));
    expect(filling.filter((r) => r.endsWith('=')).sort()).toEqual(PLACES.map((p) => `${p[0]}=`).sort());
    expect(filling).toHaveLength(17);
  });
});

describe.each(PLACES)('%s= reads a cell as it reads the number (decision 105)', (_, literal, cell, defs) => {
  it('plays what the number plays: S1, and the same events', () => {
    expect(errors(piece(cell, ...defs))).toEqual([]);
    expect(soundsIdentical(piece(literal), piece(cell, ...defs), 6)).toBe(true);
    expect(notes(piece(cell, ...defs))).toEqual(notes(piece(literal)));
  });

  it('is a hole the scanner records, and the line holds its placeholder until compile fills it', () => {
    const d = parse(piece(cell, ...defs)).cells.find((c) => c.name === 't')!;
    expect(d.built!.holes).toHaveLength(1);
    expect(d.built!.holes[0]).toMatchObject({ ref: { name: 'k' } });
    expect(d.built!.text.slice(d.built!.holes[0]!.from, d.built!.holes[0]!.to)).toBe('&k');
  });
});

/** A cell as the compile resolves it, its spans out (a place's text is a different length, written as a cell or a number). */
const resolved = (text: string, name: string) =>
  JSON.stringify(compileSource(text).cells.get(name), (k, v) => (k === 'span' || k === 'paramSpans' || k === 'spans' || k === 'valueReads' ? undefined : v));

/** The braid's, rate's and table's places (decision 106): a literal, the same read from a cell, the cells it needs, and what is compared. */
const BRAID: readonly (readonly [string, string, string, string[], string])[] = [
  ['x!n', '&t step=4 0!3 2', '&t step=4 0!&k 2', ['&k 3'], 'play'],
  ['x@n', '&t step=4 0@3 2', '&t step=4 0@&k 2', ['&k 3'], 'play'],
  ['x*n', '&t step=4 0*2 2', '&t step=4 0*&k 2', ['&k 2'], 'play'],
  ['x/n', '&t step=4 0/2 2', '&t step=4 0/&k 2', ['&k 2'], 'play'],
  ['x?p', '&t seed=3 step=4 0?.4 2?.4 4 5', '&t seed=3 step=4 0?&k 2?&k 4 5', ['&k .4'], 'play'],
  ['x(k, n, r)', '&t step=1 0(3,8)', '&t step=1 0(&k,8)', ['&k 3'], 'play'],
  ['x(k, n, r), k over n', '&t step=1 0(3,8)', '&t step=1 0(3,&k)', ['&k 8'], 'play'],
  ['a pick', '&t step=2 &m[2] &m[1]', '&t step=2 &m[&k] &m[1]', ['&m 0 2 4 7', '&k 2'], 'play'],
  ['a turn', '&t step=2 &m[<<2] &m[1]', '&t step=2 &m[<<&k] &m[1]', ['&m 0 2 4 7', '&k 2'], 'play'],
  ['a move', '&t step=2 &m^2 &m[1]', '&t step=2 &m^&k &m[1]', ['&m 0 2 4 7', '&k 2'], 'play'],
  ['degree(&m, n)', '&t step=2 degree(&m, 2) &m[1]', '&t step=2 degree(&m, &k) &m[1]', ['&m 0 2 4 7', '&k 2'], 'play'],
  ['step=&clock*n', '&t step=&clock*2 0 2', '&t step=&clock*&k 0 2', ['&clock step=4n 0', '&k 2'], 'play'],
  ['step=&clock/n', '&t step=&clock/2 0 2', '&t step=&clock/&k 0 2', ['&clock step=4n 0', '&k 2'], 'play'],
  ['fifths(n)', '&c fifths(3)', '&c fifths(&k)', ['&k 3'], 'c'],
  ['map=edo(n)', '&e map=edo(19)', '&e map=edo(&k)', ['&k 19'], 'e'],
  ['map=ed(n, r)', '&e map=ed(13, 3)', '&e map=ed(13, &k)', ['&k 3'], 'e'],
];

describe.each(BRAID)('%s reads a cell as it reads the number (decision 106)', (_, literal, cell, defs, what) => {
  const whole = (line: string, ...more: string[]) => lines('&bar meter("4/4") step=100bpm', '&v s=saw loop=C4', ...more, line, '&out map=sample [&t * &v]');
  const full = (line: string, ...more: string[]) => (what === 'play' ? whole(line, ...more) : lines('&bar meter("4/4") step=100bpm', ...more, line));
  it('plays what the number plays', () => {
    expect(errors(full(cell, ...defs))).toEqual([]);
    if (what === 'play') {
      expect(soundsIdentical(full(literal, ...defs.filter((d) => !d.startsWith('&k '))), full(cell, ...defs), 6)).toBe(true);
      expect(notes(full(cell, ...defs))).toEqual(notes(full(literal, ...defs.filter((d) => !d.startsWith('&k ')))));
    } else expect(resolved(full(cell, ...defs), what)).toEqual(resolved(full(literal), what));
  });
});

describe('a place refuses what it can’t take, said where the line is read again', () => {
  const t = (line: string, ...defs: string[]) => lines('&bar meter("4/4") step=100bpm', '&v s=saw loop=C4', ...defs, line, '&out map=sample [&t * &v]');
  it('a count of 0, a probability above 1, a k over its n: the reason, the line as filled', () => {
    expect(errors(t('&t step=4 0!&k 2', '&k 0'))).toEqual(['&k is read as a count: it takes 1 to 4096, not 0 (x!n · x@n · x*n · x/n)']);
    expect(errors(t('&t step=4 0?&k 2', '&k 2'))).toEqual(['&k is read as x?p: it takes 0 to 1, not 2 (x?p)']);
    expect(errors(t('&t step=1 0(&k,8)', '&k 9'))[0]).toMatch(/^&t step=1 0\(&k,8\), filled as &t step=1 0\(9,8\): /);
  });

  it('a cell that is a table or a sound is no number, in a braid as in an attribute', () => {
    expect(errors(t('&t step=4 0!&k 2', '&k 1 2'))).toEqual(['&k is read as a count: a cell that is one number, filled as the piece is built (&k 3)']);
  });

  it('where the first reading fails on the placeholder alone, the line is read again with the number, k over n', () => {
    expect(errors(t('&t step=1 0(3,&k)', '&k 8'))).toEqual([]);
    expect(errors(t('&t step=1 0(3,&k)', '&k 2'))[0]).toMatch(/filled as &t step=1 0\(3,2\)/);
  });

  it('spans stay where the line was written: a free() after a cell read as built points at its own text', () => {
    const text = lines('&k 3', '&t seed=&k step=free(4, 1..8) 0 2');
    const d = compileSource(text);
    const free = d.cells.get('t')!.frees![0]!;
    expect(text.split('\n')[1]!.slice(free.span.col - 1, free.span.col - 1 + free.span.len)).toBe('free(4, 1..8)');
  });
});

describe('a cell is one number, or a sum of numbers alone, generated through cells', () => {
  it('reads a sum: [&seed + 1] with &seed 7 is 8, a chain of them too', () => {
    const decls = new Map(parse(lines('&a 7', '&b [&a + 1]', '&c [&b + 1]', '&d [&a * 2 + &b]')).cells.map((c) => [c.name, c]));
    expect([...'abcd'].map((n) => constantOf(decls, n))).toEqual([7, 8, 9, 22]);
  });

  it('plays the sum’s value, as the number it names', () => {
    const generated = piece('seed=&c', '&a 7', '&b [&a + 1]', '&c [&b + 1]');
    expect(errors(generated)).toEqual([]);
    expect(notes(generated)).toEqual(notes(piece('seed=9')));
    expect(notes(generated)).not.toEqual(notes(piece('seed=7')));
  });

  it('reads a slider’s value, and the slider stays the cell’s', () => {
    expect(errors(piece('seed=&k', '&k free(7, 0..99)'))).toEqual([]);
    expect(notes(piece('seed=&k', '&k free(7, 0..99)'))).toEqual(notes(piece('seed=7')));
  });

  it('is nothing else: a table, a stepped cell, a sound, a cell in a cycle', () => {
    const decls = new Map(parse(lines('&t 1 2', '&s step=1m 1 2', '&v s=saw loop=C4', '&x [&y + 1]', '&y [&x + 1]', '&n 5')).cells.map((c) => [c.name, c]));
    expect(['t', 's', 'v', 'x', 'y', 'n', 'missing'].map((n) => constantOf(decls, n))).toEqual([null, null, null, null, null, 5, null]);
  });
});

describe('what it says where it can’t read one', () => {
  it('an unknown cell is said as any unknown is, once', () => {
    expect(errors(piece('seed=&nope'))).toEqual(['Unknown cell &nope']);
  });

  it('a cell that is no number, or a stepped one, names the place and what is read', () => {
    expect(errors(piece('seed=&k', '&k 1 2'))).toEqual(['&k is read as seed=: a cell that is one number, filled as the piece is built (&k 3)']);
    expect(errors(piece('seed=&k', '&k step=1m 1 2'))).toEqual(['&k is read as seed=: a stepped one is not yet a form; write one number (&k 3)']);
  });

  it('a value the place doesn’t take names the place’s limit', () => {
    expect(errors(piece('seed=&k', '&k .5'))).toEqual(['&k is read as seed=: it takes a whole number, not 0.5 (seed=n)']);
    expect(errors(piece('chance=&k', '&k 2'))).toEqual(['&k is read as chance=: it takes 0 to 1, not 2 (chance=p)']);
    expect(errors(piece('laps=&k', '&k 0'))).toEqual(['&k is read as laps=: it takes 1 to any, not 0 (laps=n)']);
    expect(errors(piece('size=&k', '&k 9'))).toEqual(['&k is read as size=: it takes 0.25 to 4, not 9 (size=x)']);
  });

  it('a range moved by cells is still refused where the number is read as the piece is built', () => {
    expect(errors(piece('seed=1..3 * &k', '&k 1')).length).toBeGreaterThan(0);
  });
});

describe('a template with chance can be taken twice with independent dice (#930)', () => {
  // (a part that draws, its seed an argument: the module `wander` is one, #576)
  const TICKS = lines('&ticks from (&seed)', '&ticks seed=&seed step=8n [0|1|2|3|4]!16', '&seed 1');
  const resolve = (id: string) => (id === 'ticks' ? TICKS : null);
  const twice = (a: string, b: string) =>
    lines(
      '&bar meter("4/4") step=100bpm',
      '&va s=saw loop=C4',
      '&vb s=saw loop=C5',
      '&a from ticks(seed=&sa)',
      '&b from ticks(seed=&sb)',
      a,
      b,
      '&out map=sample [&a * &va, &b * &vb]',
    );
  /** The semitones above its voice's C that each copy plays, in order. */
  const heard = (text: string) => {
    const r = compileSource(text, undefined, { resolve });
    expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([]);
    const events = eventsBetween(plan(r, codeShifts(r)), 0, 6);
    const of = (voice: string, c: number) => events.filter((e) => e.voice === voice).map((e) => Math.round(12 * Math.log2(e.freq / c)) + 0);
    return { a: of('va', 261.63), b: of('vb', 523.25) };
  };

  it('two copies with different seeds draw apart, with the same seed alike', () => {
    const apart = heard(twice('&sa 3', '&sb 4'));
    expect(apart.a.length).toBeGreaterThan(4);
    expect(apart.a).not.toEqual(apart.b);
    const alike = heard(twice('&sa 3', '&sb 3'));
    expect(alike.a).toEqual(alike.b);
  });

  it('a seed the copy is not given is the template’s own, as before', () => {
    const text = lines('&bar meter("4/4") step=100bpm', '&va s=saw loop=C4', '&a from ticks', '&out map=sample [&a * &va]');
    const r = compileSource(text, undefined, { resolve });
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(eventsBetween(plan(r, codeShifts(r)), 0, 4).length).toBeGreaterThan(0);
  });
});

describe('the written graph draws the cell a place reads', () => {
  it('a wire from the cell to the line that reads it as the piece is built', () => {
    const r = compileSource(piece('seed=&k', '&k 7'));
    const edges = writtenGraph(r, { card: true }).edges;
    expect(edges.some((e) => e.from === 'cell:k' && e.to === 'cell:t')).toBe(true);
  });
});
