/**
 * Reading chords from notes, and `harm` from the chords (#541): `harm` is the one axis the notes say only through the
 * chords, how often they change and how rich they are. So there are two steps: a bar's chords read back from what the
 * comp (the pad and the stab) sounds, a root and a quality for each half of the bar; then those chords as a number.
 *
 * A chord is the pitch classes the comp sounds in its half, matched to the named qualities (`QUALITIES`): a quality
 * holds when every sounding pitch class is one of its tones and at most its fifth is missing, as a comp drops the fifth
 * of a ninth. The bass settles the root where the notes leave it open. A stab on the bar's last two steps is left out:
 * it anticipates the next bar's chord.
 *
 * Pure: it counts pitch classes and knows no clock, file or key.
 *
 * Lifted from yggi/jambot packages/engine/src/chord-reading.ts @ a34d13c6, its qualities from yggi/jambot
 * packages/theory/src/chords.ts @ a34d13c6 (`CHORD_QUALITIES`' stacks, but the harmonic series, which it never read);
 * the halves are the bar's (`Bar`), 4/4's eight steps each as they were.
 */
import { BAR_4_4, type Bar, type Sounding } from './style';

/** A chord as the notes say it: the pitch class of its root, and the name of its quality. */
export interface ReadChord {
  readonly root: number;
  readonly quality: string;
}

/** The named qualities a chord is read as, each its stack in semitones above its root, in this order. */
export const QUALITY_STACKS: Readonly<Record<string, readonly number[]>> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '5': [0, 7],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  mMaj7: [0, 3, 7, 11],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  '9': [0, 4, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
  add9: [0, 4, 7, 14],
};

const pc = (note: number) => ((note % 12) + 12) % 12;

const QUALITIES = Object.entries(QUALITY_STACKS).map(([name, stack]) => ({ name, tones: new Set(stack.map((x) => x % 12)), size: stack.length }));

/**
 * The chord a set of pitch classes is: every root (the bass's first) against every quality that holds it. The fewest
 * tones missing wins, so a triad is not read as a sixth chord without its fifth; then the bass's root, then the largest
 * quality.
 */
export function chordOf(pcs: ReadonlySet<number>, bass: number | null): ReadChord | null {
  const roots = [...(bass !== null && pcs.has(bass) ? [bass] : []), ...[...pcs].filter((r) => r !== bass)];
  let best: { chord: ReadChord; missing: number; size: number; order: number } | null = null;
  roots.forEach((root, order) => {
    const offsets = new Set([...pcs].map((x) => pc(x - root)));
    for (const { name, tones, size } of QUALITIES) {
      if ([...offsets].some((x) => !tones.has(x))) continue;
      const absent = [...tones].filter((x) => !offsets.has(x));
      if (absent.some((x) => x !== 7)) continue;
      const found = { chord: { root, quality: name }, missing: absent.length, size, order };
      if (!best || found.missing < best.missing || (found.missing === best.missing && (found.order < best.order || (found.order === best.order && found.size > best.size))))
        best = found;
    }
  });
  return best ? (best as { chord: ReadChord }).chord : null;
}

type Pitched = Sounding & { readonly note: number };

/**
 * The chord in each half of a bar, from the pad and the stab, null where none sounds or its notes are none. A half with
 * no notes of its own holds the chord before it.
 */
export function readChords(notes: readonly Sounding[], bar: Bar = BAR_4_4): (ReadChord | null)[] {
  const half = bar.steps / 2;
  const anticipationFrom = bar.steps - 2;
  const pitched = notes.filter((n): n is Pitched => n.note !== undefined);
  const chords: (ReadChord | null)[] = [];
  for (const h of [0, 1]) {
    const inHalf = (n: Pitched) => Math.floor(n.step / half) === h;
    const comp = pitched.filter((n) => (n.part === 'pad' || n.part === 'stab') && inHalf(n) && n.step < anticipationFrom);
    if (comp.length === 0) {
      chords.push(h === 1 ? (chords[0] ?? null) : null);
      continue;
    }
    const bass = pitched.filter((n) => n.part === 'bass' && inHalf(n)).sort((a, b) => a.step - b.step)[0];
    chords.push(chordOf(new Set(comp.map((n) => pc(n.note))), bass ? pc(bass.note) : null));
  }
  return chords;
}

/** What `readHarm` found: the reading, and the chords it read it from. */
export interface HarmReading {
  readonly harm: number;
  readonly chords: readonly ReadChord[];
}

/** Changes per bar at which the rate is full: a chord to a chord in each half of the bar. */
const FULL_RATE = 2;

/**
 * The `harm` a bar's chords read as: the mean of two shares, each 0 to 1. The rate is the chord changes in the bar
 * (from the chord before it, if given) over `FULL_RATE`. The richness is the mean of how far each chord's tones run past
 * a triad: a triad 0, a seventh a half, a ninth a whole. Absent where no chord is read.
 */
export function readHarm(notes: readonly Sounding[], previous?: ReadChord, bar: Bar = BAR_4_4): HarmReading | undefined {
  const chords = readChords(notes, bar).filter((c): c is ReadChord => c !== null);
  if (chords.length === 0) return undefined;
  const line = previous ? [previous, ...chords] : chords;
  const changes = line.slice(1).filter((c, i) => c.root !== line[i]!.root || c.quality !== line[i]!.quality);
  const rate = Math.min(1, changes.length / FULL_RATE);
  const richness = chords.reduce((sum, c) => sum + Math.min(1, (QUALITY_STACKS[c.quality]!.length - 3) / 2), 0) / chords.length;
  return { harm: (rate + richness) / 2, chords };
}
