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
import { BASS_FRAGMENTS } from './bass';
import { fitOf } from './fit';
import { createRepository, type StylePoint } from './fragments';
import { HARMONY_FRAGMENTS } from './harmony';
import { holesOf } from './holes';
import { INSTRUMENT_FRAGMENTS } from './instruments';

/** The bass instrument: `&bassV`, the voice the bass lines leave as a hole (#244). */
const AGOGO = INSTRUMENT_FRAGMENTS.find((f) => f.id === 'gm_kit')!
  .text.split('\n')
  .find((l) => l.startsWith('&highagogo '))!;
/** A text with the General MIDI kit's high agogô where it strikes one: the bell's hole, filled (#244). */
const filled = (text: string) => (text.includes('&highagogo') ? `${text}\n${AGOGO}` : text);
const BASS_VOICE = INSTRUMENT_FRAGMENTS.find((f) => f.id === 'bass')!.text;
import { LIBRARY } from './library';
import { MODE_FRAGMENTS } from './modes';
import { AMBIENT, at, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SPOOKY, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';

/** The point proposed for an Electro swing preset, as harmonic minor's file writes it: no preset of Jambot's (decision 041). */
const PROPOSED = at(0.55, 0.75, 0.6, 0.75);
import { RHYTHM_FRAGMENTS } from './rhythms';

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

const byId = (id: string) => MODE_FRAGMENTS.find((f) => f.id === id)!;
const bell = byId('bell and scale');
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
  it('are the four modes of Jambot’s composer, the bell and scale, harmonic minor, the electroswing example’s, then the other three of the seven (yggi/jambot#516)', () => {
    expect(MODE_FRAGMENTS.map((f) => f.id)).toEqual(['aeolian', 'dorian', 'ionian', 'mixolydian', 'bell and scale', 'harmonic minor', 'phrygian', 'lydian', 'locrian']);
  });

  it.each(MODE_FRAGMENTS.map((f) => [f.id, f.text]))('%s defines key and uses its tonic and nothing else but a sound, so it fits any meter', (id, text) => {
    const holes = holesOf(text, compileSource);
    expect(holes.uses).toEqual(id === 'bell and scale' ? ['&highagogo', '&tonic'] : ['&tonic']);
    expect(holes.defines).toContain('&key');
    for (const m of ['4/4', '6/8', '12/8', '7/8']) expect(fitOf(text, meter(m)).fits, m).toBe(true);
  });

  it.each(MODE_FRAGMENTS.map((f) => [f.id, f.text]))('%s is the main key, and plays its mode up from C with no diagnostic', (id, text) => {
    const mode = (id === 'bell and scale' ? 'ionian' : id === 'harmonic minor' ? 'harmonic' : id) as Mode;
    const piece = `${filled(fitOf(text, meter()).union.text)}\n${PROBE}`;
    expect(compileSource(piece).diagnostics.map((d) => d.message)).toEqual([]);
    expect(sent(piece, 3, 8).map((n) => n.note - 60)).toEqual([...SCALE[mode], 12]);
  });

  it('leave the tonic to the text that uses them: &tonic, a hole the workbench fills, which moves every note (#290)', () => {
    for (const f of MODE_FRAGMENTS) {
      expect(bodyOf(f.text)).toMatch(/^&key scale\((aeolian|dorian|ionian|mixolydian|harmonic|phrygian|lydian|locrian), &tonic\)/);
      expect(fitOf(f.text, setTiming('&bar meter("4/4")', 'bar', 'step', '60bpm')).missing).toEqual(['&tonic']);
      const inA = `${filled(fitOf(f.text, meter('4/4', 'A')).union.text)}\n${PROBE}`;
      const inC = `${filled(fitOf(f.text, meter()).union.text)}\n${PROBE}`;
      expect(sent(inA, 3, 8).map((n) => n.note)).toEqual(sent(inC, 3, 8).map((n) => n.note + 9));
    }
  });
});

