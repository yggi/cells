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
import { ELECTRO_SWING, SPOOKY } from './styles';
import { seedFragments } from './seed';

const METER_FRAGMENTS = seedFragments('meters');

/** Jambot's swing axis, the readers' path of the swing contract (music-commons contracts/swing): 4/4 at each s from 0 to 1 in twentieths. */
const path = swing.vectors.filter((v) => v.s !== undefined);

const repository = createRepository(METER_FRAGMENTS);
const ids = METER_FRAGMENTS.map((f) => f.id);

// What each meter is: its pulses, the note value of a pulse, and its beats in pulses (decision 040).
const SHAPES: Record<string, { pulses: number; unit: number; beats: number[] }> = {
  bar: { pulses: 4, unit: 4, beats: [1, 1, 1, 1] },
  swing_meter: { pulses: 4, unit: 4, beats: [1, 1, 1, 1] },
  lofi_meter: { pulses: 4, unit: 4, beats: [1, 1, 1, 1] },
  funk_meter: { pulses: 4, unit: 4, beats: [1, 1, 1, 1] },
  // (alla breve, decision 102: 4/4's tree counted in two)
  'bar(meter="4/4 in 2")': { pulses: 4, unit: 4, beats: [2, 2] },
  'bar(meter="2/4")': { pulses: 2, unit: 4, beats: [1, 1] },
  'bar(meter="3/4")': { pulses: 3, unit: 4, beats: [1, 1, 1] },
  'bar(meter="6/8")': { pulses: 6, unit: 8, beats: [3, 3] },
  'bar(meter="12/8")': { pulses: 12, unit: 8, beats: [3, 3, 3, 3] },
  odd_meter: { pulses: 5, unit: 4, beats: [1, 1, 1, 1, 1] },
  'odd_meter(meter="7/8")': { pulses: 7, unit: 8, beats: [3, 2, 2] },
  'odd_meter(meter="10/8")': { pulses: 10, unit: 8, beats: [3, 2, 3, 2] },
};

// The levels each meter leans, coarse to fine, and their shares: Jambot's swingShares at its presets' swing (none: straight).
const SWINGS: Record<string, { level: string; share: number }[]> = {
  swing_meter: [{ level: '8n', share: 2 / 3 }],
  lofi_meter: [{ level: '16n', share: 0.65 }],
  funk_meter: [{ level: '16n', share: 0.6 }],
};

