// The repository's wall-clock ceilings, out of the quick tier (#237, #242): a loaded machine moves the milliseconds, so the
// quick tests bound the work instead (the compiles a recognition or a fitting query makes), and these ceilings run in
// `npm run test:all`, on a machine quiet enough to read them.
import { describe, expect, it } from 'vitest';
import e31 from '../../fixtures/jambot-e31.json';
import { setTiming } from '../engine/edit';
import { createRepository, EMPTY_LAYER, type StylePoint } from './fragments';
import { unionOf } from './fit';
import { useFragments } from './learned';
import { LIBRARY } from './library';
import { METER_FRAGMENTS } from './meters';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';
import { createRecogniser } from './recognise';
import { RHYTHM_FRAGMENTS } from './rhythms';

/** A seeded draw in [0, 1) (mulberry32), as `recognise.test.ts` draws. */
function draws(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A bar of random hits, as `recognise.test.ts` makes them: a kick, a snare and a hat line, each step struck with chance 1/4. */
function randomBar(draw: () => number): string {
  const line = (name: string, voice: string) => `&${name} step=16n ${Array.from({ length: 16 }, () => (draw() < 0.25 ? voice : '~')).join(' ')}`;
  return [line('kick', '&bd'), line('backbeat', '&sd'), line('hat', '&hh'), '&drums map=midi(10) [&kick, &backbeat, &hat]', '&bd s=white', '&sd s=white', '&hh s=white'].join('\n');
}

const DRUM_OPTIONS = { workbench: '&bar meter("4/4") step=120bpm', keep: ['&fill'], fewest: 3 };

describe('what recognition costs', () => {
  // (decision 055: 2.7 ms at p95 alone; 25 ms is the gross witness the quick tier kept, until load 8 made it 38 ms)
  it('a recognition on a warmed recogniser takes under 25 ms at p95', () => {
    const draw = draws(224);
    const bars = Array.from({ length: 1000 }, () => randomBar(draw));
    const warm = createRecogniser();
    warm.recognise(e31.witnesses[0]!.text.split('\n').slice(1).join('\n'), LIBRARY, DRUM_OPTIONS);
    const times: number[] = [];
    for (const text of bars.slice(0, 200)) {
      const t0 = performance.now();
      warm.recognise(text, LIBRARY, DRUM_OPTIONS);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    expect(times[Math.floor(0.95 * times.length)]!).toBeLessThan(25);
  });
});

describe('what a query costs', () => {
  // (as yggi/jambot#375 timed its query: 20,000 of them, each over every fragment, here with a facet and two fragments chosen)
  it('a query over the library costs under 1 ms', () => {
    const PRESETS = [SYNTH_POP, TECHNO, DEEP_HOUSE, AMBIENT, LO_FI, FUNK, BOSSA_NOVA, SWING_JAZZ];
    const AXES = ['sync', 'harm', 'artic', 'energy'] as const;
    const halfway = (a: StylePoint, b: StylePoint) => Object.fromEntries(AXES.map((axis) => [axis, (a[axis]! + b[axis]!) / 2]));
    const grid = AXES.reduce<StylePoint[]>((points, axis) => points.flatMap((p) => [0, 0.25, 0.5, 0.75, 1].map((v) => ({ ...p, [axis]: v }))), [{}]);
    // (the points `library.test.ts` queries at: every preset, every point halfway between two, and a grid)
    const POINTS: StylePoint[] = [
      ...PRESETS.map((p, i) => ({ ...p, swing: i / 8, bpm: 72 + 10 * i })),
      ...PRESETS.flatMap((a, i) => PRESETS.slice(i + 1).map((b) => halfway(a, b))),
      ...grid,
    ];
    const r = createRepository(LIBRARY);
    const uses = (ids: string[]) => ids.map((id) => ({ id }));
    const layer = useFragments(
      r,
      useFragments(r, EMPTY_LAYER, uses(['4/4', 'Bossa nova drums', 'bossa nova clave'])),
      uses(['4/4 leaning lightly on 16n', 'Funk drums', 'rumba clave 3-2']),
    );
    const n = 20_000;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      const point = POINTS[i % POINTS.length]!;
      r.query(point, 25, {}, i % 2 ? { facet: 'rhythm', chosen: ['4/4', 'Funk drums'], layer } : { facet: 'meter', layer });
    }
    expect((performance.now() - t0) / n).toBeLessThan(1);
  });

  // (the queries `fit.test.ts` counts the compiles of, on its workbench of five: ten seconds for the three)
  it('three fitting queries on a workbench of five take under 10 s', () => {
    const rhythm = (id: string) => RHYTHM_FRAGMENTS.find((f) => f.id === id)!.text;
    const bench = (bpm: number) => setTiming(METER_FRAGMENTS.find((f) => f.id === '4/4')!.text, 'bar', 'step', `${bpm}bpm`);
    const workbench = ['Funk drums', 'Techno drums', 'rumba clave 3-2', 'bossa nova clave (one bar)'].reduce((text, id) => unionOf(rhythm(id), text).text, bench(104));
    const r = createRepository(LIBRARY);
    r.query(FUNK, LIBRARY.length, {}, { workbench: bench(120) });
    const t0 = performance.now();
    expect(r.query(FUNK, LIBRARY.length, {}, { workbench })).toHaveLength(30); // (the rhythms, the instruments, the vibrato and the envelopes: the modes wait on a &tonic, #290)
    r.query(FUNK, LIBRARY.length, {}, { workbench, chosen: ['Funk drums'] });
    expect(r.query(FUNK, 1, {}, { workbench: `${workbench}\n&more loop=A4` })).toHaveLength(1);
    expect(performance.now() - t0).toBeLessThan(10_000);
  });
});
