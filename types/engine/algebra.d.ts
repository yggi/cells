/**
 * The mix algebra (docs/decisions/006-mix-algebra.md): a mix chord's expressions, typed by what
 * each cell is, and distributed into one binding per voice.
 *
 * Sorts: a pitch (semitones), a volume (map=amp, db, adsr), a signal (sound). A plain value — a
 * number, a map=lin cell — has no sort of its own and takes its operator's: semitones in a sum
 * (0 changes nothing), a volume in a product (1 changes nothing). `+` adds pitches and mixes
 * signals; `*` multiplies volumes, composes pitches (transposing twice adds) and applies both to a
 * signal. Both are commutative and associative; a pitch or volume acting on a mix acts on each of
 * its voices. Pure: the caller says what each cell is.
 */
import type { Binding, Expr, Span } from './ast';
/**
 * What a cell is, as far as a mix cares. `plain`: a map=lin cell (its operator decides). `wave`: a braid
 * turning at an audio rate with no sound parameter — a sound where it is the only one (a waveform voice),
 * a pitch in a pitch sum or beside another sound (a fast vibrato: FM).
 */
export type Sort = 'signal' | 'volume' | 'plain' | 'pitch' | 'wave';
export declare class AlgebraError extends Error {
    readonly span: Span;
    constructor(message: string, span: Span);
}
/**
 * A mix chord's expression → its bindings, one per voice. Throws AlgebraError (with a span) when
 * the sorts don't fit: two signals multiplied, a volume added, no signal at all …
 */
export declare function distribute(e: Expr, sortOf: (name: string) => Sort, why?: (names: readonly string[]) => string | null): Binding[];
