// Seeds (decision 098, #779): a chancy cell written with the seed it draws from, the dice it threw; and a cell that writes one
// draws the same under any edit to what it carries.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { setAttr } from '../edit';
import { codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';
import { soundsIdentical } from '../sameness';
import { normalise } from './index';
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
  it('Normalise writes the seed a chancy cell draws from, and the dice it threw are the same', () => {
    const { source, steps } = normalise(BASE);
    expect(steps.filter((s) => s.includes('seed'))).toHaveLength(1);
    expect(source).toMatch(/^&ticks seed=\d+ step=16n/m);
    expect(events(source)).toEqual(events(BASE));
    expect(soundsIdentical(BASE, source)).toBe(true);
    // (a cell that draws nothing writes none, and a seed written is left as it is)
    expect(normalise(source).source).toBe(source);
    expect(normalise('&bar meter("4/4") step=120bpm\n&k step=4n 0 2').source).not.toMatch(/seed=/);
  });

  it('a cell that writes a seed draws the same under any edit to what it carries; one that writes none draws again', () => {
    const seeded = normalise(BASE).source;
    for (const edit of [
      (t: string) => setAttr(t, 'ticks', 'role', 'hat'),
      (t: string) => setAttr(t, 'ticks', 'part', 'drums'),
      (t: string) => setAttr(t, 'ticks', 'label', '"the ticks"'),
    ]) {
      expect(events(edit(seeded))).toEqual(events(seeded));
    }
    // (shown firing: with no seed, the same edit throws the dice again)
    expect(events(setAttr(BASE, 'ticks', 'role', 'hat'))).not.toEqual(events(BASE));
  });

  it('a different seed throws the dice again', () => {
    const seeded = normalise(BASE).source;
    expect(events(seeded.replace(/seed=\d+/, 'seed=7'))).not.toEqual(events(seeded));
    expect(events(seeded.replace(/seed=\d+/, 'seed=7'))).toEqual(events(seeded.replace(/seed=\d+/, 'seed=7')));
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

    it('shown firing: with the seeds taken off, the same edit throws the dice again', () => {
      const moved: string[] = [];
      for (const [key, e] of Object.entries(EXAMPLES)) {
        const names = chancy(e.source);
        if (!names.length) continue;
        const plain = unseeded(e.source);
        if (JSON.stringify(seen(marked(plain, names))) !== JSON.stringify(seen(plain))) moved.push(key);
      }
      expect(moved.length).toBeGreaterThan(3);
    });
  });
});
