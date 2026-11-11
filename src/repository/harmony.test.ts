// The harmonies (#219, yggi/jambot#425): Jambot's mode vamps as fragments over the host's key. The twelve vamps of the four
// modes are five texts; each fits a host that writes `&bar` and `key` in every mode, plays there the chords `themes.ts`
// writes for each vamp it is, degree for degree and bar for bar over eight bars, and is found at distance 0 at the point
// of each preset whose mode plays it, beside that mode's other vamps. The bass lines read it as their chord in force.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { flatten } from '../engine/flatten';
import { planOf } from '../engine/host';
import { channelTable, midiNote, router, routesOf } from '../engine/midi';
import { codeShifts } from '../engine/program';
import { windowAt } from '../engine/schedule';
import { fitsAs } from './fit';
import { expand } from '../engine/use';
import type { Resolve } from '../engine/program';
import { createRepository, fragmentDistance, type StylePoint } from './fragments';
import { holesOf } from './holes';
import { LIBRARY, resolveSeed } from './library';
import { AMBIENT, at, BOSSA_NOVA, DEEP_HOUSE, ELECTRO_SWING, FUNK, KINDERLIED, LO_FI, SPOOKY, SWING_JAZZ, stylePoint, SYNTH_POP, TECHNO } from './styles';
import { SEED, seedFragments } from './seed';

const BASS_FRAGMENTS = seedFragments('bass');
const HARMONY_FRAGMENTS = seedFragments('harmony');
const INSTRUMENT_FRAGMENTS = seedFragments('instruments');

/** A fragment's text taken onto a workbench by its signature (`fitsAs`, decisions 065 and 075), as the fragment `x`, and written out (#588). */
const takenOn = (text: string, bench: string, main?: string) => {
  const resolve: Resolve = (id) => (id === 'x' ? text : resolveSeed(id));
  const fit = fitsAs('x', bench, { resolve, ...(main ? { main } : {}) });
  return { ...fit, union: { text: expand(fit.text, resolve) } };
};

/** The bass instrument: `&bassV`, the voice the bass lines leave as a hole (#244). */
/** The vamps, Jambot's themes' (`VAMPS`); the harmony written by hand for the point proposed for Spooky (#349) is not one. */
const VAMP_FRAGMENTS = HARMONY_FRAGMENTS.filter(
  (f) =>
    ![
      'dark_cadence',
      'haunted_progression',
      'axis_progression',
      'fifths_sequence',
      'twelve_bar',
      'korobeiniki_changes',
      'montuno',
      // (#540: the progressions written for the presets whose first harmony missed)
      'ninth_vamp',
      'ninth_loop',
      'turnaround',
      'ii_v_i',
      'minor_swing',
    ].includes(f.id),
);

const BASS_VOICE = INSTRUMENT_FRAGMENTS.find((f) => f.id === 'bass')!.text;
/** The bass line played on the bass voice, sent on MIDI channel 2 (#673: a line no card plays sends nothing). */
const BASS_CARD = '&bassOut play=&bassline &bassV\n&bassMidi map=midi ~ &bassOut';
/** The lines that rest on the downbeat: the pump, and the tumbao (#542). */
const RESTS_ON_DOWNBEAT = new Set(['pumping_bass', 'tumbao_bass']);

type Mode = 'aeolian' | 'dorian' | 'ionian' | 'mixolydian';
const MODES: readonly Mode[] = ['aeolian', 'dorian', 'ionian', 'mixolydian'];

