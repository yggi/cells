// The modes (#228, decision 056): four fragments that state a mode, `&key scale(mode, &tonic)`, each found first at
// distance 0 at the point of each of Jambot's presets that plays it; every harmony and bass seed fits a workbench with
// each and compiles there with no diagnostic; and the bell and scale, a mode and a rhythm in one, plays the bell and reads
// as the major scale.
import { bodyOf } from '../engine/use';
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { setTiming } from '../engine/edit';
import { planOf } from '../engine/host';
import { channelTable, midiNote, router, routesOf } from '../engine/midi';
import { windowAt } from '../engine/schedule';
import { fitsAs } from './fit';
import { expand } from '../engine/use';
import type { Resolve } from '../engine/program';
import { createRepository, type StylePoint } from './fragments';
import { holesOf } from './holes';

const RHYTHM_FRAGMENTS = seedFragments('rhythms');
const BASS_FRAGMENTS = seedFragments('bass');
const HARMONY_FRAGMENTS = seedFragments('harmony');
const INSTRUMENT_FRAGMENTS = seedFragments('instruments');
const MODE_FRAGMENTS = seedFragments('modes');

/** The bass instrument: `&bassV`, the voice the bass lines leave as a hole (#244). */
const AGOGO = INSTRUMENT_FRAGMENTS.find((f) => f.id === 'gm_kit')!
  .text.split('\n')
  .find((l) => l.startsWith('&highagogo '))!;
/** A text with the General MIDI kit's high agogô where it strikes one: the bell's hole, filled (#244). */
const filled = (text: string) => (text.includes('&highagogo') ? `${text}\n${AGOGO}` : text);
const BASS_VOICE = INSTRUMENT_FRAGMENTS.find((f) => f.id === 'bass')!.text;
import { LIBRARY, resolveSeed } from './library';
import { newPoint } from '../engine/migrate/axes';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, ELECTRO_SWING, FUNK, KINDERLIED, LO_FI, SPOOKY, stylePoint, SWING_JAZZ, SYNTH_POP, TECHNO } from './styles';
import { moodOf } from '../engine/style';
import { seedFragments } from './seed';

/** A fragment's text taken onto a workbench by its signature (`fitsAs`, decisions 065 and 075), as the fragment `x`, and written out (#588). */
const takenOn = (text: string, bench: string, main?: string) => {
  const resolve: Resolve = (id) => (id === 'x' ? text : resolveSeed(id));
  const fit = fitsAs('x', bench, { resolve, ...(main ? { main } : {}) });
  return { ...fit, union: { text: expand(fit.text, resolve) } };
};

type Mode = 'aeolian' | 'dorian' | 'ionian' | 'mixolydian' | 'harmonic' | 'phrygian' | 'lydian' | 'locrian';

// Lifted from yggi/jambot packages/engine/src/style.ts @ bf96210 (`PRESETS`, each preset's `mode`).
const PRESETS: { name: string; point: StylePoint; mode: Mode }[] = [
  { name: 'Synth-pop', point: SYNTH_POP, mode: 'aeolian' },
  { name: 'Techno', point: TECHNO, mode: 'aeolian' },
  { name: 'Deep house', point: DEEP_HOUSE, mode: 'dorian' },
  { name: 'Ambient', point: AMBIENT, mode: 'ionian' },
  { name: 'Lo-fi hip hop', point: LO_FI, mode: 'aeolian' },
  { name: 'Funk', point: FUNK, mode: 'dorian' },
  { name: 'Bossa nova', point: BOSSA_NOVA, mode: 'ionian' },
  { name: 'Swing jazz', point: SWING_JAZZ, mode: 'ionian' },
];

/** The diatonic modes as semitones from the tonic. */
const SCALE: Record<Mode, readonly number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};

/** The mode a fragment plays: `diatonic(mode=aeolian)` is aeolian (#387), any other its own id. */
const modeOf = (id: string) => /^diatonic\(mode=(\w+)\)$/.exec(id)?.[1] ?? id;
const byId = (id: string) => MODE_FRAGMENTS.find((f) => modeOf(f.id) === id)!;
const bell = byId('bell_and_scale');
const MODES = MODE_FRAGMENTS.filter((f) => f !== bell);
/** A workbench: a meter at 60 bpm, and the tonic the modes read (#290), C unless it says. */
const meter = (m = '4/4', tonic = 'C') => `${setTiming(`&bar meter("${m}")`, 'bar', 'step', '60bpm')}\n&tonic ${tonic}`;
/** A line that plays the main key's eight degrees up from the tonic, one a beat, on channel 3. */
const PROBE = '&tune over=&key step=4n 0 1 2 3 4 5 6 7\n&tuneV loop=C4\n&tuneOut map=midi(3) [&tune * &tuneV]';

