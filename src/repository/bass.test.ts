// The bass lines (#207, yggi/jambot#423): Jambot's five bass patterns as fragments over the chord in force. Each fits a
// host that writes `&bar` and `&harm`, plays there what `bass.ts` plays for its pattern alone at its point wherever that is
// certain (and one of the notes it draws where it draws), sits where `bass.ts` plays its pattern most, and is found
// first there by a query for the bass.
import { describe, expect, it } from 'vitest';
import { planOf } from '../engine/host';
import { channelTable, midiNote, router, routesOf } from '../engine/midi';
import { windowAt } from '../engine/schedule';
import { fitsAs } from './fit';
import { expand } from '../engine/use';
import type { Resolve } from '../engine/program';
import { createRepository, type StylePoint } from './fragments';
import { holesOf } from './holes';
import { compileSource } from '../engine/compile';
import { heard } from './heard';
import { LIBRARY, resolveSeed } from './library';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, ELECTRO_SWING, FUNK, KINDERLIED, LO_FI, SPOOKY, stylePoint, SWING_JAZZ, SYNTH_POP, TECHNO } from './styles';
import { newPoint } from '../engine/migrate/axes';
import { seedFragments } from './seed';

const BASS_FRAGMENTS = seedFragments('bass');
const INSTRUMENT_FRAGMENTS = seedFragments('instruments');

/** A fragment's text taken onto a workbench by its signature (`fitsAs`, decisions 065 and 075), as the fragment `x`, and written out (#588). */
const takenOn = (text: string, bench: string, main?: string) => {
  const resolve: Resolve = (id) => (id === 'x' ? text : resolveSeed(id));
  const fit = fitsAs('x', bench, { resolve, ...(main ? { main } : {}) });
  return { ...fit, union: { text: expand(fit.text, resolve) } };
};

const PATTERNS = ['root', 'pump', 'eight', 'funk', 'walk'] as const;
type Pattern = (typeof PATTERNS)[number];
const ID: Record<Pattern, string> = { root: 'root_bass', pump: 'pumping_bass', eight: 'eighths_bass', funk: 'funk_bass', walk: 'walking_bass' };
const byId = (id: string) => BASS_FRAGMENTS.find((f) => f.id === id)!;