// Lifted from yggi/jambot packages/engine/src/themes.ts @ 0a56da9: `VAMPS`, and `buildTheme`'s layout of a vamp under
// harm 0.15 (`each` 4: the first four bars `chords[⌊b / 4⌋ % n]`, the second four `chords[1 % n]`), and from 0.15 to 0.33
// (`each` 2: `chords[⌊b / 2⌋ % n]`, the second four the first again).
const VAMPS: Record<Mode, readonly (readonly number[])[]> = {
  aeolian: [[0], [0, 6], [0, 3], [0, 5]],
  dorian: [[0, 3], [0], [0, 6]],
  ionian: [
    [0, 3],
    [0, 4],
    [0, 5],
  ],
  mixolydian: [
    [0, 6],
    [0, 3],
  ],
};
function layout(chords: readonly number[], harm: number): number[] {
  const each = harm < 0.15 ? 4 : 2;
  const first = [0, 1, 2, 3].map((b) => chords[Math.floor(b / each) % chords.length]!);
  const second = each === 4 ? [0, 1, 2, 3].map(() => chords[1 % chords.length]!) : first;
  return [...first, ...second];
}

// Lifted from yggi/jambot packages/engine/src/style.ts @ 0a56da9 (`PRESETS`): the presets whose harmony vamps (under
// 0.33), each with its mode. No preset is mixolydian. Ambient's harmony, 0.3, lays a vamp two bars a chord; the files sit
// at its point with the harmony at Funk's 0.12, where `buildTheme` lays it four bars a chord, as they write it.
const AMBIENT_VAMPED = at(AMBIENT.sync!, 0.12, AMBIENT.bite!, AMBIENT.mood!);
const POINT: Partial<Record<Mode, StylePoint>> = { aeolian: TECHNO, dorian: FUNK, ionian: AMBIENT_VAMPED };

/** The diatonic modes as semitones from the tonic, for the pitch classes a key in each plays. */
const SCALE: Record<Mode, readonly number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
};
const TONIC = 9; // A
const pc = (x: number) => ((x % 12) + 12) % 12;
/** The triad on a degree of a key in a mode, as pitch classes, low to high as the triad stacks. */
const triad = (mode: Mode, degree: number): number[] => [0, 2, 4].map((k) => pc(TONIC + SCALE[mode][(degree + k) % 7]!)).sort((a, b) => a - b);

const host = (mode: Mode) => `&bar meter("4/4") step=120bpm\n&key scale(${mode}, A)`;
/** A card that plays the chord in force, so a host with nothing else plays it (as the meters' frame does). */
const PROBE = '&padV loop=C4\n&pad map=midi(3) [&harm * &padV]';
const byDegrees = (chords: readonly number[]) => VAMP_FRAGMENTS.find((f) => degreesOf(f.text).join() === layout(chords, 0).join())!;

/** The degree of the chord each bar plays (the stack's lowest), over the eight bars of the lap, read off the compiler. */
function degreesOf(fragment: string): number[] {
  const r = compileSource(`${host('aeolian')}\n${fragment}`);
  const bars = new Map<number, number[]>();
  for (const e of flatten(r, 'harm', codeShifts(r))) bars.set(e.step, [...(bars.get(e.step) ?? []), e.value]);
  return [...bars].sort((a, b) => a[0] - b[0]).map(([, stack]) => Math.min(...stack));
}

/** What a text sends on channel 3 over eight bars of 4/4 at 120 bpm: each bar's pitch classes, sorted. */
function chordsPlayed(text: string): number[][] {
  const plan = planOf(text);
  const bar = 2;
  const route = router(plan.result, channelTable(plan.result));
  const bars: number[][] = Array.from({ length: 8 }, () => []);
  for (const e of windowAt(plan, 0, 8 * bar - 1e-9).events)
    for (const r of routesOf(route(e))) {
      const note = midiNote(e, r);
      if (note && note.channel === 3) bars[Math.floor(note.at / bar + 1e-9)]!.push(pc(note.note));
    }
  return bars.map((b) => [...new Set(b)].sort((x, y) => x - y));
}

