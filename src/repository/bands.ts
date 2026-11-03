/**
 * The bands: the repository's facet `band` (decision 063 §1; #391), who plays a score, on what, and where it goes out.
 * A score ends in `* from band`, and each client's resolver answers `band` with its own; the seed library holds the
 * default one, `band`: the five performers under its head `&band` (decision 061's table), their instruments, two of
 * them reading the score's `&style`, a sound card and a MIDI card on Jambot's channels. Each is a file of the seed
 * library, `fragments/bands/*.md` (`seed.ts`), whose prose says what it plays and why. Which instrument a performer
 * plays at a style is the band's choice, read at resolution: `band.ts`.
 */
import type { Fragment } from './fragments';
import { seedFragments } from './seed';

/** The bands built so far: the default band, associated as the facet `band`. */
export const BAND_FRAGMENTS: readonly Fragment[] = seedFragments('bands');
