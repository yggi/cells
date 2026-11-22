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
import { PART_OF, readAudition } from './firstguess';

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