/** What a text sends on a channel in its first `seconds`: each note's time and number, in time order. */
function sent(text: string, channel: number, seconds: number): { at: number; note: number }[] {
  const plan = planOf(text);
  const route = router(plan.result, channelTable(plan.result));
  return windowAt(plan, 0, seconds - 1e-9)
    .events.flatMap((e) => routesOf(route(e)).map((r) => midiNote(e, r)))
    .filter((n) => n && n.channel === channel)
    .map((n) => ({ at: Math.round(n!.at * 1e6) / 1e6, note: n!.note }))
    .sort((a, b) => a.at - b.at || a.note - b.note);
}

describe('the mode fragments', () => {
  it('are the seven diatonic modes, one fragment taken with each mode (#387), then the bell and scale and harmonic minor (yggi/jambot#516)', () => {
    expect(MODE_FRAGMENTS.map((f) => f.id)).toEqual([
      ...['aeolian', 'dorian', 'ionian', 'mixolydian', 'phrygian', 'lydian', 'locrian'].map((m) => `diatonic(mode=${m})`),
      'bell_and_scale',
      'harmonic_minor',
    ]);
  });

  it.each(MODE_FRAGMENTS.map((f) => [f.id, f.text]))('%s defines key and uses its tonic and nothing else but a sound, so it fits any meter', (id, text) => {
    const holes = holesOf(text, compileSource);
    expect(holes.uses).toEqual(id === 'bell_and_scale' ? ['&highagogo', '&tonic'] : ['&tonic']);
    expect(holes.defines).toContain('&key');
    for (const m of ['4/4', '6/8', '12/8', '7/8']) expect(takenOn(text, meter(m), '&tonic').fits, m).toBe(true);
  });

  it.each(MODE_FRAGMENTS.map((f) => [f.id, f.text]))('%s is the main key, and plays its mode up from C with no diagnostic', (id, text) => {
    const mode = (id === 'bell_and_scale' ? 'ionian' : id === 'harmonic_minor' ? 'harmonic' : modeOf(id)) as Mode;
    const piece = `${filled(takenOn(text, meter(), '&tonic').union.text)}\n${PROBE}`;
    expect(compileSource(piece).diagnostics.map((d) => d.message)).toEqual([]);
    expect(sent(piece, 3, 8).map((n) => n.note - 60)).toEqual([...SCALE[mode], 12]);
  });

  it('leave the tonic to the text that uses them: &tonic, a hole the workbench fills, which moves every note (#290)', () => {
    for (const f of MODE_FRAGMENTS) {
      expect(bodyOf(f.text)).toMatch(/^&key scale\((aeolian|dorian|ionian|mixolydian|harmonic|phrygian|lydian|locrian), &tonic\)/);
      expect(takenOn(f.text, '').missing).toEqual(['&tonic']);
      const inA = `${filled(takenOn(f.text, meter('4/4', 'A'), '&tonic').union.text)}\n${PROBE}`;
      const inC = `${filled(takenOn(f.text, meter(), '&tonic').union.text)}\n${PROBE}`;
      expect(sent(inA, 3, 8).map((n) => n.note)).toEqual(sent(inC, 3, 8).map((n) => n.note + 9));
    }
  });
});

