// Recognition (decision 055, #224): each of Jambot's 284 variations on E31's bars, and each of the bass seeds' 44, is
// recognised as its source's, by its operator, at distance 0, against the whole library; random bars of hits are
// recognised as nothing; a recognition on a warmed recogniser compiles only the heard text (its milliseconds:
// `timing.slow.test.ts`).
import { describe, expect, it, vi } from 'vitest';
import e31 from '../../fixtures/jambot-e31.json';
import { PITCHED_OPERATORS, variations } from '../engine/vary';
import { BASS_FRAGMENTS } from './bass';
import { LIBRARY } from './library';
import { createRepository, EMPTY_LAYER } from './fragments';
import { fileFragment } from './learned';
import { createRecogniser, type Recognised } from './recognise';

vi.mock('../engine/compile', async (original) => {
  const actual = await original<typeof import('../engine/compile')>();
  return { ...actual, compileSource: vi.fn(actual.compileSource) };
});

/** E31's drum bars on Jambot's workbench, varied as Jambot varies them (`src/engine/vary/rhythm.test.ts`). */
const kit = (id: string) => LIBRARY.find((f) => f.id === id)!.text;
// (the rhythms leave their voices as holes, #244: the workbench brings the core kit)
const DRUMS = `&bar meter("4/4") step=120bpm\n${kit('core kit')}`;
const DRUM_OPTIONS = { workbench: DRUMS, keep: ['&fill'], fewest: 3 };
const BARS = e31.witnesses.map((w) => ({
  preset: w.preset,
  fragment: w.text
    .split('\n')
    .slice(1)
    .filter((l) => !/^&\w+ s=white$/.test(l))
    .join('\n')
    // (its card is the workbench's: the seed's mix is &groove, #291)
    .replace('&drums map=midi(10) [', '&groove ['),
}));
/** The bass seeds' workbench over I–vi–IV–V (`src/engine/vary/pitched.test.ts`). */
const BASS = `&bar meter("4/4") step=120bpm\n&key scale(major, C)\n&harm over=&key step=1m [0,2,4] [5,7,9] [3,5,7] [4,6,8]\n${kit('bass')}`;

const recogniser = createRecogniser();