// Jambot's eight presets, every axis as Jambot has it today (swing, bpm: axes no fragment has), and the meter each
// names (yggi/jambot#360, its level and share from swingParts at the preset's swing). Lifted from yggi/jambot
// packages/engine/src/style.ts @ 7b078e8 (unchanged at 5fcf48f).
const PRESETS: { name: string; point: StylePoint; names: string }[] = [
  { name: 'Synth-pop', point: { swing: 0, sync: 0.3, harm: 0.45, bite: 0.55, mood: 0.5, bpm: 108 }, names: 'bar' },
  { name: 'Techno', point: { swing: 0, sync: 0.12, harm: 0, bite: 1, mood: 0.4, bpm: 130 }, names: 'bar' },
  { name: 'Deep house', point: { swing: 0.3, sync: 0.35, harm: 0.55, bite: 0.65, mood: 0.65, bpm: 122 }, names: 'funk_meter' },
  { name: 'Ambient', point: { swing: 0.05, sync: 0.05, harm: 0.3, bite: 0, mood: 0.9, bpm: 72 }, names: 'bar' },
  { name: 'Lo-fi hip hop', point: { swing: 0.45, sync: 0.5, harm: 0.75, bite: 0.35, mood: 0.5, bpm: 84 }, names: 'lofi_meter' },
  { name: 'Funk', point: { swing: 0.3, sync: 1, harm: 0.12, bite: 0.85, mood: 0.65, bpm: 104 }, names: 'funk_meter' },
  { name: 'Bossa nova', point: { swing: 0, sync: 0.75, harm: 0.85, bite: 0.45, mood: 0.9, bpm: 132 }, names: 'bar' },
  { name: 'Swing jazz', point: { swing: 1, sync: 0.35, harm: 1, bite: 0.3, mood: 0.85, bpm: 148 }, names: 'swing_meter' },
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
  it('are the ten meters that need no swing and the three swung 4/4s Jambot’s presets play, Ambient’s straight (decision 103)', () => {
    expect([...ids].sort()).toEqual(Object.keys(SHAPES).sort());
    expect(ids.filter((id) => SWINGS[id]).sort()).toEqual(Object.keys(SWINGS).sort());
  });

  it.each(METER_FRAGMENTS.map((f) => [f.id, f.text]))('%s compiles with no diagnostic, in a host’s frame, as that meter', (id, text) => {
    const result = compileSource(inFrame(text));
    expect(result.diagnostics).toEqual([]);
    expect(result.mainMeter).toBe('bar');
    const meter = result.cells.get('bar')!.meter!;
    expect({ pulses: meter.pulses, unit: meter.unit, beats: meter.beats }).toEqual(SHAPES[id]);
    expect(meter.swing?.map(({ level, share }) => ({ level, share }))).toEqual(SWINGS[id]);
  });

  it('10/8 plays the same events as the levels it used to be written as', () => {
    const events = (text: string) => {
      const r = compileSource(inFrame(text, true));
      expect(r.diagnostics).toEqual([]);
      return eventsBetween(plan(r, codeShifts(r)), 0, 4 - 1e-6).map((e) => e.at);
    };
    expect(events(METER_FRAGMENTS.find((f) => f.id === 'odd_meter(meter="10/8")')!.text)).toEqual(events('&bar meter("*..+.+..+.")'));
  });

  // (the owner's ruling on yggi/jambot#360: a meter swung on 8n brings in the jazz kit; its fragment says so by its name, swing_meter, and its text)
  it('the swung 4/4s are a style’s feel each, named for it: 8n is jazz’s swing_meter, 16n Funk’s and Lo-fi’s leans (decision 103)', () => {
    const levelOf = (id: string) => (compileSource(inFrame(METER_FRAGMENTS.find((f) => f.id === id)!.text)).cells.get('bar')!.meter!.swing ?? []).map((l) => l.level);
    expect(Object.fromEntries(ids.filter((id) => levelOf(id).length).map((id) => [id, levelOf(id)]))).toEqual({ swing_meter: ['8n'], funk_meter: ['16n'], lofi_meter: ['16n'] });
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
    // (Ambient's faint lean, Jambot's .05, is dropped: its bar is straight, the owner on #902, decision 103)
    const v = path.find((x) => x.s === (preset.name === 'Ambient' ? 0 : preset.point.swing))!;
    const r = compileSource(inFrame(repository.query(preset.point, 1)[0]!.fragment.text, true));
    expect(r.diagnostics).toEqual([]);
    const at = eventsBetween(plan(r, codeShifts(r)), 0, 2 - 1e-6).map((e) => e.at * 8);
    expect(at).toHaveLength(16);
    at.forEach((x, k) => expect(Math.abs(x - v.onsets[k]!), `the ${k}th sixteenth`).toBeLessThan(1e-9));
  });

  // Halfway between two presets, the meter of the preset nearest there, by the repository's own distance over the axes the
  // meters have: one of the two, or a third preset's that is nearer than both (halfway between Synth-pop and Bossa nova is
  // nearer Lo-fi hip hop). No other meter takes a point the presets' meters hold.
  // (a meter speaks to no mode, so it has no mood: the presets compared on the axes a meter has, decision 076)
  const onMeterAxes = ({ swing: _swing, bpm: _bpm, mood: _mood, ...axes }: StylePoint) => axes;
  // (and the points proposed for two more presets, #349: Electro swing's swung 4/4, Spooky's 5/4 with 6/8 and 3/4 near it)
  const proposed = [
    { name: 'Electro swing', point: ELECTRO_SWING, names: 'swing_meter' },
    { name: 'Spooky', point: SPOOKY, names: 'odd_meter' },
    { name: 'Spooky, less bite', point: { ...SPOOKY, bite: SPOOKY.bite! - 0.08 }, names: 'bar(meter="6/8")' },
    { name: 'Spooky, more bite', point: { ...SPOOKY, bite: SPOOKY.bite! + 0.08 }, names: 'bar(meter="3/4")' },
  ];
  const presets = createRepository(
    [...PRESETS, ...proposed].map((p) => ({ id: p.name, text: p.names, association: [{ point: onMeterAxes(p.point), weight: p.name.startsWith('Spooky, ') ? 0.75 : 1 }] })),
  );
  const nearestMeters = (point: StylePoint) => {
    const found = presets.query(point, PRESETS.length + proposed.length);
    return new Set(found.filter((f) => f.distance - found[0]!.distance < 1e-12).map((f) => f.fragment.text));
  };
  const pairs = PRESETS.flatMap((a, i) => PRESETS.slice(i + 1).map((b) => [a, b] as const));
  const halfwayOf = (a: (typeof PRESETS)[number], b: (typeof PRESETS)[number]) =>
    Object.fromEntries(Object.keys(a.point).map((axis) => [axis, (a.point[axis]! + b.point[axis]!) / 2]));
  it('every pair of presets is a pair (28)', () => expect(pairs).toHaveLength(28));
  // (the meters placed for their own sake weigh 0.75 since #572 (0.5 unsettled their use over a set, lockin.slow.test.ts):
  // between two of these four pairs one of them still lies nearer than either preset's meter (6/8, 5/4), and between the
  // other two the plain 4/4 placed at the styles read from the examples (Happy hardcore's, Elektro's) lies nearer than Deep
  // house's and Funk's swung one: named on #572, #540, #542)
  const between: Readonly<Record<string, string>> = {
    'Synth-pop|Funk': 'bar',
    // (and since #542's second batch, the plain 4/4 placed at Salsa's point (sync .9 harm .5 bite .7) between Funk and three
    // presets: nearer than Blues shuffle's swung 4/4 between Deep house and Funk, which it found after the first batch, and
    // than Funk's or the other preset's own meter between Lo-fi hip hop and Funk, and between Funk and Bossa nova, whose
    // halfway point (.875, .485, .65) is 0.058 from Salsa's)
    'Deep house|Funk': 'bar',
    'Lo-fi hip hop|Funk': 'bar',
    'Funk|Bossa nova': 'bar',
    'Synth-pop|Ambient': 'bar(meter="6/8")',
    'Deep house|Swing jazz': 'odd_meter',
  };
  it.each(pairs.map(([a, b]) => [a.name, b.name, a, b] as const))('halfway between %s and %s: the meter of the preset nearest there', (_, __, a, b) => {
    const halfway = halfwayOf(a, b);
    const named = between[`${a.name}|${b.name}`];
    if (named) expect(first(halfway)).toBe(named);
    else expect([...nearestMeters(halfway)]).toContain(first(halfway));
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
    expect(ranked(ELECTRO_SWING, 1)).toEqual([['swing_meter', 0]]);
  });

  // (0.08 off in bite over a meter's three axes, 0.08/√3, at weight 0.75 since #572: 0.08/√3/0.75)
  it('Spooky finds 5/4 at distance 0, then 6/8 and 3/4, each 0.08 off in bite and weighted 0.75, for the ladder to fetch', () => {
    // (the two tie: either first)
    const found = ranked(SPOOKY, 3);
    expect(found[0]).toEqual(['odd_meter', 0]);
    expect(found.slice(1).sort()).toEqual([
      ['bar(meter="3/4")', +(0.08 / Math.sqrt(3) / 0.75).toFixed(9)],
      ['bar(meter="6/8")', +(0.08 / Math.sqrt(3) / 0.75).toFixed(9)],
    ]);
  });
});
