// A generator's value arguments read from cells (decision 101, after 093): a number, or a text cell, filled as the piece is built.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { parse } from './parser';
import { resolveSeed } from '../repository/library';

const lines = (...xs: string[]) => xs.join('\n');
const BAR = lines('&bar from (&meter) &tempo', '&bar meter(&meter) step=&tempo', '&meter "4/4"');
const resolve = (id: string) => (id === 'bar' ? BAR : resolveSeed(id));
const compiled = (text: string) => compileSource(text, undefined, { resolve });
const errors = (text: string) =>
  compiled(text)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);
const meterOf = (text: string) => {
  const r = compiled(text);
  expect(errors(text)).toEqual([]);
  return r.cells.get('bar')!.meter;
};

describe('a text cell (decision 101)', () => {
  it('is one text in quotes, and plays nothing', () => {
    expect(parse('&meter "3/4"').cells[0]).toMatchObject({ name: 'meter', text: '3/4', braid: { kind: 'blank' } });
    expect(parse('&meter label="its meter" "2+2+3"').cells[0]).toMatchObject({ text: '2+2+3' });
  });

  it('is one text alone: a second, a step or a generator beside it is an error', () => {
    for (const bad of ['&m "3/4" "4/4"', '&m "3/4" 1 2', '&m 1 "3/4"', '&m "3/4" meter("4/4")', '&m meter("4/4") "3/4"', '&m "3/4'])
      expect(parse(bad).diagnostics.filter((d) => d.severity === 'error').length, bad).toBeGreaterThan(0);
  });
});

describe('meter(&x) reads a text cell as its signature', () => {
  const plain = (sig: string) => meterOf(lines('&tempo step=120bpm', `&bar meter(${sig}) step=&tempo`));
  const read = (text: string, step = '') => meterOf(lines('&tempo step=120bpm', `&m "${text}"`, `&bar meter(&m${step}) step=&tempo`));

  it('as meter("…") reads it: a signature, groups as sizes, levels', () => {
    for (const sig of ['4/4', '3/4', '6/8', '12/8', '7/8', '5/4', '2+2+3', '3+3+2', '*.+.', '*.-.+.-.']) expect(read(sig), sig).toEqual(plain(`"${sig}"`));
  });

  it('with a step after it, as meter("…", step) reads it', () => {
    expect(read('2/2', ', 2')).toEqual(plain('"2/2", 2'));
    expect(read('6/8', ', 16n')).toEqual(plain('"6/8", 16n'));
    expect(read('*,.,+,.,', ', 8n')).toEqual(plain('"*,.,+,.,", 8n'));
  });

  it('through a fragment’s parameter: bar(meter="3/4") is the bar meter("3/4") writes, and its default 4/4', () => {
    expect(meterOf(lines('&tempo step=120bpm', '&bar from bar &tempo'))).toEqual(plain('"4/4"'));
    for (const sig of ['3/4', '2+2+3', '*.+.']) expect(meterOf(lines('&tempo step=120bpm', `&bar from bar(meter="${sig}") &tempo`)), sig).toEqual(plain(`"${sig}"`));
    // (and its swing on the head, 065 §4)
    expect(meterOf(lines('&tempo step=120bpm', '&bar swing=8n:2/3 from bar(meter="7/8") &tempo'))).toEqual(
      meterOf(lines('&tempo step=120bpm', '&bar meter("7/8") step=&tempo swing=8n:2/3')),
    );
  });

  it('plays as the meter written: a line tapping it, event for event', () => {
    const line = '&t step=8n 0 2 4 5 7\n&v s=sine loop=C4\n&out [&t * &v]';
    const at = (text: string) => compiled(lines('&tempo step=96bpm', text, line)).ok;
    expect(at('&bar from bar(meter="5/4") &tempo')).toBe(true);
    expect(compiled(lines('&tempo step=96bpm', '&bar from bar(meter="5/4") &tempo', line)).cells.get('t')).toEqual(
      compiled(lines('&tempo step=96bpm', '&bar meter("5/4") step=&tempo', line)).cells.get('t'),
    );
  });

  it('says what is wrong: a cell of the wrong kind, a text that is no signature, a cell that isn’t there', () => {
    expect(errors(lines('&m 3', '&bar meter(&m) step=120bpm'))).toEqual([`&m is read as meter(…)'s text: a text cell, filled as the piece is built (&m "3/4")`]);
    expect(errors(lines('&m "x/y"', '&bar meter(&m) step=120bpm'))[0]).toMatch(/^meter\(&m\), filled as meter\("x\/y"\): meter\("x\/y"\): a time signature/);
    expect(errors(lines('&m "6/8"', '&s 3', '&bar meter(&m, &s) step=120bpm'))).toEqual([]);
    expect(errors(lines('&m "6/8"', '&s "3"', '&bar meter(&m, &s) step=120bpm'))).toEqual([
      `&s is read as meter(…)'s number: a cell that is one number, filled as the piece is built (&s 3)`,
    ]);
    expect(errors('&bar meter(&nope) step=120bpm').join(' ')).toMatch(/nope/);
  });

  it('a text read anywhere else is an error that says where it is read', () => {
    const said = `&m is a text: a generator's argument reads it as the piece is built (meter(&m)), nothing else`;
    expect(errors(lines('&m "3/4"', '&bar meter(&m) step=120bpm', '&t step=4n &m 0'))).toEqual([said]);
    expect(errors(lines('&m "3/4"', '&bar meter(&m) step=120bpm', '&v s=sine loop=C4 lpf=200..900 * &m'))).toEqual([said]);
  });
});

