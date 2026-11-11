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
import { type Bar, type Sounding } from './style';
/** A chord as the notes say it: the pitch class of its root, and the name of its quality. */
export interface ReadChord {
    readonly root: number;
    readonly quality: string;
}
/** The named qualities a chord is read as, each its stack in semitones above its root, in this order. */
export declare const QUALITY_STACKS: Readonly<Record<string, readonly number[]>>;
/**
 * The chord a set of pitch classes is: every root (the bass's first) against every quality that holds it. The fewest
 * tones missing wins, so a triad is not read as a sixth chord without its fifth; then the bass's root, then the largest
 * quality.
 */
export declare function chordOf(pcs: ReadonlySet<number>, bass: number | null): ReadChord | null;
/**
 * The chord in each half of a bar, from the pad and the stab, null where none sounds or its notes are none. A half with
 * no notes of its own holds the chord before it.
 */
export declare function readChords(notes: readonly Sounding[], bar?: Bar): (ReadChord | null)[];
/** What `readHarm` found: the reading, and the chords it read it from. */
export interface HarmReading {
    readonly harm: number;
    readonly chords: readonly ReadChord[];
}
/**
 * The `harm` a bar's chords read as: the mean of two shares, each 0 to 1. The rate is the chord changes in the bar
 * (from the chord before it, if given) over `FULL_RATE`. The richness is the mean of how far each chord's tones run past
 * a triad: a triad 0, a seventh a half, a ninth a whole. Absent where no chord is read.
 */
export declare function readHarm(notes: readonly Sounding[], previous?: ReadChord, bar?: Bar): HarmReading | undefined;
