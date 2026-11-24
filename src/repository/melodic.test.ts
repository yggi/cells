// The melodic scales (#719, twin of yggi/jambot#644): the scale a lead walks over the key, a fragment taken on it and
// found by style as a mode is. The key's own seven (`plain`) and its pentatonic are tables over the key's degrees; the
// blues and the major blues leave the key, so each is a necklace of its own on the key's tonic. Every style of `styles`
// finds one at distance 0, and Jambot's presets find the one its lead plays where its players wish for none.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { codeShifts } from '../engine/program';
import { eventsBetween, plan } from '../engine/realize';
import { signatureOf } from '../engine/use';
import { mod } from '../theory/modes';
import { createRepository, isAnyStyle } from './fragments';
import { LIBRARY, resolveSeed } from './library';
import { seedFragments } from './seed';
import { STYLES, stylePoint } from './styles';

const MELODIC_FRAGMENTS = seedFragments('melodic');
const lines = (...xs: string[]) => xs.join('\n');

/** The pitch classes (0 the tonic) a line plays up two octaves of `&melo`, taken by a from line over a key of `mode` on D. */
function walked(take: string, mode: string): number[] {
  const src = lines(
    '&bar meter("4/4") step=120bpm',
    '&tonic D',
    `&key from diatonic(mode=${mode}) &tonic`,
    take,
    '&line over=&melo step=16n 0 1 2 3 4 5 6 7 8 9 10 11 12 13',
    '&v s=sine loop=C4',
    '&out [&line * &v]',
  );
  const r = compileSource(src, undefined, { resolve: resolveSeed });
  expect(r.diagnostics.map((d) => d.message)).toEqual([]);
  const events = eventsBetween(plan(r, codeShifts(r), r.off), 0, 1.75);
  // (a pitch from C4, the tonic D two above it)
  return events.map((e) => Math.round(12 * Math.log2(e.freq / 261.625565)) - 2);
}
/** One octave of what `walked` plays, as pitch classes up from the tonic. */
const classes = (pitches: readonly number[], n: number) => pitches.slice(0, n).map((p) => mod(p, 12));

