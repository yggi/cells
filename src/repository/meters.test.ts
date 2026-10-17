// The meters (#82): every fragment compiles clean and is the meter its id says; Jambot's presets find their meters, and
// so does every point halfway between two of them; an axis no fragment has changes nothing.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { setTiming } from '../engine/edit';
import { createRepository, type StylePoint } from './fragments';
import { METER_FRAGMENTS } from './meters';

const repository = createRepository(METER_FRAGMENTS);
const ids = METER_FRAGMENTS.map((f) => f.id);

// What each meter is: its pulses, the note value of a pulse, and its beats in pulses (decision 040).
const SHAPES: Record<string, { pulses: number; unit: number; beats: number[] }> = {
  '4/4': { pulses: 4, unit: 4, beats: [1, 1, 1, 1] },
  '4/4 alla breve': { pulses: 4, unit: 4, beats: [2, 2] },
  '2/4': { pulses: 2, unit: 4, beats: [1, 1] },
  '3/4': { pulses: 3, unit: 4, beats: [1, 1, 1] },
  '6/8': { pulses: 6, unit: 8, beats: [3, 3] },
  '12/8': { pulses: 12, unit: 8, beats: [3, 3, 3, 3] },
  '5/4': { pulses: 5, unit: 4, beats: [1, 1, 1, 1, 1] },
  '7/8': { pulses: 7, unit: 8, beats: [3, 2, 2] },
  '10/8': { pulses: 10, unit: 8, beats: [3, 2, 3, 2] },
};

// Jambot's eight presets, every axis as Jambot has it today (swing, bpm: axes no fragment has), and the meter each
// names (yggi/jambot#360, its level and share from swingParts at the preset's swing). Lifted from yggi/jambot
// packages/engine/src/style.ts @ 7b078e8. A named meter not built yet (the swung ones, waiting for #18) is straight 4/4.
const PRESETS: { name: string; point: StylePoint; names: string }[] = [
  { name: 'Synth-pop', point: { swing: 0, sync: 0.3, harm: 0.45, artic: 0.55, energy: 0.55, bpm: 108 }, names: '4/4' },
  { name: 'Techno', point: { swing: 0, sync: 0.12, harm: 0, artic: 1, energy: 0.8, bpm: 130 }, names: '4/4' },
  { name: 'Deep house', point: { swing: 0.3, sync: 0.35, harm: 0.55, artic: 0.65, energy: 0.65, bpm: 122 }, names: '4/4 leaning lightly on 16n' },
  { name: 'Ambient', point: { swing: 0.05, sync: 0.05, harm: 0.3, artic: 0, energy: 0.2, bpm: 72 }, names: '4/4 leaning lightly on 16n' },
  { name: 'Lo-fi hip hop', point: { swing: 0.45, sync: 0.5, harm: 0.75, artic: 0.35, energy: 0.5, bpm: 84 }, names: '4/4 leaning lightly on 16n' },
  { name: 'Funk', point: { swing: 0.3, sync: 1, harm: 0.12, artic: 0.85, energy: 0.75, bpm: 104 }, names: '4/4 leaning on 16n' },
  { name: 'Bossa nova', point: { swing: 0, sync: 0.75, harm: 0.85, artic: 0.45, energy: 0.45, bpm: 132 }, names: '4/4' },
  { name: 'Swing jazz', point: { swing: 1, sync: 0.35, harm: 1, artic: 0.3, energy: 0.6, bpm: 148 }, names: '4/4 swung on 8n' },
];
const meterOf = (preset: (typeof PRESETS)[number]) => (ids.includes(preset.names) ? preset.names : '4/4');
const first = (point: StylePoint) => repository.query(point, 1)[0]!.fragment.id;

// The frame a host gives a meter fragment: its tempo, and a sound on its steps.
const inFrame = (text: string) =>
  [setTiming(text, 'bar', 'step', '120bpm'), '&tick s=sine loop=A5 env=&(map=adsr 0 .03 0 .02)', '&out loop=SAMPLE_RATE map=sample [&bar * &tick]'].join('\n');

describe('the meter fragments', () => {
  it('are the nine meters that need no swing', () => {
    expect([...ids].sort()).toEqual(Object.keys(SHAPES).sort());
  });

  it.each(METER_FRAGMENTS.map((f) => [f.id, f.text]))('%s compiles with no diagnostic, in a host’s frame, as that meter', (id, text) => {
    const result = compileSource(inFrame(text));
    expect(result.diagnostics).toEqual([]);
    expect(result.mainMeter).toBe('bar');
    const meter = result.cells.get('bar')!.meter!;
    expect({ pulses: meter.pulses, unit: meter.unit, beats: meter.beats }).toEqual(SHAPES[id]);
  });

  it.each(METER_FRAGMENTS.flatMap((f) => f.association.map((wp, i) => [f.id, i + 1, wp.point] as const)))('%s is found first at its point %i', (id, _, point) => {
    expect(first(point)).toBe(id);
  });
});

describe('the presets find their meters', () => {
  it.each(PRESETS.map((p) => [p.name, meterOf(p), p] as const))('%s: %s', (_, meter, preset) => {
    expect(first(preset.point)).toBe(meter);
  });

  const pairs = PRESETS.flatMap((a, i) => PRESETS.slice(i + 1).map((b) => [a, b] as const));
  it('every pair of presets is a pair (28)', () => expect(pairs).toHaveLength(28));
  it.each(pairs.map(([a, b]) => [a.name, b.name, a, b] as const))('halfway between %s and %s: one of their meters', (_, __, a, b) => {
    const halfway = Object.fromEntries(Object.keys(a.point).map((axis) => [axis, (a.point[axis]! + b.point[axis]!) / 2]));
    expect([meterOf(a), meterOf(b)]).toContain(first(halfway));
  });

  it.each(PRESETS.map((p) => [p.name, p.point] as const))('%s: its swing and bpm, which no fragment has, rank as if absent', (_, point) => {
    const { swing: _swing, bpm: _bpm, ...shared } = point;
    const ranked = (p: StylePoint) => repository.query(p, ids.length).map((f) => [f.fragment.id, f.distance]);
    expect(ranked(point)).toEqual(ranked(shared));
    expect(ranked({ ...point, swing: 0.5, bpm: 60, entropy: 1 })).toEqual(ranked(shared));
  });
});
