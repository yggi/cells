/**
 * The stab lines: the part the stab performer plays (`&stabline`, decision 058), the facet `stab`, as the bass lines are
 * the bass performer's (`bass.ts`). Each is a line of chords as indices into the chord in force (`over=&harm`, #95): it
 * reads the host's `&harm` and taps the host's main meter, with no `&bar`, no key and no card of its own (#291), so its
 * holes are `&harm` and a meter that holds its braid.
 *
 * Every point of a stab line is associated as the facet `stab`. Each is a file of the seed library,
 * `fragments/stab/*.md` (`seed.ts`), whose prose says what it is and where it sits.
 */
import type { Fragment } from './fragments';
/** The stab lines built so far: the Charleston, associated as the facet `stab`. */
export declare const STAB_FRAGMENTS: readonly Fragment[];
