// The bass lines (#207, yggi/jambot#423): Jambot's five bass patterns as fragments over the chord in force. Each fits a
// host that writes `&bar` and `&harm`, plays there what `bass.ts` plays for its pattern alone at its point wherever that is
// certain (and one of the notes it draws where it draws), sits where `bass.ts` plays its pattern most, and is found
// first there by a query for the bass.
import { describe, expect, it } from 'vitest';
import { planOf } from '../engine/host';
import { channelTable, midiNote, router, routesOf } from '../engine/midi';
import { windowAt } from '../engine/schedule';
import { BASS_FRAGMENTS } from './bass';
import { fitOf } from './fit';
import { createRepository, type StylePoint } from './fragments';
import { holesOf } from './holes';
import { compileSource } from '../engine/compile';
import { LIBRARY } from './library';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';

const PATTERNS = ['root', 'pump', 'eight', 'funk', 'walk'] as const;
type Pattern = (typeof PATTERNS)[number];
const ID: Record<Pattern, string> = { root: 'root bass', pump: 'pumping bass', eight: 'eighths bass', funk: 'funk bass', walk: 'walking bass' };
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
function blend({ sync, harm, artic, energy }: StylePoint, eighth: number): Record<Pattern, number> {
  const walk = eighth * clamp01(harm! * 1.5);
  const funk = sync! * (1 - walk);
  const pump = (1 - harm!) * artic! * (1 - eighth) * (1 - sync!);
  const eight = energy! * 0.6 * (1 - walk) * (1 - funk);
  return { root: 0.35, pump, eight, funk, walk };
}
/** A pattern's share of the blend at a point: how much of what `bass.ts` plays there is that pattern. */
const share = (pattern: Pattern, point: StylePoint, eighth: number) => {
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
const POINT: Record<Pattern, StylePoint> = {
  root: { sync: 0, harm: 0.3, artic: 0, energy: 0 },
  pump: { sync: 0, harm: 0, artic: 1, energy: 0 },
  eight: { sync: 0, harm: 0.3, artic: 0, energy: 1 },
  funk: FUNK,
  walk: SWING_JAZZ,
};
// Each preset with its meter's swing on 8n (Swing jazz's 2/3 is 1; the others play straight or lean on 16n).
const PRESETS: Record<string, { point: StylePoint; eighth: number }> = {
  'Synth-pop': { point: SYNTH_POP, eighth: 0 },
  Techno: { point: TECHNO, eighth: 0 },
  'Deep house': { point: DEEP_HOUSE, eighth: 0 },
  Ambient: { point: AMBIENT, eighth: 0 },
  'Lo-fi hip hop': { point: LO_FI, eighth: 0 },
  Funk: { point: FUNK, eighth: 0 },
  'Bossa nova': { point: BOSSA_NOVA, eighth: 0 },
  'Swing jazz': { point: SWING_JAZZ, eighth: 1 },
};
const NEAREST_PRESET: Record<Pattern, string> = { root: 'Ambient', pump: 'Techno', eight: 'Techno', funk: 'Funk', walk: 'Swing jazz' };

// The host's workbench: a meter at a tempo, a key, and a harmony of one chord a bar, as pitch classes for the expected notes.
const HOST = '&bar meter("4/4") step=120bpm\n&key scale(major, C)';
const PROGRESSIONS: Record<string, { harm: string; chords: readonly (readonly number[])[] }> = {
  'I–vi–IV–V': {
    harm: '&harm over=key step=1m [0,2,4] [5,7,9] [3,5,7] [4,6,8]',
    chords: [
      [0, 4, 7],
      [9, 0, 4],
      [5, 9, 0],
      [7, 11, 2],
    ],
  },
  'ii–V–I': {
    harm: '&harm over=key step=1m [1,3,5,7] [4,6,8,10] [0,2,4,6]',
    chords: [
      [2, 5, 9, 0],
      [7, 11, 2, 5],
      [0, 4, 7, 11],
    ],
  },
};
const workbench = (name: string) => `${HOST}\n${PROGRESSIONS[name]!.harm}`;

const pc = (x: number) => ((x % 12) + 12) % 12;
function toneOf(tone: Tone, chord: readonly number[], next: readonly number[]): number {
  const [root, third, fifth, seventh] = chord;
  const at = { root, third, fifth, seventh: seventh ?? fifth, next: next[0], 'next-1': next[0]! - 1, 'next+1': next[0]! + 1 }[tone];
  return pc(at!);
}

/** What a text sends on channel 2 over `bars` bars of 4/4 at 120 bpm, each note's bar, its step in the bar and its pitch class, and what its compiler said. */
function played(text: string, bars: number): { notes: [number, number, number][]; diagnostics: string[] } {
  const plan = planOf(text);
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
  it('are bass.ts’s five patterns, each one point associated as the facet bass, source seed, lifted from bass.ts', () => {
    expect(BASS_FRAGMENTS.map((f) => f.id)).toEqual(PATTERNS.map((p) => ID[p]));
    for (const p of PATTERNS) expect(byId(ID[p]).association, p).toEqual([{ point: POINT[p], weight: 1, facet: 'bass' }]);
  });

  it('each uses &harm and nothing else of the host’s: what it needs is read off its text', () => {
    for (const f of BASS_FRAGMENTS) {
      expect(holesOf(f.text, compileSource).uses, f.id).toEqual(['&harm']);
      expect(fitOf(f.text, HOST).missing, f.id).toEqual(['&harm']);
    }
  });

  for (const name of Object.keys(PROGRESSIONS))
    it(`each fits a host with &bar and &harm, ${name}, and compiles there with no diagnostic`, () => {
      for (const f of BASS_FRAGMENTS) {
        const fit = fitOf(f.text, workbench(name));
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
        const { notes, diagnostics } = played(fitOf(byId(ID[p]).text, workbench(name)).union.text, 2 * chords.length);
        expect(diagnostics).toEqual([]);
        expect(notes).toEqual(expected(p, chords));
      });

  it('the walk’s last beat is a semitone below the next chord’s root, over a chord whose key degree below it is a whole tone too', () => {
    // (I–vi: into A from G♯, where the key's degree below A is G, a whole tone: `0b` over the next chord would play G)
    const { notes } = played(fitOf(byId('walking bass').text, workbench('I–vi–IV–V')).union.text, 1);
    expect(notes.at(-1)).toEqual([0, 12, 8]);
  });
});

describe('where each sits', () => {
  // A grid of eleven values on each of the four axes, and each fragment's own point
  const values = Array.from({ length: 11 }, (_, i) => i / 10);
  const AXES = ['sync', 'harm', 'artic', 'energy'] as const;
  const grid = AXES.reduce<StylePoint[]>((points, axis) => points.flatMap((p) => values.map((v) => ({ ...p, [axis]: v }))), [{}]);
  const distance = (a: StylePoint, b: StylePoint) => Math.hypot(...AXES.map((x) => a[x]! - b[x]!));

  it('its point is where its pattern’s share of the blend is greatest, over 14,641 points', () => {
    expect(grid).toHaveLength(14_641);
    for (const p of PATTERNS) {
      const most = Math.max(...grid.map((g) => share(p, g, eighthOf(p))));
      expect(share(p, POINT[p], eighthOf(p)), p).toBeCloseTo(most, 12);
    }
    expect(PATTERNS.map((p) => +share(p, POINT[p], eighthOf(p)).toFixed(3))).toEqual([1, 0.741, 0.632, 0.741, 0.741]);
  });

  it('of the points where it ties, the nearest to the preset where its share is greatest; the eighths at the root’s, at full energy', () => {
    for (const p of PATTERNS) {
      const shares = Object.entries(PRESETS).map(([name, { point, eighth }]) => [name, share(p, point, eighth)] as const);
      const best = shares.reduce((a, b) => (b[1] > a[1] ? b : a));
      expect(best[0], p).toBe(NEAREST_PRESET[p]);
      const most = share(p, POINT[p], eighthOf(p));
      const seen = new Set<string>();
      const tied = [...grid, POINT[p]].filter((g) => share(p, g, eighthOf(p)) > most - 1e-12 && !seen.has(JSON.stringify(g)) && !!seen.add(JSON.stringify(g)));
      const preset = PRESETS[best[0]]!.point;
      const nearest = Math.min(...tied.map((g) => distance(g, preset)));
      const nearestPoints = tied.filter((g) => distance(g, preset) < nearest + 1e-12);
      if (p === 'eight') {
        // (Techno is as near (0, 0, 0, 1), legato, as (0, 1, 1, 1), its harmony moving)
        expect(nearestPoints, p).toEqual([
          { sync: 0, harm: 0, artic: 0, energy: 1 },
          { sync: 0, harm: 1, artic: 1, energy: 1 },
        ]);
        expect(POINT.eight).toEqual({ ...POINT.root, energy: 1 });
      } else expect(nearestPoints, p).toEqual([POINT[p]]);
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