describe('a variation is recognised as its source’s, by its operator, at distance 0', () => {
  it('each of the 284 on E31’s eight bars; first for 282, and the other 2 also as the bar they play', () => {
    let n = 0;
    const second: string[] = [];
    for (const b of BARS) {
      const id = LIBRARY.find((f) => f.text === b.fragment)!.id;
      for (const v of variations(b.fragment, DRUM_OPTIONS)) {
        const found = recogniser.recognise(v.apply(b.fragment), LIBRARY, DRUM_OPTIONS);
        const mine = found.find((r) => r.fragment.id === id);
        expect([mine?.path.map((s) => s.by), mine?.distance], `${b.preset}, ${v.by}`).toEqual([[v.by], 0]);
        if (found[0] !== mine) second.push(`${id}, ${v.by}: ${found.map((r) => `${r.fragment.id} ${r.path.length} ${r.distance}`).join('; ')}`);
        n++;
      }
    }
    expect(n).toBe(284);
    // (Lo-fi hip hop's bar and Bossa nova's differ by one hat, and their levels: each one's variation plays the other's notes)
    expect(second).toEqual([
      'Lo-fi hip hop drums, drop &hat 4: Bossa nova drums 0 0; Lo-fi hip hop drums 1 0',
      'Bossa nova drums, add &hat 4: Lo-fi hip hop drums 0 0; Bossa nova drums 1 0',
    ]);
  });

  it('each of the bass seeds’ 44 (24, and the 20 bends and trims, #267)', () => {
    const options = { workbench: BASS, operators: PITCHED_OPERATORS };
    let n = 0;
    for (const f of BASS_FRAGMENTS)
      for (const v of variations(f.text, options)) {
        const [first] = recogniser.recognise(v.apply(f.text), LIBRARY, { workbench: BASS });
        expect([first?.fragment.id, first?.path.map((s) => s.by), first?.distance], `${f.id}, ${v.by}`).toEqual([f.id, [v.by], 0]);
        n++;
      }
    expect(n).toBe(44);
  });

  it('a fragment itself by no operator, and a variation of a variation only at depth 2', () => {
    const funk = LIBRARY.find((f) => f.id === 'Funk drums')!;
    expect(recogniser.recognise(funk.text, LIBRARY, DRUM_OPTIONS).map((r) => [r.fragment.id, r.path.length, r.distance])).toEqual([['Funk drums', 0, 0]]);
    const [rotate] = variations(funk.text, DRUM_OPTIONS);
    const once = rotate!.apply(funk.text);
    const twice = variations(once, DRUM_OPTIONS)
      .find((w) => w.rule === 'drop')!
      .apply(once);
    expect(recogniser.recognise(twice, LIBRARY, DRUM_OPTIONS)).toEqual([]);
    const [deep] = recogniser.recognise(twice, LIBRARY, { ...DRUM_OPTIONS, depth: 2 });
    expect([deep?.fragment.id, deep?.path.map((s) => s.operator), deep?.distance]).toEqual(['Funk drums', ['rotate', 'drop'], 0]);
  });

  it('within a tolerance: a bar two notes from its source is that far, and nothing at tolerance 1', () => {
    const funk = LIBRARY.find((f) => f.id === 'Funk drums')!;
    const drops = variations(funk.text, DRUM_OPTIONS).filter((v) => v.rule === 'drop');
    const twice = variations(drops[0]!.apply(funk.text), DRUM_OPTIONS)
      .find((w) => w.rule === 'drop')!
      .apply(drops[0]!.apply(funk.text));
    const at = (tolerance: number) => recogniser.recognise(twice, [funk], { ...DRUM_OPTIONS, tolerance, depth: 0 }).map((r) => r.distance);
    expect([at(1), at(2)]).toEqual([[], [2]]);
    expect(recogniser.recognise(twice, [funk], { ...DRUM_OPTIONS, tolerance: 1 }).map((r) => [r.path[0]?.operator, r.distance])).toEqual([['drop', 1]]);
  });

  it('throws on a tolerance or a depth out of range', () => {
    expect(() => recogniser.recognise('&a loop=A4', LIBRARY, { tolerance: -1 })).toThrow(/tolerance/);
    expect(() => recogniser.recognise('&a loop=A4', LIBRARY, { depth: 3 as 2 })).toThrow(/depth/);
  });
});