describe('every generator’s value arguments read cells alike (decision 101)', () => {
  const cellOf = (text: string, name = 't') => compiled(lines('&bar meter("4/4") step=120bpm', text)).cells.get(name);
  const same = (withCells: string, written: string) => {
    expect(errors(lines('&bar meter("4/4") step=120bpm', withCells))).toEqual([]);
    expect(cellOf(withCells)!.units).toEqual(cellOf(written)!.units);
  };

  it('euclid’s pulses, steps and shift', () => {
    same(lines('&k 3', '&n 8', '&t step=8n euclid(&k, &n)'), '&t step=8n euclid(3, 8)');
    same(lines('&r 2', '&t step=8n euclid(5, 8, &r)'), '&t step=8n euclid(5, 8, 2)');
  });

  it('a wave’s steps', () => {
    for (const w of ['sin', 'saw', 'tri', 'square']) same(lines('&n 8', `&t step=8n ${w}(&n)`), `&t step=8n ${w}(8)`);
  });

  it('spell’s text and its names; its table is a cell it reads by reference, as before', () => {
    const table = '&keys 0 1 2 3';
    same(lines(table, '&word "1 2 3"', '&t step=8n spell(&word, &keys, "1 2 3")'), lines(table, '&t step=8n spell("1 2 3", &keys, "1 2 3")'));
    same(lines(table, '&names "a b c d"', '&t step=8n spell("abc", &keys, &names)'), lines(table, '&t step=8n spell("abc", &keys, "a b c d")'));
  });

  it('a slider in the cell is its value now, as 093 reads one', () => {
    same(lines('&k free(3, 1..7)', '&t step=8n euclid(&k, 8)'), '&t step=8n euclid(3, 8)');
  });
});

describe('a meter filled from a text cell is its meter to every reader (decision 101)', () => {
  it('a key that reads it as its tonic reads it as it reads meter("…"): no note, its first level a pitch class (#613)', () => {
    const said = (bar: string) => compiled(lines(bar, '&key scale(dorian, &bar)')).diagnostics.map((d) => [d.severity, d.message]);
    expect(said(lines('&m "4/4"', '&bar meter(&m) step=104bpm'))).toEqual(said('&bar meter("4/4") step=104bpm'));
  });
});