// Lifted from yggi/jambot packages/engine/src/bass.ts @ 1037a80: each pattern's weights on 4/4's sixteen steps
// (`patternsOn` over 4/4: the root on the downbeat and the half, the pump on the eighth after each pulse, the eighths with
// the downbeat and the half stronger, `FUNK` as written, the walk on every pulse), and the blend (`bassBlend`), its
// `eighth` the meter's swing on 8n (`eighthSwing`: 1 under Swing jazz's 2/3, 0 under a straight meter or one swung on 16n).
const WEIGHTS: Record<Pattern, readonly number[]> = {
  root: [1, 0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0],
  pump: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
  eight: [1, 0, 0.8, 0, 0.8, 0, 0.8, 0, 0.9, 0, 0.8, 0, 0.8, 0, 0.8, 0],
  funk: [1, 0, 0, 0.7, 0, 0, 0.8, 0.4, 0, 0, 0.7, 0.5, 0, 0.3, 0.8, 0],
  walk: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
function blend({ sync, harm, artic, energy }: Old, eighth: number): Record<Pattern, number> {
  const walk = eighth * clamp01(harm! * 1.5);
  const funk = sync! * (1 - walk);
  const pump = (1 - harm!) * artic! * (1 - eighth) * (1 - sync!);
  const eight = energy! * 0.6 * (1 - walk) * (1 - funk);
  return { root: 0.35, pump, eight, funk, walk };
}
/** A pattern's share of the blend at a point: how much of what `bass.ts` plays there is that pattern. */
const share = (pattern: Pattern, point: Old, eighth: number) => {
  const b = blend(point, eighth);
  return b[pattern] / PATTERNS.reduce((sum, p) => sum + b[p], 0);
};
/** Where the walk is played at all: under a meter swung on 8n (`eighthSwing`); every other pattern, under a straight one. */
const eighthOf = (pattern: Pattern) => (pattern === 'walk' ? 1 : 0);

/** A tone of the chord in force (`bass.ts`'s `intervals`: root, third, fifth, seventh, the fifth again where it has none), or of the next chord. */
type Tone = 'root' | 'third' | 'fifth' | 'seventh' | 'next' | 'next-1' | 'next+1';

// What `bass.ts` may play at each onset of the pattern alone at its point (`bass.advance`), one chord a bar (a change on
// each downbeat only), at entropy 0, read off its code; the likeliest first. A chord change plays the root (`startsAt`). Off
// one: on the bar's last three steps, with sync, the next chord's root, `0.9 × sync` of the time (at the funk's point, 9 in
// 10; at the others' sync 0, never); else the root, or an octave up (the same pitch class), or the fifth, by a draw per
// section and step (`x ≥ 0.8`: 1 in 5). Walking (its blend over 0.5): every beat, the root on the change, the third, the
// fifth or the seventh on beats 2 and 3 (a draw per bar and step, a third each), and on the last beat a semitone below or
// above the next chord's root (half each).
const MAY: Record<Pattern, Readonly<Record<number, readonly Tone[]>>> = {
  root: { 0: ['root'], 8: ['root', 'fifth'] },
  pump: { 2: ['root', 'fifth'], 6: ['root', 'fifth'], 10: ['root', 'fifth'], 14: ['root', 'fifth'] },
  eight: {
    0: ['root'],
    2: ['root', 'fifth'],
    4: ['root', 'fifth'],
    6: ['root', 'fifth'],
    8: ['root', 'fifth'],
    10: ['root', 'fifth'],
    12: ['root', 'fifth'],
    14: ['root', 'fifth'],
  },
  funk: {
    0: ['root'],
    3: ['root', 'fifth'],
    6: ['root', 'fifth'],
    7: ['root', 'fifth'],
    10: ['root', 'fifth'],
    11: ['root', 'fifth'],
    13: ['next', 'root', 'fifth'],
    14: ['next', 'root', 'fifth'],
  },
  walk: { 0: ['root'], 4: ['third', 'fifth', 'seventh'], 8: ['third', 'fifth', 'seventh'], 12: ['next-1', 'next+1'] },
};

// What each fragment plays at each onset: where `bass.ts` draws, the likeliest, and for the walk one walk it plays, up
// through the chord and into the next from below.
const PLAYS: Record<Pattern, Readonly<Record<number, Tone>>> = {
  root: { 0: 'root', 8: 'root' },
  pump: { 2: 'root', 6: 'root', 10: 'root', 14: 'root' },
  eight: { 0: 'root', 2: 'root', 4: 'root', 6: 'root', 8: 'root', 10: 'root', 12: 'root', 14: 'root' },
  funk: { 0: 'root', 3: 'root', 6: 'root', 7: 'root', 10: 'root', 11: 'root', 13: 'next', 14: 'next' },
  walk: { 0: 'root', 4: 'third', 8: 'fifth', 12: 'next-1' },
};

// Each fragment's point (see its file for why): where its pattern's share of the blend is greatest, and where points tie,
// the one nearest the preset where its share is greatest; the eighths, whose preset (Techno) is as near two such points,
// at the root's point with the energy at 1.
// (`bass.ts` reads Jambot's axes, articulation and energy apart, so the blend and its points are on those; the library
// holds each point on decision 076's, as Migrate writes it, `newPoint`: bite their mean, mood the mode found there, #572)
type Old = { sync: number; harm: number; artic: number; energy: number };
// Jambot's presets on the axes bass.ts reads, lifted from yggi/jambot packages/engine/src/style.ts @ 7b078e8 (the points
// cells' styles held before decision 076; each is the library's style there, moved by the rule: a test holds it).
const OLD: Record<string, Old> = {
  'Synth-pop': { sync: 0.3, harm: 0.45, artic: 0.55, energy: 0.55 },
  Techno: { sync: 0.12, harm: 0, artic: 1, energy: 0.8 },
  'Deep house': { sync: 0.35, harm: 0.55, artic: 0.65, energy: 0.65 },
  Ambient: { sync: 0.05, harm: 0.3, artic: 0, energy: 0.2 },
  'Lo-fi hip hop': { sync: 0.5, harm: 0.75, artic: 0.35, energy: 0.5 },
  Funk: { sync: 1, harm: 0.12, artic: 0.85, energy: 0.75 },
  'Bossa nova': { sync: 0.75, harm: 0.85, artic: 0.45, energy: 0.45 },
  'Swing jazz': { sync: 0.35, harm: 1, artic: 0.3, energy: 0.6 },
  'Electro swing': { sync: 0.55, harm: 0.75, artic: 0.6, energy: 0.75 },
  Spooky: { sync: 0.2, harm: 0.9, artic: 0.3, energy: 0.35 },
};
const OLD_POINT: Record<Pattern, Old> = {
  root: { sync: 0, harm: 0.3, artic: 0, energy: 0 },
  pump: { sync: 0, harm: 0, artic: 1, energy: 0 },
  eight: { sync: 0, harm: 0.3, artic: 0, energy: 1 },
  funk: OLD.Funk!,
  walk: OLD['Swing jazz']!,
};
/** A point on Jambot's axes as the library holds it. */
const held = (p: Old): StylePoint => newPoint(p);
const POINT: Record<Pattern, StylePoint> = {
  root: held(OLD_POINT.root),
  pump: held(OLD_POINT.pump),
  eight: held(OLD_POINT.eight),
  funk: FUNK,
  walk: SWING_JAZZ,
};
// Each preset with its meter's swing on 8n (Swing jazz's 2/3 is 1; the others play straight or lean on 16n).
// The points proposed for presets Jambot is to adopt (#349), placed by hand where an example plays a pattern: the walk at
// Electro swing's, as examples/electroswing.md walks.
// (and the points proposed beside the patterns' own: the walking bass at Electro swing; the root bass at Kinderlied and the
// pump at Happy hardcore, its offbeat bass, #572)
const PROPOSED: Record<string, readonly StylePoint[]> = { walking_bass: [ELECTRO_SWING], root_bass: [KINDERLIED], pumping_bass: [stylePoint('happyHardcore')] };

const PRESETS: Record<string, { point: StylePoint; old: Old; eighth: number }> = {
  'Synth-pop': { point: SYNTH_POP, old: OLD['Synth-pop']!, eighth: 0 },
  Techno: { point: TECHNO, old: OLD.Techno!, eighth: 0 },
  'Deep house': { point: DEEP_HOUSE, old: OLD['Deep house']!, eighth: 0 },
  Ambient: { point: AMBIENT, old: OLD.Ambient!, eighth: 0 },
  'Lo-fi hip hop': { point: LO_FI, old: OLD['Lo-fi hip hop']!, eighth: 0 },
  Funk: { point: FUNK, old: OLD.Funk!, eighth: 0 },
  'Bossa nova': { point: BOSSA_NOVA, old: OLD['Bossa nova']!, eighth: 0 },
  'Swing jazz': { point: SWING_JAZZ, old: OLD['Swing jazz']!, eighth: 1 },
};
const NEAREST_PRESET: Record<Pattern, string> = { root: 'Ambient', pump: 'Techno', eight: 'Techno', funk: 'Funk', walk: 'Swing jazz' };
// The pattern `bass.ts` plays most at each preset, and its share there (#209): at Deep house the root and the funk line tie
// (0.35 each in the blend), and the root, first in `bass.ts`'s order, takes it. The eighths are the most at none.
const MOST: Record<string, Pattern> = {
  'Synth-pop': 'root',
  Techno: 'pump',
  'Deep house': 'root',
  Ambient: 'root',
  'Lo-fi hip hop': 'funk',
  Funk: 'funk',
  'Bossa nova': 'funk',
  'Swing jazz': 'walk',
};
const MOST_SHARE: Record<string, number> = {
  'Synth-pop': 0.32,
  Techno: 0.5,
  'Deep house': 0.31,
  Ambient: 0.68,
  'Lo-fi hip hop': 0.48,
  Funk: 0.74,
  'Bossa nova': 0.63,
  'Swing jazz': 0.74,
};

// The host's workbench: a meter at a tempo, a key, and a harmony of one chord a bar, as pitch classes for the expected notes.
const HOST = '&bar meter("4/4") step=120bpm\n&key scale(major, C)';
const PROGRESSIONS: Record<string, { harm: string; chords: readonly (readonly number[])[] }> = {
  'I–vi–IV–V': {
    harm: '&harm over=&key step=1m [0,2,4] [5,7,9] [3,5,7] [4,6,8]',
    chords: [
      [0, 4, 7],
      [9, 0, 4],
      [5, 9, 0],
      [7, 11, 2],
    ],
  },
  'ii–V–I': {
    harm: '&harm over=&key step=1m [1,3,5,7] [4,6,8,10] [0,2,4,6]',
    chords: [
      [2, 5, 9, 0],
      [7, 11, 2, 5],
      [0, 4, 7, 11],
    ],
  },
};
/** The bass instrument: `&bassV`, the voice the lines leave as a hole (#244). */
const BASS_INSTRUMENT = INSTRUMENT_FRAGMENTS.find((f) => f.id === 'bass')!.text;
const workbench = (name: string) => `${HOST}\n${PROGRESSIONS[name]!.harm}\n${BASS_INSTRUMENT}`;

const pc = (x: number) => ((x % 12) + 12) % 12;
function toneOf(tone: Tone, chord: readonly number[], next: readonly number[]): number {
  const [root, third, fifth, seventh] = chord;
  const at = { root, third, fifth, seventh: seventh ?? fifth, next: next[0], 'next-1': next[0]! - 1, 'next+1': next[0]! + 1 }[tone];
  return pc(at!);
}

/** What a text sends on channel 2 over `bars` bars of 4/4 at 120 bpm, each note's bar, its step in the bar and its pitch class, and what its compiler said. */
function played(text: string, bars: number): { notes: [number, number, number][]; diagnostics: string[] } {
  const plan = planOf(`${text}\n${heard(text)}`);
  const sixteenth = 60 / 120 / 4;
  const route = router(plan.result, channelTable(plan.result));
  const notes = windowAt(plan, 0, bars * 16 * sixteenth - 1e-9).events.flatMap((e) =>
    routesOf(route(e)).flatMap((r) => {
      const note = midiNote(e, r);
      if (!note || note.channel !== 2) return [];
      const step = Math.round(note.at / sixteenth);
      return [[Math.floor(step / 16), step % 16, pc(note.note)] as [number, number, number]];
    }),
  );
  return { notes: notes.sort((a, b) => a[0] - b[0] || a[1] - b[1]), diagnostics: plan.result.diagnostics.map((d) => d.message) };
}

/** What the fragment of a pattern should play over a progression, two laps of it: each onset's bar, step and pitch class. */
function expected(pattern: Pattern, chords: readonly (readonly number[])[]): [number, number, number][] {
  return Array.from({ length: 2 * chords.length }, (_, bar) =>
    Object.entries(PLAYS[pattern]).map(
      ([step, tone]) => [bar, Number(step), toneOf(tone, chords[bar % chords.length]!, chords[(bar + 1) % chords.length]!)] as [number, number, number],
    ),
  ).flat();
}

describe('the bass lines', () => {
  it('are bass.ts’s five patterns, each associated as the facet bass at its point, then at each preset where it is played most, and the Spooky basses written by hand', () => {
    expect(BASS_FRAGMENTS.map((f) => f.id)).toEqual([
      ...PATTERNS.map((p) => ID[p]),
      'creeping_bass',
      'tiptoe_bass',
      'acid_bass',
      'octave_bass',
      'drone_bass',
      'continuo_bass',
      'blues_walk',
      'quarter_bass',
    ]);
    for (const p of PATTERNS) {
      const presets = Object.keys(PRESETS).filter((name) => MOST[name] === p && PRESETS[name]!.point !== POINT[p]);
      expect(byId(ID[p]).association, p).toEqual(
        [POINT[p], ...presets.map((name) => PRESETS[name]!.point), ...(PROPOSED[ID[p]] ?? [])].map((point) => ({ point, weight: 1, facet: 'bass' })),
      );
    }
    expect(byId('creeping_bass').association).toEqual([{ point: SPOOKY, weight: 1, facet: 'bass' }]);
    expect(byId('tiptoe_bass').association).toEqual([{ point: held({ ...OLD.Spooky!, artic: 0.25, energy: 0.3 }), weight: 1, facet: 'bass' }]);
    // (and the three read from the examples, each at its style, #572)
    expect(byId('acid_bass').association).toEqual([{ point: stylePoint('acid'), weight: 1, facet: 'bass' }]);
    expect(byId('octave_bass').association).toEqual(['elektro', 'chiptune'].map((id) => ({ point: stylePoint(id), weight: 1, facet: 'bass' })));
    // (#542: each new style's own)
    expect(byId('continuo_bass').association).toEqual([{ point: stylePoint('baroque'), weight: 1, facet: 'bass' }]);
    expect(byId('blues_walk').association).toEqual([{ point: stylePoint('bluesShuffle'), weight: 1, facet: 'bass' }]);
    expect(byId('quarter_bass').association).toEqual([{ point: stylePoint('seaShanty'), weight: 1, facet: 'bass' }]);
    expect(byId('drone_bass').association).toEqual([{ point: stylePoint('darkAmbient'), weight: 1, facet: 'bass' }]);
  });

  it('Jambot’s presets, on the axes bass.ts reads, are the library’s styles moved by decision 076’s rule', () => {
    for (const [name, { point, old }] of Object.entries(PRESETS)) expect(held(old), name).toEqual(point);
    expect(held(OLD['Electro swing']!)).toEqual(ELECTRO_SWING);
    expect(held(OLD.Spooky!)).toEqual(SPOOKY);
  });

  it('each uses &harm alone, read off its text: its voice is the instrument the performer or the card plays it on (#291)', () => {
    for (const f of BASS_FRAGMENTS) {
      expect(holesOf(f.text, compileSource).uses, f.id).toEqual(['&harm']);
      expect(holesOf(f.text, compileSource).sounds, f.id).toEqual([]);
      expect(takenOn(f.text, '').missing, f.id).toEqual(['&harm']);
      // (heard through a card, the voice it plays on is a sound the bass instrument fills)
      expect(holesOf(`${f.text}\n${heard(f.text)}`, compileSource).sounds, f.id).toEqual(['&bassV']);
    }
  });

  for (const name of Object.keys(PROGRESSIONS))
    it(`each fits a host with &bar and &harm, ${name}, and compiles there with no diagnostic`, () => {
      for (const f of BASS_FRAGMENTS) {
        const fit = takenOn(f.text, workbench(name), '&harm');
        expect(fit.fits, f.id).toBe(true);
        expect(fit.diagnostics, f.id).toEqual([]);
        expect(played(fit.union.text, 1).diagnostics, f.id).toEqual([]);
      }
    });
});

describe('what each plays is what bass.ts plays for its pattern alone at its point', () => {
  it('its onsets are every step the pattern weighs above 0, and what bass.ts may play there is read for each', () => {
    for (const p of PATTERNS) {
      const steps = WEIGHTS[p].flatMap((w, s) => (w > 0 ? [s] : []));
      expect(Object.keys(MAY[p]).map(Number), p).toEqual(steps);
      expect(Object.keys(PLAYS[p]).map(Number), p).toEqual(steps);
    }
  });

  it('each note is one bass.ts plays there: the same wherever it is certain, its likeliest where it draws (the walk: one walk)', () => {
    for (const p of PATTERNS)
      for (const [step, tone] of Object.entries(PLAYS[p])) {
        const may = MAY[p][Number(step)]!;
        expect(may, `${p} at ${step}`).toContain(tone);
        if (p !== 'walk') expect(tone, `${p} at ${step}`).toBe(may[0]);
      }
  });

  for (const [name, { chords }] of Object.entries(PROGRESSIONS))
    for (const p of PATTERNS)
      it(`${ID[p]}, over ${name} twice: each onset per bar at its pitch class`, () => {
        const { notes, diagnostics } = played(takenOn(byId(ID[p]).text, workbench(name), '&harm').union.text, 2 * chords.length);
        expect(diagnostics).toEqual([]);
        expect(notes).toEqual(expected(p, chords));
      });

  it('the walk’s last beat is a semitone below the next chord’s root, over a chord whose key degree below it is a whole tone too', () => {
    // (I–vi: into A from G♯, where the key's degree below A is G, a whole tone: `0b` over the next chord would play G)
    const { notes } = played(takenOn(byId('walking_bass').text, workbench('I–vi–IV–V'), '&harm').union.text, 1);
    expect(notes.at(-1)).toEqual([0, 12, 8]);
  });
});

// The register the lines were written in, pinned in absolute MIDI notes (#244): what each line sent on channel 2 over the
// first four bars of I–vi–IV–V, in C and in D, while each carried its own `&bassV loop=C2`. Through the `bass` instrument
// they send these notes still; an instrument an octave off moves every one (Jambot's bass reads this register). The
// creeping bass, written later (#349), in the same register: the root, a semitone above it, the root; and the tiptoe bass:
// the root, and the chord's fifth below it.
const SENT: Record<string, Record<string, readonly number[]>> = {
  C: {
    root_bass: [36, 36, 45, 45, 41, 41, 43, 43],
    pumping_bass: [36, 36, 36, 36, 45, 45, 45, 45, 41, 41, 41, 41, 43, 43, 43, 43],
    eighths_bass: [...Array<number>(8).fill(36), ...Array<number>(8).fill(45), ...Array<number>(8).fill(41), ...Array<number>(8).fill(43)],
    funk_bass: [36, 36, 36, 36, 36, 36, ...Array<number>(8).fill(45), ...Array<number>(8).fill(41), ...Array<number>(8).fill(43), 48, 48],
    walking_bass: [36, 40, 43, 44, 45, 48, 52, 40, 41, 45, 48, 42, 43, 47, 50, 47],
    creeping_bass: [36, 37, 36, 45, 46, 45, 41, 42, 41, 43, 44, 43],
    tiptoe_bass: [36, 31, 45, 40, 41, 36, 43, 38],
    acid_bass: [
      36, 36, 48, 36, 36, 43, 36, 46, 36, 48, 36, 39, 41, 43, 45, 45, 57, 45, 45, 52, 45, 55, 45, 57, 45, 48, 50, 52, 41, 41, 53, 41, 41, 48, 41, 51, 41, 53, 41, 44, 46, 48, 43,
      43, 55, 43, 43, 50, 43, 53, 43, 55, 43, 46, 48, 50,
    ],
    drone_bass: [36, 45, 41, 43],
    continuo_bass: [36, 40, 43, 40, 36, 40, 43, 40, 45, 48, 52, 48, 45, 48, 52, 48, 41, 45, 48, 45, 41, 45, 48, 45, 43, 47, 50, 47, 43, 47, 50, 47],
    blues_walk: [36, 40, 43, 48, 45, 48, 52, 57, 41, 45, 48, 53, 43, 47, 50, 55],
    quarter_bass: [36, 36, 36, 36, 45, 45, 45, 45, 41, 41, 41, 41, 43, 43, 43, 43],
    octave_bass: [36, 48, 36, 48, 36, 48, 36, 48, 45, 57, 45, 57, 45, 57, 45, 57, 41, 53, 41, 53, 41, 53, 41, 53, 43, 55, 43, 55, 43, 55, 43, 55],
  },
  D: {
    root_bass: [38, 38, 47, 47, 43, 43, 45, 45],
    pumping_bass: [38, 38, 38, 38, 47, 47, 47, 47, 43, 43, 43, 43, 45, 45, 45, 45],
    eighths_bass: [...Array<number>(8).fill(38), ...Array<number>(8).fill(47), ...Array<number>(8).fill(43), ...Array<number>(8).fill(45)],
    funk_bass: [38, 38, 38, 38, 38, 38, ...Array<number>(8).fill(47), ...Array<number>(8).fill(43), ...Array<number>(8).fill(45), 50, 50],
    walking_bass: [38, 42, 45, 46, 47, 50, 54, 42, 43, 47, 50, 44, 45, 49, 52, 49],
    creeping_bass: [38, 39, 38, 47, 48, 47, 43, 44, 43, 45, 46, 45],
    tiptoe_bass: [38, 33, 47, 42, 43, 38, 45, 40],
    acid_bass: [
      38, 38, 50, 38, 38, 45, 38, 48, 38, 50, 38, 41, 43, 45, 47, 47, 59, 47, 47, 54, 47, 57, 47, 59, 47, 50, 52, 54, 43, 43, 55, 43, 43, 50, 43, 53, 43, 55, 43, 46, 48, 50, 45,
      45, 57, 45, 45, 52, 45, 55, 45, 57, 45, 48, 50, 52,
    ],
    drone_bass: [38, 47, 43, 45],
    continuo_bass: [38, 42, 45, 42, 38, 42, 45, 42, 47, 50, 54, 50, 47, 50, 54, 50, 43, 47, 50, 47, 43, 47, 50, 47, 45, 49, 52, 49, 45, 49, 52, 49],
    blues_walk: [38, 42, 45, 50, 47, 50, 54, 59, 43, 47, 50, 55, 45, 49, 52, 57],
    quarter_bass: [38, 38, 38, 38, 47, 47, 47, 47, 43, 43, 43, 43, 45, 45, 45, 45],
    octave_bass: [38, 50, 38, 50, 38, 50, 38, 50, 47, 59, 47, 59, 47, 59, 47, 59, 43, 55, 43, 55, 43, 55, 43, 55, 45, 57, 45, 57, 45, 57, 45, 57],
  },
};

describe('the bass lines send the notes they always sent, through the bass instrument', () => {
  const notesOf = (text: string) => {
    const plan = planOf(`${text}\n${heard(text)}`);
    const route = router(plan.result, channelTable(plan.result));
    return windowAt(plan, 0, 8 - 1e-9).events.flatMap((e) =>
      routesOf(route(e)).flatMap((r) => {
        const n = midiNote(e, r);
        return n && n.channel === 2 ? [n.note] : [];
      }),
    );
  };
  const progression = '&harm over=&key step=1m [0,2,4] [5,7,9] [3,5,7] [4,6,8]';
  for (const tonic of Object.keys(SENT))
    it.each(BASS_FRAGMENTS.map((f) => [f.id, f.text] as const))(`%s, in ${tonic}: its absolute MIDI notes on channel 2`, (id, text) => {
      const host = `&bar meter("4/4") step=120bpm\n&key scale(major, ${tonic})\n${progression}`;
      expect(notesOf(`${host}\n${text}\n${BASS_INSTRUMENT}`)).toEqual(SENT[tonic]![id]);
    });

  it('is shown firing: the instrument an octave up moves every note by 12', () => {
    const host = `&bar meter("4/4") step=120bpm\n&key scale(major, C)\n${progression}`;
    const up = BASS_INSTRUMENT.replace('loop=C2', 'loop=C3');
    expect(up).not.toBe(BASS_INSTRUMENT);
    expect(notesOf(`${host}\n${byId('root_bass').text}\n${up}`)).toEqual(SENT['C']!['root_bass']!.map((n) => n + 12));
  });
});

describe('where each sits', () => {
  // A grid of eleven values on each of the four axes, and each fragment's own point
  const values = Array.from({ length: 11 }, (_, i) => i / 10);
  // (on Jambot's axes, which bass.ts reads)
  const AXES = ['sync', 'harm', 'artic', 'energy'] as const;
  const grid = AXES.reduce<Old[]>((points, axis) => points.flatMap((p) => values.map((v) => ({ ...p, [axis]: v }))), [{} as Old]);
  const distance = (a: Old, b: Old) => Math.hypot(...AXES.map((x) => a[x] - b[x]));

  it('its point is where its pattern’s share of the blend is greatest, over 14,641 points', () => {
    expect(grid).toHaveLength(14_641);
    for (const p of PATTERNS) {
      const most = Math.max(...grid.map((g) => share(p, g, eighthOf(p))));
      expect(share(p, OLD_POINT[p], eighthOf(p)), p).toBeCloseTo(most, 12);
    }
    expect(PATTERNS.map((p) => +share(p, OLD_POINT[p], eighthOf(p)).toFixed(3))).toEqual([1, 0.741, 0.632, 0.741, 0.741]);
  });

  it('of the points where it ties, the nearest to the preset where its share is greatest; the eighths at the root’s, at full energy', () => {
    for (const p of PATTERNS) {
      const shares = Object.entries(PRESETS).map(([name, { old, eighth }]) => [name, share(p, old, eighth)] as const);
      const best = shares.reduce((a, b) => (b[1] > a[1] ? b : a));
      expect(best[0], p).toBe(NEAREST_PRESET[p]);
      const most = share(p, OLD_POINT[p], eighthOf(p));
      const seen = new Set<string>();
      const tied = [...grid, OLD_POINT[p]].filter((g) => share(p, g, eighthOf(p)) > most - 1e-12 && !seen.has(JSON.stringify(g)) && !!seen.add(JSON.stringify(g)));
      const preset = PRESETS[best[0]]!.old;
      const nearest = Math.min(...tied.map((g) => distance(g, preset)));
      const nearestPoints = tied.filter((g) => distance(g, preset) < nearest + 1e-12);
      if (p === 'eight') {
        // (Techno is as near (0, 0, 0, 1), legato, as (0, 1, 1, 1), its harmony moving)
        expect(nearestPoints, p).toEqual([
          { sync: 0, harm: 0, artic: 0, energy: 1 },
          { sync: 0, harm: 1, artic: 1, energy: 1 },
        ]);
        expect(OLD_POINT.eight).toEqual({ ...OLD_POINT.root, energy: 1 });
      } else expect(nearestPoints, p).toEqual([OLD_POINT[p]]);
    }
  });

  it('a query for the bass returns each first at its own point, at distance 0, and none for the meter or the rhythm', () => {
    const library = createRepository(LIBRARY);
    for (const p of PATTERNS) {
      const [first, second] = library.query(POINT[p], 2, {}, { facet: 'bass' });
      expect([first!.fragment.id, first!.distance], p).toEqual([ID[p], 0]);
      expect(second!.distance, p).toBeGreaterThan(0);
      for (const facet of ['meter', 'rhythm'])
        expect(
          library.query(POINT[p], 31, {}, { facet }).map((f) => f.fragment.id),
          `${p}, ${facet}`,
        ).not.toContain(ID[p]);
    }
  });
});

describe('at the presets (#209)', () => {
  const library = createRepository(LIBRARY);
  for (const [name, { point, old, eighth }] of Object.entries(PRESETS))
    it(`${name}: a query for the bass returns first the pattern bass.ts plays most there, ${MOST[name]}, at distance 0`, () => {
      const shares = PATTERNS.map((p) => share(p, old, eighth));
      const most = PATTERNS[shares.indexOf(Math.max(...shares))]!;
      expect([most, +Math.max(...shares).toFixed(2)]).toEqual([MOST[name], MOST_SHARE[name]]);
      const [first, second] = library.query(point, 2, {}, { facet: 'bass' });
      expect([first!.fragment.id, first!.distance]).toEqual([ID[most], 0]);
      expect(second!.distance).toBeGreaterThan(0);
    });

  it('at each, that pattern alone is at distance 0: the walk only at Swing jazz, the eighths at none', () => {
    for (const [name, { point }] of Object.entries(PRESETS)) {
      const at0 = library
        .query(point, 5, {}, { facet: 'bass' })
        .filter((f) => f.distance === 0)
        .map((f) => f.fragment.id);
      expect(at0, name).toEqual([ID[MOST[name]!]]);
    }
  });
});