/** A seeded draw in [0, 1) (mulberry32). */
function draws(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A bar of random hits: a kick, a snare and a hat line, each step struck with chance 1/4, on Jambot's card. */
function randomBar(draw: () => number): string {
  const line = (name: string, voice: string) => `&${name} step=16n ${Array.from({ length: 16 }, () => (draw() < 0.25 ? voice : '~')).join(' ')}`;
  return [line('kick', '&bd'), line('backbeat', '&sd'), line('hat', '&hh'), '&drums map=midi(10) [&kick, &backbeat, &hat]'].join('\n');
}

/** What a recognition found, one string each: its id, its path, the bar it was matched from and its distance. */
const found = (rs: readonly Recognised[]) => rs.map((r) => `${r.fragment.id} [${r.path.map((p) => p.by).join('; ')}] bar ${r.bar} at ${r.distance}`);

describe('a pitched voice by its place, a bar of a longer fragment, and the learned layer', () => {
  it('a bass seed and its variation with every name changed are recognised as the seed’s, at distance 0', () => {
    const walking = BASS_FRAGMENTS.find((f) => f.id === 'walking bass')!;
    // (the line is renamed, not its voice: `&bassV` is the bass instrument's name, the hole it fills)
    const renamed = (text: string) => text.replace(/&bass\b/g, '&low');
    expect(found(recogniser.recognise(renamed(walking.text), LIBRARY, { workbench: BASS }))).toEqual(['walking bass [] bar 0 at 0']);
    const [down] = variations(walking.text, { workbench: BASS, operators: PITCHED_OPERATORS });
    expect(found(recogniser.recognise(renamed(down!.apply(walking.text)), LIBRARY, { workbench: BASS }))).toEqual([`walking bass [${down!.by}] bar 0 at 0`]);
  });

  it('a bar of the two-bar bossa nova clave, its second, is recognised as the clave from its bar 1', () => {
    const second = '&clave step=16n ~!4 &claves ~!5 &claves ~!5\n&percussion map=midi(10) [&clave * .5]';
    expect(found(recogniser.recognise(second, LIBRARY, DRUM_OPTIONS))).toEqual(['bossa nova clave [] bar 1 at 0']);
  });

  it('a bar of a vamp, its fifth, is recognised as the vamp to the seventh from its bar 4', () => {
    expect(found(recogniser.recognise('&harm over=&key step=1m [6,8,10]', LIBRARY, { workbench: BASS }))).toEqual(['vamp to the seventh [] bar 4 at 0']);
  });

  it('a groove the band filed and the composer’s variation of it, recognised by the `by` it was filed with', () => {
    const repository = createRepository(LIBRARY);
    const groove = randomBar(draws(7));
    const filed = fileFragment(repository, EMPTY_LAYER, { text: groove, point: { energy: 0.5 }, facet: 'rhythm', source: 'muse', created: '2026-10-21T14:00:00Z' });
    const variation = variations(groove, DRUM_OPTIONS).find((v) => v.rule === 'add')!;
    const varied = fileFragment(repository, filed.layer, {
      text: variation.apply(groove),
      point: { energy: 0.5 },
      facet: 'rhythm',
      source: 'composer',
      created: '2026-10-21T14:01:00Z',
      meta: { varies: filed.id, by: variation.by },
    });
    const library = repository.merge(varied.layer).fragments;
    const by = varied.file!.meta['by'];
    expect(found(recogniser.recognise(variation.apply(groove), library, DRUM_OPTIONS))).toEqual([`${varied.id} [] bar 0 at 0`, `${filed.id} [${String(by)}] bar 0 at 0`]);
    expect(found(recogniser.recognise(groove, library, DRUM_OPTIONS))[0]).toBe(`${filed.id} [] bar 0 at 0`);
  });
});

describe('random bars, and the cost', () => {
  const draw = draws(224);
  const bars = Array.from({ length: 1000 }, () => randomBar(draw));

  it('of 1,000 random bars, at least 99 % are recognised as nothing at tolerance 0', () => {
    const recognised = bars.filter((text) => recogniser.recognise(text, LIBRARY, DRUM_OPTIONS).length > 0).length;
    expect(recognised).toBeLessThanOrEqual(10);
  });

  // The bound, as the work it bounds (#194, as `fit.test.ts` counts it): a recognition on a warmed recogniser compiles
  // the heard text and nothing else, one compile (2 ms on Funk's bar), the library's readings kept. Alone it takes 2.7 ms at
  // p95 (decision 055); a loaded machine moves the milliseconds, so the wall clock is `timing.slow.test.ts`'s (#237).
  it('on a warmed recogniser, a recognition compiles only the heard text: one compile', async () => {
    // (the recogniser loaded afresh, so it compiles through the counted compile: with isolate off, a file that ran earlier
    // in this worker may have loaded Vary with the real one, as `fit.test.ts` says)
    vi.resetModules();
    const compiles = vi.mocked((await import('../engine/compile')).compileSource);
    const warm = (await import('./recognise')).createRecogniser();
    warm.recognise(BARS[0]!.fragment, LIBRARY, DRUM_OPTIONS);
    for (const text of bars.slice(0, 200)) {
      const before = compiles.mock.calls.length;
      warm.recognise(text, LIBRARY, DRUM_OPTIONS);
      expect(compiles.mock.calls.length - before).toBe(1);
    }
  });
});