describe('the harmonies', () => {
  it('are five vamps, each one or two triads over the key, eight bars a lap, the dark cadence, the haunted progression and the axis progression (#572), and the progressions written for the styles (#542, #540)', () => {
    expect(HARMONY_FRAGMENTS.map((f) => f.id)).toEqual([
      'tonic_vamp',
      'vamp_to_the_seventh',
      'vamp_to_the_fourth',
      'vamp_to_the_sixth',
      'vamp_to_the_fifth',
      'dark_cadence',
      'haunted_progression',
      'axis_progression',
      'fifths_sequence',
      'twelve_bar',
      'korobeiniki_changes',
      'montuno',
      'ninth_vamp',
      'ninth_loop',
      'turnaround',
      'ii_v_i',
      'minor_swing',
    ]);
    expect(VAMP_FRAGMENTS.map((f) => degreesOf(f.text))).toEqual([[0], [0, 6], [0, 3], [0, 5], [0, 4]].map((chords) => layout(chords, 0)));
  });

  it("are every mode's vamps, each of the twelve one of the five", () => {
    const vamps = MODES.flatMap((mode) => VAMPS[mode].map((chords) => byDegrees(chords).id));
    expect(vamps).toHaveLength(12);
    expect(new Set(vamps)).toEqual(new Set(VAMP_FRAGMENTS.map((f) => f.id)));
  });

  it.each(HARMONY_FRAGMENTS.map((f) => [f.id, f.text]))('%s uses the key and defines &harm, and nothing else', (_, text) => {
    expect(holesOf(text, compileSource)).toEqual({
      uses: ['&key'],
      sounds: [],
      lines: [],
      defines: ['&harm'],
      clock: [],
      signature: { heads: ['&harm'], optional: [], main: '&key' },
    });
    expect(takenOn(text, '').missing).toEqual(['&key']);
  });

  for (const mode of MODES)
    describe(`in ${mode}`, () => {
      it.each(HARMONY_FRAGMENTS.map((f) => [f.id, f.text]))('%s fits a host in A, and compiles there with no diagnostic', (_, text) => {
        const fit = takenOn(text, host(mode), '&key');
        expect(fit.fits).toBe(true);
        expect(compileSource(`${fit.union.text}\n${PROBE}`).diagnostics.map((d) => d.message)).toEqual([]);
      });

      it.each(VAMPS[mode].map((chords) => [chords.join(', '), chords]))('its vamp [%s] plays the chords themes.ts writes, bar for bar over eight bars', (_, chords) => {
        const text = `${takenOn(byDegrees(chords).text, host(mode), '&key').union.text}\n${PROBE}`;
        expect(chordsPlayed(text)).toEqual(layout(chords, 0).map((degree) => triad(mode, degree)));
      });
    });

  it('lays each vamp out as themes.ts does under harm 0.15, and not as it does from 0.15 to 0.33 (two bars a chord), which differs for every two-chord vamp', () => {
    for (const f of VAMP_FRAGMENTS) {
      const degrees = degreesOf(f.text);
      const chords = [...new Set(degrees)];
      expect(degrees).toEqual(layout(chords, 0.12));
      if (chords.length === 2) expect(degrees).not.toEqual(layout(chords, 0.3));
    }
  });

  const repository = createRepository(LIBRARY);
  it.each(Object.entries(POINT))("a query for the harmony at %s's point finds that mode's vamps, all of them at distance 0, and only them", (mode, point) => {
    const found = repository.query(point!, 5, {}, { facet: 'harmony' });
    const near = found.filter((f) => f.distance === 0).map((f) => f.fragment.id);
    expect(new Set(near)).toEqual(new Set(VAMPS[mode as Mode].map((chords) => byDegrees(chords).id)));
    expect(near).toHaveLength(VAMPS[mode as Mode].length);
  });

  it("sit at those points only: Techno's and Funk's exactly, Ambient's with its harmony at 0.12; mixolydian adds none; the vamp to the fifth at Kinderlied's too, at weight 0.5, and the tonic vamp at Acid's and Dark ambient's, at weight 0.4", () => {
    for (const f of VAMP_FRAGMENTS) {
      const modes = MODES.filter((mode) => POINT[mode] && VAMPS[mode].some((chords) => byDegrees(chords) === f));
      const atModes = modes.map((mode) => ({ point: POINT[mode], weight: 1, facet: 'harmony' }));
      // (and the tonic vamp at Acid's point, the one chord its riff turns on, at weight 0.4 so Synth-pop, 0.272 away, keeps its own, #572)
      // (#542's second four: the vamp to the fifth at Waltz's and March's, their tonic and dominant, and the vamp to the sixth
      // at Trip-hop's, its i–♭VI, each at weight 0.4)
      const also =
        f.id === 'vamp_to_the_fifth'
          ? [{ point: KINDERLIED, weight: 0.5, facet: 'harmony' }, ...[stylePoint('waltz'), stylePoint('march')].map((point) => ({ point, weight: 0.4, facet: 'harmony' }))]
          : f.id === 'tonic_vamp'
            ? [stylePoint('acid'), stylePoint('darkAmbient')].map((point) => ({ point, weight: 0.4, facet: 'harmony' }))
            : // (and the vamp to the seventh at Sea shanty's, the shanty's i–♭VII, at weight 0.4, #542)
              f.id === 'vamp_to_the_seventh'
              ? [{ point: stylePoint('seaShanty'), weight: 0.4, facet: 'harmony' }]
              : f.id === 'vamp_to_the_sixth'
                ? [{ point: stylePoint('tripHop'), weight: 0.4, facet: 'harmony' }]
                : [];
      expect(f.association, f.id).toEqual([...atModes, ...also]);
    }
  });

  it('the point proposed for a Kinderlied preset finds the vamp to the fifth first, at distance 0, its tonic and dominant (yggi/jambot#547)', () => {
    const [first, second] = createRepository(LIBRARY).query(KINDERLIED, 2, {}, { facet: 'harmony' });
    expect([first!.fragment.id, first!.distance]).toEqual(['vamp_to_the_fifth', 0]);
    expect(second!.distance).toBeGreaterThan(0);
  });

  it('each file names every mode that plays it', () => {
    for (const file of SEED.filter((s) => s.path.startsWith('harmony/'))) {
      const modes = MODES.filter((mode) => VAMPS[mode].some((chords) => byDegrees(chords) === file.fragment));
      for (const mode of modes) expect(file.prose, `${file.fragment.id}: ${mode}`).toContain(`\`${mode}\``);
    }
  });

  // (the bass lines read `&harm`, the chord in force: each of the five fits a host with a vamp, and plays its root there)
  it.each(BASS_FRAGMENTS.map((b) => [b.id, b.text]))('the %s fits every vamp in every mode, and plays the root of each bar’s chord on the downbeat', (id, bass) => {
    // (#542: the waltz bass is a bar of 3/4, taken on the same host in 3/4, whose bar at 120 bpm is 1.5 s)
    const [meter, bar] = id === 'waltz_bass' ? ['3/4', 1.5] : ['4/4', 2];
    for (const mode of MODES)
      for (const f of HARMONY_FRAGMENTS) {
        const fit = takenOn(bass, takenOn(f.text, host(mode).replace('meter("4/4")', `meter("${meter}")`), '&key').union.text, '&harm');
        expect(fit.fits, `${f.id} in ${mode}`).toBe(true);
        const plan = planOf(`${fit.union.text}\n${BASS_VOICE}\n${BASS_CARD}\n${PROBE}`);
        const route = router(plan.result, channelTable(plan.result));
        const notes = windowAt(plan, 0, 8 * bar - 1e-9)
          .events.flatMap((e) => routesOf(route(e)).map((r) => midiNote(e, r)))
          .filter((n) => n !== null);
        const onDownbeat = (at: number) => Math.abs(at / bar - Math.round(at / bar)) < 1e-9;
        const downbeats = notes.filter((n) => n.channel === 2 && onDownbeat(n.at));
        // (the pump and the tumbao rest on the downbeat; every other line plays a note on each, #673)
        if (!RESTS_ON_DOWNBEAT.has(id)) expect(downbeats.length, `${f.id} in ${mode}: a note on each of the 8 downbeats`).toBe(8);
        // (the chord in force there, as the probe plays it on channel 3: its lowest note, the root, the degrees stacked up;
        // read off what sounds, so a harmony that moves each half bar, or under a bar of 3/4, is read where it is)
        const root = (at: number) => pc(Math.min(...notes.filter((n) => n.channel === 3 && n.at <= at + 1e-9 && n.end > at + 1e-9).map((n) => n.note)));
        for (const n of downbeats) expect(pc(n.note), `${f.id} in ${mode}, bar ${Math.round(n.at / bar)}`).toBe(root(n.at));
      }
  });
});

