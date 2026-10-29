/**
 * The motifs (#294): the facet `motif`, a line of one or two bars over the key that a form moves and answers. Each
 * fragment is a line of degrees of the key (`over=&key`), in eighths (`step=8n`): its hole is `&key`, and it taps the
 * host's meter, with no `&bar`, no voice and no card (#291). Its head is named for it (`&gypsy`), so `use &gypsy` takes
 * it, and a piece hands it to a form as the form's `&call` (`&call step=8n &gypsy`).
 *
 * Eight are written by hand, one at each of Jambot's presets' points, in that style's idiom and mode: Jambot's lead
 * fixture records its own lead bar by bar but not the key each was in, so its notes can't be read as degrees without
 * the band that chose the key. The ninth, `gypsy`, is lifted from examples/electroswing.md, at the point proposed for an
 * Electro swing preset; the tenth, `diesIrae`, the chant's head, is at the point proposed for a Spooky one (#349).
 *
 * Twenty-six more (#369), by hand: a second at each of the ten presets' points, listed after the first, so a query there
 * finds the first first and the second where the first is rejected; one at each point of a meter that had none, a bar
 * of that meter in eighths grouped as its pulses group (3/4 and 6/8 twice, 5/4, 7/8, 10/8, 12/8, 2/4, alla breve); and
 * six general-purpose, at the centre of style space and 0.2 from it on one axis each. Each is a file of the seed
 * library, `fragments/motifs/*.md` (`seed.ts`).
 */
import type { Fragment } from './fragments';
import { seedFragments } from './seed';

/** The motifs built so far: two at each of Jambot's presets, one at each meter's point, and six general-purpose, as the facet `motif`. */
export const MOTIF_FRAGMENTS: readonly Fragment[] = seedFragments('motifs');
