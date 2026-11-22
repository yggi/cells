/**
 * A part read in its document (#703, rung C5b of yggi/cell-studio#621): `readPart` plays a part of a document as
 * `readFragment` plays a fragment alone, but with what the document gives it to play with: its main parameter's line,
 * the key a tune is over (`&key from diatonic(mode=dorian) D`, with the lines that reads). A part open on its key then
 * reads the document's mode, not the host's major: `mood` is the key's.
 *
 * Which notes are the part's: the part is played through the host (`audition`), as a fragment is, so its events are its
 * own and the plan needs no note's source cell. The band part it reads as is given, or the facet's (`PART_OF`); reading
 * it off the performer that plays the part in the document (decision 061's roles) is a rung of its own, since a name
 * says no role (decision 075) and the role cell does.
 *
 * What it does not take from the document, measured on Kinderlieder (`readpart.test.ts`):
 * - **The instrument.** The document's voice for a part (`&leadV s=tri env=…`) moves no reading: the notes' lengths are
 *   the line's (its rests, its `legato=`), and a voice's envelope changes none, so a line's `bite` is the line's own.
 *   #703's premise that bite is the instrument's does not hold in cells.
 * - **The meter and the tempo.** The host's, 4/4: a reading counts the steps of a bar, so the tempo moves none, and a part
 *   whose clock 4/4 doesn't meet isn't read (`readAudition`).
 *
 * Pure.
 */
import type { Resolve } from '../engine/program';
import type { PointReading } from '../engine/reading/point';
import type { Part } from '../engine/reading/style';
import { givenOf, partOf } from '../engine/use';
import { associationOf } from './declarations';
import { styleNamesIn } from './files';
import { PART_OF, readAudition } from './firstguess';
import type { WeightedPoint } from './fragments';
import { SEED_FILES } from './seed.generated';

/** What a part is read with. */
export interface ReadPartOptions {
  readonly resolve: Resolve;
  /** The band part it reads as; by default its facet's (`PART_OF`). */
  readonly part?: Part;
  /** The facet it is a part as, where `part` isn't given: `motif` reads as the lead. */
  readonly facet?: string;
}

/**
 * A part of a document, read as the part it plays: its reading (a point on each axis the notes can speak to, and how
 * far to trust each), or null where there is none: no signature names the head, no part is given or found for its
 * facet, or it plays nothing a reading can read in 4/4.
 */
export function readPart(document: string, head: string, options: ReadPartOptions): PointReading | null {
  const text = partOf(document, head);
  const given = givenOf(document, head);
  if (text === null || given === null) return null;
  const part = options.part ?? (options.facet === undefined ? undefined : PART_OF[options.facet]);
  return part ? readAudition(text, part, options.resolve, given) : null;
}

/**
 * The axes a facet's notes speak to, so a read place carries them (decision 037's D6: an axis the notes can't speak to is
 * left out). A beat's `sync`, a harmony's `harm`, as `GUESSED` has them; and a motif's `mood`, which the prototype of #703
 * read well (a relative mood: over one key `hinein` reads a dorian 0.60 and `weinet` an aeolian 0.45), where its `sync`
 * and `bite` read the line's written steps and say nothing of a style's (bite is 0 for every straight line).
 */
export const READ_AXES: Readonly<Record<string, readonly string[]>> = { rhythm: ['sync'], harmony: ['harm'], motif: ['mood'] };

/** Half an axis (the axes run 0 to 1): the widest reach, of an axis the notes say nothing of. */
const HALF_AXIS = 0.5;

/**
 * A reading as a place (#703, the owner's option 3, 2026-11-22): its point on the axes its facet's notes speak to
 * (`READ_AXES`), each with a reach of its confidence's lack, `(1 − confidence)` of half the axis, written as a point's
 * reach is (decision 089 §6: `mood=.6 ± .29`). A sure reading is a narrow reach, a doubtful one a wide one. Null where
 * the facet has no axis the reading holds. The point is on the reading's scale, not the composer's (decision 094): a
 * placement stays the composer's, and a read place is only what a part has none of.
 */
export function readPlace(reading: PointReading, facet: string): WeightedPoint | null {
  const point: Record<string, number> = {};
  const reach: Record<string, number> = {};
  for (const axis of READ_AXES[facet] ?? []) {
    const value = reading.point[axis as keyof PointReading['point']];
    const sure = reading.confidence[axis as keyof PointReading['confidence']];
    if (value === undefined || sure === undefined) continue;
    point[axis] = value;
    reach[axis] = (1 - sure) * HALF_AXIS;
  }
  return Object.keys(point).length ? { point, weight: 1, facet, reach } : null;
}

/**
 * Where a part of a document is found: the association its signature declares (a hand's, decision 089), else the place
 * it reads as in the document (`readPlace` of `readPart`). Null where it declares none and reads none.
 */
export function placeOfPart(document: string, head: string, options: ReadPartOptions & { readonly facet: string }): readonly WeightedPoint[] | null {
  const text = partOf(document, head);
  if (text === null) return null;
  const declared = associationOf(
    text
      .split('\n')
      .filter((line) => !line.trim().startsWith('*'))
      .join('\n'),
    { styles: styleNamesIn(SEED_FILES) },
  );
  if (declared?.explicit) return declared.association;
  const reading = readPart(document, head, options);
  const read = reading ? readPlace(reading, options.facet) : null;
  return read ? [read] : null;
}
