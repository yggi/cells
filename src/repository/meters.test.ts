// The meters (#82): every fragment compiles clean and is the meter its id says, its swing too; Jambot's presets find their
// meters, which play the swing Jambot plays, and so does every point halfway between two of them; an axis no fragment
// has changes nothing.
import { describe, expect, it } from 'vitest';
import swing from '../../fixtures/contracts/swing.json';
import { compileSource } from '../engine/compile';
import { setTiming } from '../engine/edit';
import { codeShifts } from '../engine/program';
import { eventsBetween, plan } from '../engine/realize';
import { createRepository, type StylePoint } from './fragments';
import { METER_FRAGMENTS } from './meters';
import { ELECTRO_SWING, SPOOKY } from './presets';

/** Jambot's swing axis, the readers' path of the swing contract (music-commons contracts/swing): 4/4 at each s from 0 to 1 in twentieths. */
const path = swing.vectors.filter((v) => v.s !== undefined);

const repository = createRepository(METER_FRAGMENTS);
const ids = METER_FRAGMENTS.map((f) => f.id);

// What each meter is: its pulses, the note value of a pulse, and its beats in pulses (decision 040).
const SHAPES: Record<string, { pulses: number; unit: number; beats: number[] }> = {
  '4/4': { pulses: 4, unit: 4, beats: [1, 1, 1, 1] },
  '4/4 swung on 8n': { pulses: 4, unit: 4, beats: [1, 1, 1, 1] },
  '4/4 leaning on 16n': { pulses: 4, unit: 4, beats: [1, 1, 1, 1] },
  '4/4 leaning lightly on 16n': { pulses: 4, unit: 4, beats: [1, 1, 1, 1] },
  '4/4 leaning faintly on 16n': { pulses: 4, unit: 4, beats: [1, 1, 1, 1] },
  '4/4 alla breve': { pulses: 4, unit: 4, beats: [2, 2] },
  '2/4': { pulses: 2, unit: 4, beats: [1, 1] },
  '3/4': { pulses: 3, unit: 4, beats: [1, 1, 1] },
  '6/8': { pulses: 6, unit: 8, beats: [3, 3] },
  '12/8': { pulses: 12, unit: 8, beats: [3, 3, 3, 3] },
  '5/4': { pulses: 5, unit: 4, beats: [1, 1, 1, 1, 1] },
  '7/8': { pulses: 7, unit: 8, beats: [3, 2, 2] },
  '10/8': { pulses: 10, unit: 8, beats: [3, 2, 3, 2] },
};

// The levels each meter leans, coarse to fine, and their shares: Jambot's swingShares at its presets' swing (none: straight).
const SWINGS: Record<string, { level: string; share: number }[]> = {
  '4/4 swung on 8n': [{ level: '8n', share: 2 / 3 }],
  '4/4 leaning on 16n': [{ level: '16n', share: 0.65 }],
  '4/4 leaning lightly on 16n': [{ level: '16n', share: 0.6 }],
  '4/4 leaning faintly on 16n': [{ level: '16n', share: 31 / 60 }],
};

// Jambot's eight presets, every axis as Jambot has it today (swing, bpm: axes no fragment has), and the meter each
// names (yggi/jambot#360, its level and share from swingParts at the preset's swing). Lifted from yggi/jambot
// packages/engine/src/style.ts @ 7b078e8 (unchanged at 5fcf48f).
const PRESETS: { name: string; point: StylePoint; names: string }[] = [
  { name: 'Synth-pop', point: { swing: 0, sync: 0.3, harm: 0.45, artic: 0.55, energy: 0.55, bpm: 108 }, names: '4/4' },
  { name: 'Techno', point: { swing: 0, sync: 0.12, harm: 0, artic: 1, energy: 0.8, bpm: 130 }, names: '4/4' },
  { name: 'Deep house', point: { swing: 0.3, sync: 0.35, harm: 0.55, artic: 0.65, energy: 0.65, bpm: 122 }, names: '4/4 leaning lightly on 16n' },
  { name: 'Ambient', point: { swing: 0.05, sync: 0.05, harm: 0.3, artic: 0, energy: 0.2, bpm: 72 }, names: '4/4 leaning faintly on 16n' },
  { name: 'Lo-fi hip hop', point: { swing: 0.45, sync: 0.5, harm: 0.75, artic: 0.35, energy: 0.5, bpm: 84 }, names: '4/4 leaning on 16n' },
  { name: 'Funk', point: { swing: 0.3, sync: 1, harm: 0.12, artic: 0.85, energy: 0.75, bpm: 104 }, names: '4/4 leaning lightly on 16n' },
  { name: 'Bossa nova', point: { swing: 0, sync: 0.75, harm: 0.85, artic: 0.45, energy: 0.45, bpm: 132 }, names: '4/4' },
  { name: 'Swing jazz', point: { swing: 1, sync: 0.35, harm: 1, artic: 0.3, energy: 0.6, bpm: 148 }, names: '4/4 swung on 8n' },
];
const first = (point: StylePoint) => repository.query(point, 1)[0]!.fragment.id;