const MODES = ['locrian', 'phrygian', 'aeolian', 'dorian', 'mixolydian', 'ionian', 'lydian'] as const;
/** The diatonic modes as semitones up from the tonic. */
const KEY: Record<(typeof MODES)[number], readonly number[]> = {
  locrian: [0, 1, 3, 5, 6, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
};

// Lifted from yggi/jambot packages/engine/src/key.ts @ b98e69f (`MELODIC_DEGREES`): each melodic scale as degrees of the
// key, each with its accidental, by the side of the key's third.
const JAMBOT: Record<'minor' | 'major', Record<'pentatonic' | 'blues', readonly (readonly [number, number])[]>> = {
  minor: {
    pentatonic: [
      [0, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [6, 0],
    ],
    blues: [
      [0, 0],
      [2, 0],
      [3, 0],
      [4, -1],
      [4, 0],
      [6, 0],
    ],
  },
  major: {
    pentatonic: [
      [0, 0],
      [1, 0],
      [2, 0],
      [4, 0],
      [5, 0],
    ],
    blues: [
      [0, 0],
      [1, 0],
      [2, -1],
      [2, 0],
      [4, 0],
      [5, 0],
    ],
  },
};
/** A Jambot melodic scale over a key of a mode, as semitones up from the tonic. */
const jambot = (mode: (typeof MODES)[number], scale: 'pentatonic' | 'blues') => JAMBOT[KEY[mode][2] === 3 ? 'minor' : 'major'][scale].map(([d, a]) => KEY[mode][d]! + a);

describe('the melodic scales', () => {
  it('are the key’s own, its pentatonic of either side, the blues and the major blues: five fragments, the pentatonic a template of two', () => {
    expect(MELODIC_FRAGMENTS.map((f) => f.id)).toEqual(['plain', 'pentatonic(phase=0)', 'pentatonic(phase=3)', 'blues', 'major_blues']);
    for (const f of MELODIC_FRAGMENTS) expect(signatureOf(f.text)!.names, f.id).toEqual(['&melo']);
    // (the two over the key's degrees take the key; the two that leave it take its tonic)
    expect(MELODIC_FRAGMENTS.map((f) => signatureOf(f.text)!.main)).toEqual(['&key', '&key', '&key', '&tonic', '&tonic']);
    // (the major blues is taken by its name only: no query finds it)
    expect(MELODIC_FRAGMENTS.find((f) => f.id === 'major_blues')!.association.every((p) => isAnyStyle(p.point))).toBe(true);
  });

  it.each(MODES)('plain over %s plays the key, note for note, two octaves up', (mode) => {
    const pitches = walked('&melo from plain &key', mode);
    expect(classes(pitches, 7)).toEqual(KEY[mode]);
    expect(pitches.slice(7, 14)).toEqual(pitches.slice(0, 7).map((p) => p + 12));
  });

  it.each(MODES)('the pentatonic over %s, of either phase, never leaves the key', (mode) => {
    for (const phase of [0, 3]) {
      const pitches = walked(`&melo from pentatonic(phase=${phase}) &key`, mode);
      expect(
        classes(pitches, 5).every((pc) => KEY[mode].includes(pc)),
        `phase ${phase}`,
      ).toBe(true);
      expect(pitches.slice(5, 10)).toEqual(pitches.slice(0, 5).map((p) => p + 12));
    }
  });

  it.each(MODES.filter((m) => m !== 'locrian'))('over %s, the pentatonic of the key’s side is Jambot’s', (mode) => {
    const phase = KEY[mode][2] === 3 ? 3 : 0;
    expect(classes(walked(`&melo from pentatonic(phase=${phase}) &key`, mode), 5)).toEqual(jambot(mode, 'pentatonic'));
  });

  it.each(MODES.filter((m) => m !== 'locrian'))('over %s, the blues of the key’s side is Jambot’s: the blues over a minor third, the major blues over a major one', (mode) => {
    const id = KEY[mode][2] === 3 ? 'blues' : 'major_blues';
    expect(classes(walked(`&melo from ${id} &tonic`, mode), 6)).toEqual(jambot(mode, 'blues'));
  });

  it('the blues leaves the key: its flat fifth over every mode with a perfect fifth', () => {
    for (const mode of MODES.filter((m) => m !== 'locrian')) {
      const blues = classes(walked('&melo from blues &tonic', mode), 6);
      expect(blues).toEqual([0, 3, 5, 6, 7, 10]);
      expect(KEY[mode].includes(6), mode).toBe(mode === 'lydian');
    }
  });

  it('a mode word is no phase of the pentatonic: an error that says the phase to write', () => {
    const src = lines(
      '&bar meter("4/4") step=120bpm',
      '&key scale(minor, A)',
      '&melo from pentatonic(phase=aeolian) &key',
      '&line over=&melo step=8n 0 1 2',
      '&v s=sine loop=A4',
      '&out [&line * &v]',
    );
    const messages = compileSource(src, undefined, { resolve: resolveSeed }).diagnostics.map((d) => d.message);
    expect(messages).toContain("even(5, 7, …): a mode's name is a phase of the diatonic, even(7, 12); here write its number (2)");
  });
});

describe('found by style', () => {
  const repository = createRepository(LIBRARY);
  const first = (id: string) => repository.query(stylePoint(id), 2, {}, { facet: 'melodic' });

  it('every style of styles finds a melodic scale at distance 0, the second never tied with it', () => {
    expect(STYLES).toHaveLength(24);
    for (const s of STYLES) {
      const [a, b] = first(s.id);
      expect(a!.distance, s.id).toBe(0);
      expect(b!.distance, s.id).toBeGreaterThan(0.1);
    }
  });

  // (Jambot's ten: the prototype's eight, `PROTOTYPE_PRESETS`, and Electro swing and Spooky, #349; Jambot's lead keeps the
  // key's own scale at each, `melodicDefault` (yggi/jambot packages/engine/src/licence.ts @ b98e69f): the narrowest its
  // harmony reaches, the plain one everywhere, until defaults are set by ear)
  it('Jambot’s ten presets each find the key’s own scale, as its lead plays there: ten of ten', () => {
    const TEN = ['synthPop', 'techno', 'deepHouse', 'ambient', 'lofi', 'funk', 'bossaNova', 'swingJazz', 'electroSwing', 'spooky'];
    expect(TEN.map((id) => first(id)[0]!.fragment.id)).toEqual(TEN.map(() => 'plain'));
  });

  it('Blues shuffle finds the blues, Kinderlied the major pentatonic, and every other style the key’s own', () => {
    const found = Object.fromEntries(STYLES.map((s) => [s.id, first(s.id)[0]!.fragment.id]));
    expect(Object.entries(found).filter(([, id]) => id !== 'plain')).toEqual([
      ['kinderlied', 'pentatonic(phase=0)'],
      ['bluesShuffle', 'blues'],
    ]);
  });

  it('the minor pentatonic is found halfway between Swing jazz and Blues shuffle, where no preset is', () => {
    const [sj, bs] = [stylePoint('swingJazz'), stylePoint('bluesShuffle')];
    const half = Object.fromEntries(Object.keys(sj).map((a) => [a, (sj[a]! + bs[a]!) / 2]));
    const [a] = repository.query(half, 1, {}, { facet: 'melodic' });
    expect([a!.fragment.id, a!.distance]).toEqual(['pentatonic(phase=3)', 0]);
  });
});