describe('the presets find their modes', () => {
  const repository = createRepository(LIBRARY);
  it.each(PRESETS.map((p) => [p.name, p.mode, p.point] as const))('%s: %s, first and at distance 0', (_, mode, point) => {
    const [first, second] = repository.query(point, 2, {}, { facet: 'mode' });
    expect(first!.fragment.id).toBe(mode);
    expect(first!.distance).toBe(0);
    expect(second!.distance).toBeGreaterThan(0);
  });

  it('each mode sits at its presets’ points and nowhere else; mixolydian, which no preset plays, halfway between Funk’s (dorian) and Bossa nova’s (ionian); harmonic minor at the points proposed for Electro swing and Spooky (#349); phrygian, lydian and locrian each at a point of its own, placed by hand', () => {
    const OWN: Record<string, StylePoint> = { phrygian: at(0.6, 0.6, 0.7, 0.85), lydian: at(0.15, 0.6, 0.15, 0.3), locrian: at(0.9, 1, 0.6, 0.9) };
    for (const f of MODES) {
      const points =
        f.id === 'harmonic minor'
          ? [PROPOSED, SPOOKY]
          : OWN[f.id]
            ? [OWN[f.id]!]
            : f.id === 'mixolydian'
              ? [Object.fromEntries(Object.keys(FUNK).map((axis) => [axis, (FUNK[axis]! + BOSSA_NOVA[axis]!) / 2]))]
              : PRESETS.filter((p) => p.mode === f.id).map((p) => p.point);
      expect(f.association.map((wp) => wp.point)).toEqual(points);
      expect(f.association.every((wp) => wp.facet === 'mode' && wp.weight === 1)).toBe(true);
    }
  });

  it('a query for the meter, the bass, the harmony or the instrument at a preset finds what it did; for the rhythm, the same with the bell among them, never first', () => {
    const without = createRepository(LIBRARY.filter((f) => !MODE_FRAGMENTS.includes(f)));
    const ranked = (r: typeof repository, point: StylePoint, facet: string) => r.query(point, 50, {}, { facet }).map((f) => [f.fragment.id, f.distance]);
    for (const { point } of PRESETS) {
      for (const facet of ['meter', 'bass', 'harmony', 'instrument']) expect(ranked(repository, point, facet)).toEqual(ranked(without, point, facet));
      const rhythms = ranked(repository, point, 'rhythm');
      expect(rhythms.filter(([id]) => id !== 'bell and scale')).toEqual(ranked(without, point, 'rhythm'));
      expect(rhythms[0]![0]).not.toBe('bell and scale');
    }
  });
});

// (the harmonies read `key`; the bass lines read `&harm`: a workbench is a meter, a mode, a vamp and a line)
describe('the harmonies and the bass lines, over each mode', () => {
  it.each(MODE_FRAGMENTS.map((f) => [f.id, f.text]))('every vamp fits a workbench with %s, and compiles there with no diagnostic', (_, mode) => {
    const host = fitOf(mode, meter()).union.text;
    for (const vamp of HARMONY_FRAGMENTS) {
      const fit = fitOf(vamp.text, host);
      expect(fit.fits, vamp.id).toBe(true);
      expect(
        compileSource(`${filled(fit.union.text)}\n&padV loop=C4\n&pad map=midi(4) [&harm * &padV]`).diagnostics.map((d) => d.message),
        vamp.id,
      ).toEqual([]);
    }
  });

  it.each(MODE_FRAGMENTS.map((f) => [f.id, f.text]))('every bass line fits a workbench with %s and a vamp, and compiles there with no diagnostic', (_, mode) => {
    for (const vamp of HARMONY_FRAGMENTS) {
      const host = fitOf(vamp.text, fitOf(mode, meter()).union.text).union.text;
      for (const bass of BASS_FRAGMENTS) {
        const fit = fitOf(bass.text, host);
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
    expect(bell.association[0]!.point).toEqual(centroid);
    expect(bell.association[1]!.point).not.toEqual(centroid);
    const repository = createRepository(LIBRARY);
    for (const wp of bell.association) {
      expect(repository.query(wp.point, 1, {}, { facet: wp.facet })[0]!.fragment.id).toBe('bell and scale');
      for (const { point } of PRESETS) expect(wp.point).not.toEqual(point);
    }
  });

  it('strikes the bell, x.x.xx.x.x.x, seven strokes over the twelve twelfths of any bar, on the high agogô (67)', () => {
    for (const m of ['12/8', '4/4', '6/8']) {
      const text = filled(fitOf(bell.text, meter(m)).union.text);
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
          `${filled(fitOf(bass.text, fitOf(vamp.text, fitOf(mode, meter()).union.text).union.text).union.text)}\n${BASS_VOICE}\n&padV loop=C4\n&pad map=midi(4) [&harm * &padV]`;
        expect(melodic(over(bell.text)), `${bass.id} over ${vamp.id}`).toEqual(melodic(over(ionian)));
      }
  });

  it('layers on every rhythm, and its high agogô is a hole the General MIDI kit fills (#244)', () => {
    const gmKit = INSTRUMENT_FRAGMENTS.find((f) => f.id === 'gm_kit')!;
    expect(gmKit.text.split('\n').some((l) => l.startsWith('&highagogo '))).toBe(true);
    expect(bell.text).not.toMatch(/^&highagogo /m);
    const alone = fitOf(bell.text, meter());
    expect([alone.fits, alone.sounds]).toEqual([true, ['&highagogo']]);
    expect(fitOf(bell.text, `${meter()}\n${gmKit.text}`).sounds).toEqual([]);
    for (const rhythm of RHYTHM_FRAGMENTS) {
      const fit = fitOf(bell.text, fitOf(rhythm.text, meter()).union.text);
      expect(fit.fits, rhythm.id).toBe(true);
      expect(fit.union.renamed.size, rhythm.id).toBe(0);
      // (the rhythm's voices and the bell's are holes the General MIDI kit fills)
      expect(
        compileSource(`${fit.union.text}\n${gmKit.text}`).diagnostics.map((d) => d.message),
        rhythm.id,
      ).toEqual([]);
    }
  });
});
