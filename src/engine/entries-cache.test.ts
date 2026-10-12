import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { entries, lookup } from './helix';
import { cellView } from '../layout/cellview';
import { setAttr } from './edit';
import { PRESETS } from './presets';
import { effectiveShow } from '../layout/show';

// entries() is memoised per compiled program (issue #41): the answers must always be the ones a fresh
// computation gives, whatever was asked before, in which order, on which program.
const SRC = '&scale 0 2 3 5 7 8 10\n&theme over=scale [0, 2, 4, 6]';
const fresh = (name: string, shift: number) => entries(compileSource(SRC), name, shift);

describe('entries cache', () => {
  it('gives what a fresh computation gives, for every shift, in any order, asked twice', () => {
    const r = compileSource(SRC);
    const shifts = [0, 3, -1, 7, 14, 1, 0, 2, -9, 3];
    for (const k of shifts) expect(entries(r, 'scale', k), `shift ${k}`).toEqual(fresh('scale', k));
    for (const k of [...shifts].reverse()) expect(entries(r, 'scale', k), `again ${k}`).toEqual(fresh('scale', k));
  });

  it('a different shift is a different answer (the shift is part of the key)', () => {
    const r = compileSource(SRC);
    expect(entries(r, 'scale', 0).map((e) => e.value)).toEqual([0, 2, 3, 5, 7, 8, 10]);
    expect(entries(r, 'scale', 1).map((e) => e.value)).toEqual([2, 3, 5, 7, 8, 10, 12]);
    expect(entries(r, 'scale', 0).map((e) => e.value)).toEqual([0, 2, 3, 5, 7, 8, 10]);
  });

  it('programs do not share answers, even with the same names and shifts', () => {
    const a = compileSource('&t 0 2 4');
    const b = compileSource('&t 1 3 5 6');
    expect(entries(a, 't', 0).map((e) => e.value)).toEqual([0, 2, 4]);
    expect(entries(b, 't', 0).map((e) => e.value)).toEqual([1, 3, 5, 6]);
    // an edit is a new compile: the old answer is not served for it
    const edited = compileSource('&t 0 2 4 5');
    expect(entries(edited, 't', 0).map((e) => e.value)).toEqual([0, 2, 4, 5]);
    expect(entries(a, 't', 0).map((e) => e.value)).toEqual([0, 2, 4]);
  });

  it('stays right past its size limit (old answers are dropped, never wrong ones kept)', () => {
    const r = compileSource(SRC);
    for (let k = -400; k < 400; k++) expect(entries(r, 'scale', k).length).toBe(7);
    for (const k of [-400, -399, 0, 5, 399, -17]) expect(entries(r, 'scale', k)).toEqual(fresh('scale', k));
  });

  it('lookup (which reads it per note) follows the shifts it is given', () => {
    const r = compileSource(SRC);
    const at = (shift: number, x: number) => lookup(r, 'scale', x, (n) => (n === 'scale' ? shift : 0)).value;
    // entry x of the table turned by `shift`, climbing a lap (12) past the 7 entries
    expect([at(0, 2), at(1, 2), at(0, 2), at(2, 6), at(0, 6), at(0, 8), at(1, 8)]).toEqual([3, 5, 3, 14, 10, 14, 15]);
  });
});

describe('effectiveShow cache', () => {
  it('follows the program: the same cell name with another show= answers differently', () => {
    const a = compileSource(setAttr(PRESETS.twinkle.source, 'tune', 'show', 'do'));
    const b = compileSource(setAttr(PRESETS.twinkle.source, 'tune', 'show', 'notes'));
    expect(effectiveShow(a, 'up').show).toBe('do');
    expect(effectiveShow(b, 'up').show).toBe('notes');
    expect(effectiveShow(a, 'up').show).toBe('do');
  });
});

describe('cellView on caches', () => {
  it('draws a cell the same warm (caches filled, other shifts asked in between) as on a fresh compile', () => {
    const src = readFileSync('examples/bwv847.cells', 'utf8');
    const r = compileSource(src);
    const base = codeShifts(r);
    const at = (k: number) => (n: string) => base(n) + (n.length % 2 ? k : 0);
    const names = ['lh', 'lhFigure', 'rh', 'subject', 'alto4', 'tempo'].filter((n) => r.cells.has(n));
    expect(names.length).toBe(6);
    for (const k of [0, 5, 0, 11, 5]) for (const n of names) cellView(r, n, at(k), false); // warm, in a mixed order
    for (const k of [5, 0, 11])
      for (const n of names) {
        const cold = compileSource(src);
        expect(cellView(r, n, at(k), false), `${n} at ${k}`).toEqual(cellView(cold, n, at(k), false));
      }
  });
});