describe('the presets find their modes', () => {
  const repository = createRepository(LIBRARY);
  it.each(PRESETS.map((p) => [p.name, p.mode, p.point] as const))('%s: %s, first and at distance 0', (_, mode, point) => {
    const [first, second] = repository.query(point, 2, {}, { facet: 'mode' });
    expect(first!.fragment.id).toBe(`diatonic(mode=${mode})`);
    expect(first!.distance).toBe(0);
    expect(second!.distance).toBeGreaterThan(0);
  });

  it('the point proposed for a Kinderlied preset finds ionian first, at distance 0, as Twinkle is major (yggi/jambot#547)', () => {
    const [first, second] = repository.query(KINDERLIED, 2, {}, { facet: 'mode' });
    expect([first!.fragment.id, first!.distance]).toEqual(['diatonic(mode=ionian)', 0]);
    expect(second!.distance).toBeGreaterThan(0);
  });

  it('each mode sits at its presets’ points and nowhere else; mixolydian, which no preset plays, halfway between Funk’s (dorian) and Bossa nova’s (ionian); harmonic minor at the points proposed for Electro swing and Spooky (#349); phrygian, lydian and locrian each at a point of its own, placed by hand', () => {
    // (placed by hand on the old axes, sync harm artic energy; moved by decision 076's rule, #572)
    const old = (sync: number, harm: number, artic: number, energy: number): StylePoint => newPoint({ sync, harm, artic, energy });
    const OWN: Record<string, StylePoint> = {
      phrygian: { ...old(0.6, 0.6, 0.7, 0.85), mood: moodOf('phrygian') },
      lydian: old(0.15, 0.6, 0.15, 0.3),
      locrian: old(0.9, 1, 0.6, 0.9),
    };
    for (const f of MODES) {
      const id = modeOf(f.id);
      const points =
        id === 'harmonic_minor'
          ? [ELECTRO_SWING, SPOOKY, stylePoint('chiptune')]
          : OWN[id]
            ? [OWN[id]!]
            : id === 'mixolydian'
              ? // (halfway between Funk's and Bossa nova's old points, sync .875 harm .485 artic .65 energy .6)
                [old((1 + 0.75) / 2, (0.12 + 0.85) / 2, (0.85 + 0.45) / 2, (0.75 + 0.45) / 2)]
              : PRESETS.filter((p) => p.mode === id).map((p) => p.point);
      // (ionian at the point proposed for a Kinderlied preset too: children's songs are major, yggi/jambot#547)
      // (each point's mood by decision 076's rule, #572: at a style's point, the style's, placed by hand; elsewhere its own
      // mode's, moodOf: mixolydian .75, phrygian .375, lydian .9, locrian .3)
      // (aeolian at the three styles read from the examples too, #572: Acid's, Happy hardcore's and Elektro's A minor)
      // (and #542's: ionian at Baroque, mixolydian at Blues shuffle, dorian at Sea shanty, harmonic minor at Chiptune)
      const also =
        id === 'ionian'
          ? [KINDERLIED, stylePoint('baroque')]
          : id === 'aeolian'
            ? ['acid', 'happyHardcore', 'elektro', 'darkAmbient'].map(stylePoint)
            : id === 'mixolydian'
              ? [stylePoint('bluesShuffle')]
              : id === 'dorian'
                ? [stylePoint('seaShanty')]
                : [];
      expect(f.association.map((wp) => wp.point)).toEqual([...points, ...also]);
      expect(f.association.every((wp) => wp.facet === 'mode' && wp.weight === 1)).toBe(true);
    }
  });

  it('a query for the meter, the bass, the harmony or the instrument at a preset finds what it did; for the rhythm, the same with the bell among them, never first', () => {
    const without = createRepository(LIBRARY.filter((f) => !MODE_FRAGMENTS.includes(f)));
    const ranked = (r: typeof repository, point: StylePoint, facet: string) => r.query(point, 50, {}, { facet }).map((f) => [f.fragment.id, f.distance]);
    for (const { point } of PRESETS) {
      for (const facet of ['meter', 'bass', 'harmony', 'instrument']) expect(ranked(repository, point, facet)).toEqual(ranked(without, point, facet));
      const rhythms = ranked(repository, point, 'rhythm');
      expect(rhythms.filter(([id]) => id !== 'bell_and_scale')).toEqual(ranked(without, point, 'rhythm'));
      expect(rhythms[0]![0]).not.toBe('bell_and_scale');
    }
  });
});

// (the harmonies read `key`; the bass lines read `&harm`: a workbench is a meter, a mode, a vamp and a line)
describe('the harmonies and the bass lines, over each mode', () => {
  it.each(MODE_FRAGMENTS.map((f) => [f.id, f.text]))('every vamp fits a workbench with %s, and compiles there with no diagnostic', (_, mode) => {
    const host = takenOn(mode, meter(), '&tonic').union.text;
    for (const vamp of HARMONY_FRAGMENTS) {
      const fit = takenOn(vamp.text, host, '&key');
      expect(fit.fits, vamp.id).toBe(true);
      expect(
        compileSource(`${filled(fit.union.text)}\n&padV loop=C4\n&pad map=midi(4) [&harm * &padV]`).diagnostics.map((d) => d.message),
        vamp.id,
      ).toEqual([]);
    }
  });

  it.each(MODE_FRAGMENTS.map((f) => [f.id, f.text]))('every bass line fits a workbench with %s and a vamp, and compiles there with no diagnostic', (_, mode) => {
    for (const vamp of HARMONY_FRAGMENTS) {
      const host = takenOn(vamp.text, takenOn(mode, meter(), '&tonic').union.text, '&key').union.text;
      for (const bass of BASS_FRAGMENTS) {
        const fit = takenOn(bass.text, host, '&harm');
        expect(fit.fits, `${bass.id} over ${vamp.id}`).toBe(true);
        expect(
          compileSource(`${filled(fit.union.text)}\n${BASS_VOICE}`).diagnostics.map((d) => d.message),
          `${bass.id} over ${vamp.id}`,
        ).toEqual([]);
      }
    }
  });
});