// The frame a host gives a meter fragment: its tempo, and a sound on its steps, or on a line tapping it by the sixteenth.
const inFrame = (text: string, tapped = false) =>
  [
    setTiming(text, 'bar', 'step', '120bpm'),
    ...(tapped ? ['&x step=16n 0'] : []),
    '&tick s=sine loop=A5 env=&(map=adsr 0 .03 0 .02)',
    `&out loop=SAMPLE_RATE map=sample [${tapped ? '&x' : '&bar'} * &tick]`,
  ].join('\n');

describe('the meter fragments', () => {
  it('are the nine meters that need no swing and the four swung 4/4s Jambot’s presets play', () => {
    expect([...ids].sort()).toEqual(Object.keys(SHAPES).sort());
    expect(ids.filter((id) => SWINGS[id])).toEqual(Object.keys(SWINGS));
  });

  it.each(METER_FRAGMENTS.map((f) => [f.id, f.text]))('%s compiles with no diagnostic, in a host’s frame, as that meter', (id, text) => {
    const result = compileSource(inFrame(text));
    expect(result.diagnostics).toEqual([]);
    expect(result.mainMeter).toBe('bar');
    const meter = result.cells.get('bar')!.meter!;
    expect({ pulses: meter.pulses, unit: meter.unit, beats: meter.beats }).toEqual(SHAPES[id]);
    expect(meter.swing?.map(({ level, share }) => ({ level, share }))).toEqual(SWINGS[id]);
  });

  // (the owner's ruling on yggi/jambot#360: a meter swung on 8n brings in the jazz kit, so the id tells it from a 16n lean)
  it('10/8 plays the same events as the levels it used to be written as', () => {
    const events = (text: string) => {
      const r = compileSource(inFrame(text, true));
      expect(r.diagnostics).toEqual([]);
      return eventsBetween(plan(r, codeShifts(r)), 0, 4 - 1e-6).map((e) => e.at);
    };
    expect(events(METER_FRAGMENTS.find((f) => f.id === '10/8')!.text)).toEqual(events('&bar meter("*..+.+..+.")'));
  });

  it.each(ids)('%s says in its id whether it swings on 8n or leans on 16n', (id) => {
    const levels = (compileSource(inFrame(METER_FRAGMENTS.find((f) => f.id === id)!.text)).cells.get('bar')!.meter!.swing ?? []).map((l) => l.level);
    expect(id.includes('swung on 8n')).toBe(levels.includes('8n'));
    expect(/leaning \w* ?on 16n/.test(id)).toBe(levels.includes('16n'));
  });

  it.each(METER_FRAGMENTS.flatMap((f) => f.association.map((wp, i) => [f.id, i + 1, wp.point] as const)))('%s is found first at its point %i', (id, _, point) => {
    expect(first(point)).toBe(id);
  });
});