describe('the dark cadence (#349)', () => {
  const cadence = HARMONY_FRAGMENTS.find((f) => f.id === 'dark_cadence')!;
  it('is i, ♭VI, iv and V, a chord a bar, four bars a lap', () => {
    expect(degreesOf(cadence.text)).toEqual([0, 5, 3, 4]);
  });

  it('in D harmonic minor plays D minor, B♭ major, G minor and A major: the fifth a dominant', () => {
    const host = '&bar meter("4/4") step=120bpm\n&tonic D\n&key scale(harmonic, &tonic)';
    const text = `${takenOn(cadence.text, host, '&key').union.text}\n${PROBE}`;
    const dm = [2, 5, 9],
      bb = [2, 5, 10],
      gm = [2, 7, 10],
      a = [1, 4, 9];
    expect(chordsPlayed(text)).toEqual([dm, bb, gm, a, dm, bb, gm, a]);
  });

  it('sits at the point proposed for Spooky alone, found there first at distance 0', () => {
    expect(cadence.association).toEqual([{ point: SPOOKY, weight: 0.4, facet: 'harmony' }]);
    expect(
      createRepository(LIBRARY)
        .query(SPOOKY, 1, {}, { facet: 'harmony' })
        .map((f) => [f.fragment.id, f.distance]),
    ).toEqual([['dark_cadence', 0]]);
  });
});

