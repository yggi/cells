// The ending (#720, twin of yggi/jambot#646): a song's last bar and its ring, a fragment found by style, `finale`, which
// plays what Jambot's band plays there (`cadence` and `finale`, ending.ts), part by part, over every mode.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { codeShifts } from '../engine/program';
import { eventsBetween, plan } from '../engine/realize';
import { mod } from '../theory/modes';
import { createRepository } from './fragments';
import { LIBRARY, resolveSeed } from './library';
import { STYLES, stylePoint } from './styles';

const lines = (...xs: string[]) => xs.join('\n');
/** A sixteenth of 4/4 at 120 bpm, in seconds. */
const SIXTEENTH = 0.125;

/** One part's notes, as [onset in sixteenths, length in sixteenths, semitones from the key's tonic], over a key on D. */
function part(head: string, key: string, meter = '4/4'): [number, number, number][] {
  const text = lines(
    `&bar meter("${meter}") step=120bpm`,
    `&key ${key}`,
    `&${head} from finale &key`,
    '&v s=sine loop=C4',
    head === 'finaleDrums' ? `&out map=sample [&${head}]` : `&out [&${head} * &v]`,
  );
  const r = compileSource(text, undefined, { resolve: resolveSeed });
  expect(r.diagnostics.map((d) => d.message)).toEqual([]);
  // (one lap of the ending: its two bars at 120 bpm)
  return eventsBetween(plan(r, codeShifts(r), r.off), 0, 4 - 1e-6)
    .map((e): [number, number, number] => [+(e.at / SIXTEENTH).toFixed(6), +(e.dur / SIXTEENTH).toFixed(6), Math.round(12 * Math.log2(e.freq / 261.625565)) - 2])
    .sort((a, b) => a[0] - b[0] || a[2] - b[2]);
}

const MODES: Record<string, readonly number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
};

// Lifted from yggi/jambot packages/engine/src/ending.ts @ b98e69f, in 4/4: the cadence's chords (the dominant seventh on
// the tonic's fifth, from step 0; the key's triad from the landing, step 8) and what each part plays over them, as pitch
// classes from the tonic, each note's onset and length in sixteenths; the tonic rings to `stepsOf + RING_STEPS`, 24.
const LANDING = 8;
const HELD = 16 + 8;
const jambot = (scale: readonly number[]) => ({
  dominant: [7, 11, 2, 5],
  tonic: [scale[0]!, scale[2]!, scale[4]!],
  bass: [
    [0, LANDING, 7],
    [LANDING, HELD - LANDING, 0],
  ],
  lead: [
    [0, LANDING, scale[1]!],
    [LANDING, HELD - LANDING, 0],
  ],
});
const classes = (notes: readonly (readonly number[])[]) => notes.map(([at, length, pitch]) => [at, length, mod(pitch!, 12)]);

describe('found by style', () => {
  const repository = createRepository(LIBRARY);
  it('every style of styles finds the ending, finale, at distance 0: Jambot ends the same way at every style, its ten presets too', () => {
    expect(STYLES).toHaveLength(23);
    for (const s of STYLES) {
      const [first] = repository.query(stylePoint(s.id), 1, {}, { facet: 'ending' });
      expect([first!.fragment.id, first!.distance], s.id).toEqual(['finale', 0]);
    }
  });
});