describe('the presets find their meters', () => {
  it.each(PRESETS.map((p) => [p.name, p.names, p] as const))('%s: %s', (_, meter, preset) => {
    expect(first(preset.point)).toBe(meter);
  });

  // (a bar of 120 bpm is 2 s: a sixteenth is an eighth of a second)
  it.each(PRESETS.map((p) => [p.name, p] as const))('%s: the meter it finds plays each sixteenth within 1e-9 of Jambot’s leanMap', (_, preset) => {
    const v = path.find((x) => x.s === preset.point.swing)!;
    const r = compileSource(inFrame(repository.query(preset.point, 1)[0]!.fragment.text, true));
    expect(r.diagnostics).toEqual([]);
    const at = eventsBetween(plan(r, codeShifts(r)), 0, 2 - 1e-6).map((e) => e.at * 8);
    expect(at).toHaveLength(16);
    at.forEach((x, k) => expect(Math.abs(x - v.onsets[k]!), `the ${k}th sixteenth`).toBeLessThan(1e-9));
  });

  // Halfway between two presets, the meter of the preset nearest there, by the repository's own distance over the axes the
  // meters have: one of the two, or a third preset's that is nearer than both (halfway between Synth-pop and Bossa nova is
  // nearer Lo-fi hip hop). No other meter takes a point the presets' meters hold.
  const onMeterAxes = ({ swing: _swing, bpm: _bpm, ...axes }: StylePoint) => axes;
  // (and the points proposed for two more presets, #349: Electro swing's swung 4/4, Spooky's 5/4 with 6/8 and 3/4 near it)
  const proposed = [
    { name: 'Electro swing', point: ELECTRO_SWING, names: '4/4 swung on 8n' },
    { name: 'Spooky', point: SPOOKY, names: '5/4' },
    { name: 'Spooky, less energy', point: { ...SPOOKY, energy: 0.27 }, names: '6/8' },
    { name: 'Spooky, more energy', point: { ...SPOOKY, energy: 0.43 }, names: '3/4' },
  ];
  const presets = createRepository([...PRESETS, ...proposed].map((p) => ({ id: p.name, text: p.names, association: [{ point: onMeterAxes(p.point), weight: 1 }] })));
  const nearestMeters = (point: StylePoint) => {
    const found = presets.query(point, PRESETS.length + proposed.length);
    return new Set(found.filter((f) => f.distance - found[0]!.distance < 1e-12).map((f) => f.fragment.text));
  };
  const pairs = PRESETS.flatMap((a, i) => PRESETS.slice(i + 1).map((b) => [a, b] as const));
  const halfwayOf = (a: (typeof PRESETS)[number], b: (typeof PRESETS)[number]) =>
    Object.fromEntries(Object.keys(a.point).map((axis) => [axis, (a.point[axis]! + b.point[axis]!) / 2]));
  it('every pair of presets is a pair (28)', () => expect(pairs).toHaveLength(28));
  it.each(pairs.map(([a, b]) => [a.name, b.name, a, b] as const))('halfway between %s and %s: the meter of the preset nearest there', (_, __, a, b) => {
    const halfway = halfwayOf(a, b);
    expect([...nearestMeters(halfway)]).toContain(first(halfway));
  });

  it.each(PRESETS.map((p) => [p.name, p.point] as const))('%s: its swing and bpm, which no fragment has, rank as if absent', (_, point) => {
    const { swing: _swing, bpm: _bpm, ...shared } = point;
    const ranked = (p: StylePoint) => repository.query(p, ids.length).map((f) => [f.fragment.id, f.distance]);
    expect(ranked(point)).toEqual(ranked(shared));
    expect(ranked({ ...point, swing: 0.5, bpm: 60, entropy: 1 })).toEqual(ranked(shared));
  });
});

describe('the points proposed for two more presets (#349)', () => {
  const ranked = (point: StylePoint, n: number) => repository.query(point, n).map((f) => [f.fragment.id, +f.distance.toFixed(9)]);
  it('Electro swing finds the swung 4/4 its example plays, at distance 0', () => {
    expect(ranked(ELECTRO_SWING, 1)).toEqual([['4/4 swung on 8n', 0]]);
  });

  // (0.08 off on energy alone, which the repository's distance, over four axes, counts as 0.04)
  it('Spooky finds 5/4 at distance 0, then 6/8 and 3/4, each 0.08 off in energy, for the ladder to fetch', () => {
    expect(ranked(SPOOKY, 3)).toEqual([
      ['5/4', 0],
      ['6/8', 0.04],
      ['3/4', 0.04],
    ]);
  });
});
