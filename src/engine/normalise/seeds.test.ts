// Seeds (decision 098, #779): a chancy cell written with the seed it draws from, the dice it threw; and a cell that writes one
// draws the same under any edit to what it carries.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { setAttr } from '../edit';
import { grainKeyOf, noisePlaces } from '../noise';
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
    expect(steps.filter((s) => s.includes('thrown from what it carries'))).toHaveLength(1);
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
    expect(events(seeded.replace(/&ticks seed=\d+/, '&ticks seed=7'))).not.toEqual(events(seeded));
    expect(events(seeded.replace(/&ticks seed=\d+/, '&ticks seed=7'))).toEqual(events(seeded.replace(/&ticks seed=\d+/, '&ticks seed=7')));
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

describe('noise voices (#932)', () => {
  const NOISY = ['&bar meter("4/4") step=120bpm', '&a s=white', '&b s=pink', '&c s=brown', '&hits step=4n &a &b &c', '&out map=sample [&hits]'].join('\n');
  const keys = (text: string) => {
    const r = compileSource(text);
    const key = grainKeyOf(r);
    return Object.fromEntries(['a', 'b', 'c'].filter((v) => r.cells.has(v)).map((v) => [v, key(v)]));
  };

  it('Normalise writes each noise voice the seed its place was, so its grains are the very ones thrown before', () => {
    const { source, steps } = normalise(NOISY);
    expect(steps.filter((s) => s.includes('noise'))).toHaveLength(3);
    expect(source).toMatch(/^&a seed=0 s=white/m);
    expect(source).toMatch(/^&b seed=1 s=pink/m);
    expect(source).toMatch(/^&c seed=2 s=brown/m);
    // (the key a render throws from, per voice: 0 moved)
    expect(Object.fromEntries(Object.entries(keys(source)).map(([v, k]) => [v, `${k.seed}|${k.place}`]))).toEqual(
      Object.fromEntries(Object.entries(keys(NOISY)).map(([v, k]) => [v, `${k.seed}|${k.place}`])),
    );
    expect(normalise(source).source).toBe(source);
  });

  it('an edit that adds a noise voice above the others moves no grain of the voices that wrote their seed, and moves the others', () => {
    const seeded = normalise(NOISY).source;
    const add = (t: string) => t.replace('&a s', '&z s=white\n&a s');
    const moved = (text: string) => {
      const before = keys(text);
      const after = keys(add(text));
      return Object.keys(before).filter((v) => JSON.stringify(before[v]) !== JSON.stringify(after[v]));
    };
    expect(moved(seeded)).toEqual([]);
    // (shown firing: with the seeds taken off, each place is shifted by one)
    expect(moved(NOISY)).toEqual(['a', 'b', 'c']);
  });

  it('no two noise voices throw alike: a voice added above one that wrote its own number takes a number no voice uses', () => {
    const seeded = normalise(NOISY).source;
    const added = normalise(seeded.replace('&a seed=0 s', '&z s=white\n&a seed=0 s')).source;
    const r = compileSource(added);
    const key = grainKeyOf(r);
    const strings = ['z', 'a', 'b', 'c'].map((v) => `${key(v).seed}|${key(v).place}`);
    expect(new Set(strings).size).toBe(4);
    expect(added).toMatch(/^&z seed=(\d+) s=white/m);
    // (z's place is 0, which a already writes: it takes the first number past the voices, 4)
    expect(/^&z seed=(\d+)/m.exec(added)![1]).toBe('4');
  });

  it('over every example, normalising leaves every noise voice throwing from the key it threw from (0 of 40 examples with a noise voice move), and writes no two the same', () => {
    let voices = 0;
    let examples = 0;
    for (const [key, e] of Object.entries(EXAMPLES)) {
      const r = compileSource(e.source, undefined, { resolve: resolveSeed });
      const places = noisePlaces(r);
      if (!places.size) continue;
      examples++;
      const grain = grainKeyOf(r);
      const written = [...places.keys()].filter((v) => r.cells.get(v)!.seeded).map((v) => r.cells.get(v)!.seed);
      expect(new Set(written).size, key).toBe(written.length);
      // (a voice that writes its seed throws from its place's number: the key the unseeded text throws from)
      for (const [v, place] of places) {
        const c = r.cells.get(v)!;
        if (c.seeded) {
          expect(grain(v), `${key} &${v}`).toEqual({ seed: 0, place: `noise#${c.seed}` });
          voices++;
        } else expect(grain(v), `${key} &${v}`).toEqual({ seed: 0, place });
      }
    }
    expect(examples).toBe(40);
    expect(voices).toBeGreaterThan(40);
  });
});