describe('the bell and scale', () => {
  it('is a mode where the major is played (the centroid of the ionian presets) and a rhythm elsewhere, found first at each, where no preset is', () => {
    expect(bell.association.map((wp) => wp.facet)).toEqual(['mode', 'rhythm']);
    const ionian = PRESETS.filter((p) => p.mode === 'ionian').map((p) => p.point);
    const centroid = Object.fromEntries(Object.keys(AMBIENT).map((axis) => [axis, Math.round((1000 * ionian.reduce((sum, p) => sum + p[axis]!, 0)) / ionian.length) / 1000]));
    // (placed on the old axes at the centroid, each to three places: sync, harm and bite to within that rounding)
    for (const axis of ['sync', 'harm', 'bite']) expect(Math.abs(bell.association[0]!.point[axis]! - centroid[axis]!), axis).toBeLessThanOrEqual(0.001);
    // (its mood is its own mode's, ionian's at a quarter's tension: a mode point takes a style's only where it sits at one, #572)
    expect(bell.association[0]!.point.mood).toBe(moodOf('ionian'));
    expect(bell.association[1]!.point).not.toEqual(centroid);
    const repository = createRepository(LIBRARY);
    for (const wp of bell.association) {
      expect(repository.query(wp.point, 1, {}, { facet: wp.facet })[0]!.fragment.id).toBe('bell_and_scale');
      for (const { point } of PRESETS) expect(wp.point).not.toEqual(point);
    }
  });

  it('strikes the bell, x.x.xx.x.x.x, seven strokes over the twelve twelfths of any bar, on the high agogô (67)', () => {
    for (const m of ['12/8', '4/4', '6/8']) {
      const text = filled(takenOn(bell.text, meter(m), '&tonic').union.text);
      const bar = compileSource(text).cells.get('bar')!.meter!;
      const seconds = bar.beats.length; // (at 60 bpm, a beat a second)
      const hits = sent(text, 10, 2 * seconds);
      expect(new Set(hits.map((h) => h.note))).toEqual(new Set([67]));
      const bars = hits.map((h) => (12 * h.at) / seconds);
      expect(
        bars.map((t) => Math.round(t * 1e3) / 1e3),
        m,
      ).toEqual([0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23]);
    }
  });

  it('plays every vamp and bass line note for note as the ionian fragment does: a stepped key nothing plays doesn’t turn', () => {
    const ionian = byId('ionian').text;
    const melodic = (t: string) => sent(t, 2, 32).concat(sent(t, 4, 32));
    for (const vamp of HARMONY_FRAGMENTS)
      for (const bass of BASS_FRAGMENTS) {
        const over = (mode: string) =>
          `${filled(takenOn(bass.text, takenOn(vamp.text, takenOn(mode, meter(), '&tonic').union.text, '&key').union.text, '&harm').union.text)}\n${BASS_VOICE}\n&padV loop=C4\n&pad map=midi(4) [&harm * &padV]`;
        expect(melodic(over(bell.text)), `${bass.id} over ${vamp.id}`).toEqual(melodic(over(ionian)));
      }
  });

  it('layers on every rhythm, and its high agogô is a hole the General MIDI kit fills (#244)', () => {
    const gmKit = INSTRUMENT_FRAGMENTS.find((f) => f.id === 'gm_kit')!;
    expect(gmKit.text.split('\n').some((l) => l.startsWith('&highagogo '))).toBe(true);
    expect(bell.text).not.toMatch(/^&highagogo /m);
    const alone = takenOn(bell.text, meter(), '&tonic');
    expect([alone.fits, alone.sounds]).toEqual([true, ['&highagogo']]);
    expect(takenOn(bell.text, `${meter()}\n${gmKit.text}`, '&tonic').sounds).toEqual([]);
    for (const rhythm of RHYTHM_FRAGMENTS) {
      const fit = takenOn(bell.text, takenOn(rhythm.text, meter()).union.text, '&tonic');
      expect(fit.fits, rhythm.id).toBe(true);
      // (the rhythm's voices and the bell's are holes the General MIDI kit fills)
      expect(
        compileSource(`${fit.union.text}\n${gmKit.text}`).diagnostics.map((d) => d.message),
        rhythm.id,
      ).toEqual([]);
    }
  });
});