describe('the haunted progression', () => {
  const haunted = HARMONY_FRAGMENTS.find((f) => f.id === 'haunted_progression')!;
  it('is i, III, iv, V, ♭VI, ii, V and i, a chord a bar, eight bars a lap: a progression Jambot reads', () => {
    expect(degreesOf(haunted.text)).toEqual([0, 2, 3, 4, 5, 1, 4, 0]);
  });

  it('in D harmonic minor passes through both unstable triads: F augmented and E diminished', () => {
    const host = '&bar meter("4/4") step=120bpm\n&tonic D\n&key scale(harmonic, &tonic)';
    const text = `${takenOn(haunted.text, host, '&key').union.text}\n${PROBE}`;
    const dm = [2, 5, 9],
      faug = [1, 5, 9],
      gm = [2, 7, 10],
      a = [1, 4, 9],
      bb = [2, 5, 10],
      edim = [4, 7, 10];
    expect(chordsPlayed(text)).toEqual([dm, faug, gm, a, bb, edim, a, dm]);
  });

  // (at weight 0.4, as the dark cadence is, so it is found within Jambot's miss distance, 0.3, of Spooky's point alone, #404)
  it('sits 0.05 below Spooky in bite (its energy offset, on the axes before decision 076, #572) at weight 0.4, the nearest harmony Jambot reads there, and more than 0.3 from every other preset', () => {
    expect(haunted.association).toEqual([{ point: { ...SPOOKY, bite: 0.25 }, weight: 0.4, facet: 'harmony' }]);
    const repository = createRepository(LIBRARY);
    expect(repository.query(SPOOKY, 2, {}, { facet: 'harmony' }).map((f) => [f.fragment.id, Math.round(f.distance * 100) / 100])).toEqual([
      ['dark_cadence', 0],
      // (0.05 off on one of four axes, at weight 0.4: as before decision 076, 0.06)
      ['haunted_progression', 0.06],
    ]);
    const others = { SYNTH_POP, TECHNO, DEEP_HOUSE, AMBIENT, LO_FI, FUNK, BOSSA_NOVA, SWING_JAZZ, ELECTRO_SWING };
    for (const [name, point] of Object.entries(others)) expect(fragmentDistance(haunted, point, {}, 'harmony'), name).toBeGreaterThan(0.3);
  });
});
