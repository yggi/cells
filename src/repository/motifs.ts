/**
 * The motifs (#294): the facet `motif`, a line of one or two bars over the key that a form moves and answers. Each
 * fragment is a line of degrees of the key (`over=&key`), in eighths (`step=8n`): its hole is `&key`, and it taps the
 * host's meter, with no `&bar`, no voice and no card (#291). Its head is named for it (`&gypsy`), so `use &gypsy` takes
 * it, and a piece hands it to a form as the form's `&call` (`&call step=8n &gypsy`).
 *
 * Eight are written by hand, one at each of Jambot's presets' points, in that style's idiom and mode: Jambot's lead
 * fixture records its own lead bar by bar but not the key each was in, so its notes can't be read as degrees without
 * the band that chose the key. The ninth, `gypsy`, is lifted from examples/electroswing.md, at the point proposed for an
 * Electro swing preset. Each is a file of the seed library, `fragments/motifs/*.md` (`seed.ts`).
 */
import type { Fragment } from './fragments';
import { seedFragments } from './seed';

/** The motifs built so far: eight by hand at Jambot's presets, and the electroswing example's call, as the facet `motif`. */
export const MOTIF_FRAGMENTS: readonly Fragment[] = seedFragments('motifs');
