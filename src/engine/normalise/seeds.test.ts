// Seeds (decision 098, #779): a chancy cell written with the seed it draws from, the dice it threw; and a cell that writes one
// draws the same under any edit to what it carries.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { setAttr } from '../edit';
import { grainKeyOf } from '../noise';
import { codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';
import { EXAMPLES } from '../examples';
import { LIBRARY, resolveSeed } from '../../repository/library';

const BASE = [
  '&bar meter("4/4") step=120bpm',
  '&hh s=white',
  '&ticks step=16n &hh:0:.2 &hh:0:.2? &hh:0:.2 &hh:0:.2?.7 &hh:0:.2 &hh:0:.2? &hh:0:.2 &hh:0:.2',
  '&out map=midi(10) [&ticks]',
].join('\n');

const events = (text: string, seconds = 24) => {
  const r = compileSource(text);
  return eventsBetween(plan(r, codeShifts(r), r.off), 0, seconds, true).map((e) => [e.voice, e.at.toFixed(6), e.dur.toFixed(6), e.freq.toFixed(3)].join(':'));
};

describe('seeds', () => {
  it('a cell draws the same under an edit to what no listener hears, seeded or not; an edit to what is heard throws the dice again, unless it writes a seed', () => {
    const seeded = BASE.replace('&ticks step', '&ticks seed=3 step');
    for (const edit of [
      (t: string) => setAttr(t, 'ticks', 'role', 'hat'),
      (t: string) => setAttr(t, 'ticks', 'part', 'drums'),
      (t: string) => setAttr(t, 'ticks', 'label', '"the ticks"'),
    ]) {
      expect(events(edit(seeded))).toEqual(events(seeded));
    }
    // (and since #945 it needs none for what no listener hears: a role, a part, a label are no part of a cell's identity;
    // an edit to what is heard throws the dice again)
    expect(events(setAttr(BASE, 'ticks', 'role', 'hat'))).toEqual(events(BASE));
    expect(events(setAttr(BASE, 'ticks', 'pan', '.3'))).not.toEqual(events(BASE));
  });

  it('a different seed throws the dice again', () => {
    const seeded = BASE.replace('&ticks step', '&ticks seed=3 step');
    const seven = seeded.replace('seed=3', 'seed=7');
    expect(events(seven)).not.toEqual(events(seeded));
    expect(events(seven)).toEqual(events(seven));
  });

  // every chancy cell the examples and the library write: given a role, a part and a label, its dice are thrown the same
  describe('over every example and every fragment of the library', () => {
    const BENCH = '&bar meter("4/4") step=120bpm';
    const seen = (text: string) => {
      const r = compileSource(text, undefined, { resolve: resolveSeed });
      return eventsBetween(plan(r, codeShifts(r), r.off), 0, 40, true)
        .map((e) => [e.voice, e.at.toFixed(6), e.dur.toFixed(6), e.freq.toFixed(3)].join(':'))
        .sort();
    };
    const chancy = (text: string) => {
      const r = compileSource(text, undefined, { resolve: resolveSeed });
      return [...r.cells.values()].filter((c) => !c.implicit && !c.lambda && c.seeded && new RegExp(`^&${c.name}\\b.*\\bseed=`, 'm').test(text)).map((c) => c.name);
    };
    const marked = (text: string, names: readonly string[]) => names.reduce((t, n) => setAttr(setAttr(setAttr(t, n, 'role', 'hat'), n, 'part', 'drums'), n, 'label', '"x"'), text);
    const unseeded = (text: string) => text.replace(/ seed=\d+/g, '');

    it('a role, a part and a label on each chancy cell move no event: 0 of every example, and every fragment', () => {
      let cells = 0;
      for (const [key, e] of Object.entries(EXAMPLES)) {
        const names = chancy(e.source);
        if (!names.length) continue;
        expect(seen(marked(e.source, names)), key).toEqual(seen(e.source));
        cells += names.length;
      }
      for (const f of LIBRARY) {
        const text = `${BENCH}\n${f.text}`;
        const names = chancy(text);
        if (!names.length) continue;
        expect(seen(marked(text, names)), f.id).toEqual(seen(text));
        cells += names.length;
      }
      expect(cells).toBeGreaterThan(10);
    });

    it('shown firing: with the seeds taken off, an edit to what is heard throws the dice again', () => {
      const moved: string[] = [];
      for (const [key, e] of Object.entries(EXAMPLES)) {
        const names = chancy(e.source);
        if (!names.length) continue;
        const plain = unseeded(e.source);
        const heard = names.reduce((t, n) => setAttr(t, n, 'pan', '.3'), plain);
        if (JSON.stringify(seen(heard)) !== JSON.stringify(seen(plain))) moved.push(key);
      }
      expect(moved.length).toBeGreaterThan(3);
    });
  });
});

describe('noise voices (#932, #945)', () => {
  const NOISY = ['&bar meter("4/4") step=120bpm', '&a s=white', '&b s=pink', '&c s=brown', '&hits step=4n &a &b &c', '&out map=sample [&hits]'].join('\n');
  const keys = (text: string, names = ['a', 'b', 'c']) => {
    const r = compileSource(text);
    const key = grainKeyOf(r);
    return Object.fromEntries(names.filter((v) => r.cells.has(v)).map((v) => [v, `${key(v).seed}|${key(v).place}`]));
  };

  it('a voice is thrown from what it is, not from its place: a voice added above, or the lines in another order, move none', () => {
    const before = keys(NOISY);
    expect(keys(NOISY.replace('&a s', '&z s=brown lpf=900\n&a s'))).toEqual(before);
    expect(keys(NOISY.replace('&a s=white\n&b s=pink', '&b s=pink\n&a s=white'))).toEqual(before);
    expect(new Set(Object.values(before)).size).toBe(3);
  });

  it('a renamed voice, or one with a label, a role and a part, starts its noise where it did', () => {
    const before = keys(NOISY);
    expect(Object.values(keys(NOISY.replace(/&a\b/g, '&q'), ['q']))).toEqual([before.a]);
    expect(keys(NOISY.replace('&a s=white', '&a s=white label="x" role=hat part=drums'))).toEqual(before);
  });

  it('no two voices throw alike: voices that are alike take, in turn, the identity hashed with their number', () => {
    const twins = ['&bar meter("4/4") step=120bpm', '&a s=white', '&b s=white', '&c s=white', '&hits step=4n &a &b &c', '&out map=sample [&hits]'].join('\n');
    const k = keys(twins);
    expect(new Set(Object.values(k)).size).toBe(3);
    // (whichever line is which: the same three places, as a set)
    const swapped = keys(twins.replace('&a s=white\n&b s=white\n&c s=white', '&c s=white\n&b s=white\n&a s=white'));
    expect(new Set(Object.values(swapped))).toEqual(new Set(Object.values(k)));
  });

  it('a voice that writes a seed is thrown from it alone, whatever else changes', () => {
    const pinned = NOISY.replace('&a s=white', '&a seed=5 s=white');
    expect(keys(pinned).a).toBe('0|noise#5');
    expect(keys(pinned.replace('&a seed=5 s=white', '&a seed=5 s=white lpf=900')).a).toBe('0|noise#5');
  });
});