describe('what Jambot’s band plays at its end, in 4/4', () => {
  it.each(Object.entries(MODES))('over %s on D: the chords, the bass, the pad and the lead, onset, length and pitch class', (mode, scale) => {
    const key = `scale(${mode}, D)`;
    const want = jambot(scale);
    const chords = part('cadence', key);
    // (the dominant's four tones to the landing, the tonic's three from it to the lap's end: the chord in force for the
    // parts that read it, which sound it to Jambot's 24, the bar's end and the ring)
    expect(chords.filter(([at]) => at === 0).map(([, length]) => length)).toEqual([LANDING, LANDING, LANDING, LANDING]);
    expect(chords.filter(([at]) => at === LANDING).map(([, length]) => length)).toEqual([32 - LANDING, 32 - LANDING, 32 - LANDING]);
    expect(new Set(chords.filter(([at]) => at === 0).map(([, , p]) => mod(p, 12)))).toEqual(new Set(want.dominant));
    expect(new Set(chords.filter(([at]) => at === LANDING).map(([, , p]) => mod(p, 12)))).toEqual(new Set(want.tonic));
    expect(classes(part('finaleBass', key))).toEqual(want.bass);
    expect(classes(part('finaleLead', key))).toEqual(want.lead);
    const pad = part('finalePad', key);
    expect(new Set(pad.filter(([at]) => at === 0).map(([, , p]) => mod(p, 12)))).toEqual(new Set(want.dominant));
    expect(new Set(pad.filter(([at]) => at === LANDING).map(([, , p]) => mod(p, 12)))).toEqual(new Set(want.tonic));
    expect(pad.every(([at, length]) => length === (at === 0 ? LANDING : HELD - LANDING))).toBe(true);
  });

  it('each part moves as Jambot’s does: the bass up a fourth to the tonic (the nearer), the lead down a step, the pad to the voicing that moves least', () => {
    const key = 'scale(aeolian, D)';
    const [dominant, tonic] = part('finaleBass', key);
    expect(tonic![2] - dominant![2]).toBe(5);
    const [second, home] = part('finaleLead', key);
    expect(home![2] - second![2]).toBe(-2);
    const pad = part('finalePad', key);
    const before = pad.filter(([at]) => at === 0).map(([, , p]) => p);
    const after = pad.filter(([at]) => at === LANDING).map(([, , p]) => p);
    // (each voice of the tonic within a fourth of a voice of the dominant: no leap of the whole chord)
    expect(after.every((p) => before.some((q) => Math.abs(p - q) <= 5))).toBe(true);
    expect(Math.max(...after) - Math.min(...after)).toBeLessThan(12);
  });

  it('the drums are finale’s: hats and a backbeat leaning in, then kick, snare and ride on the landing, and nothing in the ring', () => {
    const hits = part('finaleDrums', 'scale(aeolian, D)').map(([at]) => at);
    expect(hits).toEqual([0, 0, 2, 4, 4, 6, 6, 8, 8, 8]);
  });

  // (locrian's fifth degree is diminished: the dominant stands on it, a semitone under Jambot's, which stands on the
  // perfect fifth above the tonic whatever the key; Jambot's composer plays no locrian key at a preset)
  it('over locrian, the one difference: the dominant stands on the key’s fifth degree, a diminished fifth', () => {
    const chords = part('cadence', 'scale(locrian, D)');
    expect(new Set(chords.filter(([at]) => at === 0).map(([, , p]) => mod(p, 12)))).toEqual(new Set([6, 10, 1, 4]));
  });
});

describe('in any meter, and placed by its section', () => {
  // (Jambot lands on the bar's half on an eighth, `slotStepOn`: the same in 3/4, 6/8 and 5/4; in 7/8, an odd number of
  // eighths, it lands on the third eighth, cells on the half bar itself, seven sixteenths in)
  it.each([
    ['3/4', 12, 6],
    ['6/8', 12, 6],
    ['5/4', 20, 10],
    ['7/8', 14, 7],
  ])('in %s, a bar of %i sixteenths, the landing is the half bar, %i in', (meter, sixteenths, half) => {
    const r = compileSource(
      lines(`&bar meter("${meter}") step=120bpm`, '&key scale(aeolian, D)', '&finaleLead from finale &key', '&v s=sine loop=C4', '&out [&finaleLead * &v]'),
      undefined,
      {
        resolve: resolveSeed,
      },
    );
    expect(r.diagnostics).toEqual([]);
    // (the lead's dominant, its tonic on the landing, then the dominant again two bars on: its lap)
    const [start, landing, again] = eventsBetween(plan(r, codeShifts(r), r.off), 0, 20).map((e) => e.at);
    const bar = (again! - start!) / 2;
    expect(+(((landing! - start!) / bar) * sixteenths).toFixed(6)).toBe(half);
  });

  it('a score passes its ending section’s clock: the ending starts with the section, and the tonic rings through its second bar', () => {
    const text = lines(
      '&bar meter("4/4") step=120bpm laps=4',
      '&key scale(aeolian, D)',
      '&parts step=2n &songHalf &endHalf',
      '&plan over=&parts step=1m 0@2 1@2',
      '&tune over=&key step=&songHalf 0 4',
      '&finaleLead from finale(half=&endHalf) &key',
      '&v s=sine loop=C4',
      '&out [&tune * &v, &finaleLead * &v]',
    );
    const r = compileSource(text, undefined, { resolve: resolveSeed });
    expect(r.diagnostics).toEqual([]);
    const notes = eventsBetween(plan(r, codeShifts(r), r.off), 0, 8).map((e) => [e.at, e.dur]);
    expect(notes).toEqual([
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 2],
    ]);
  });
});
