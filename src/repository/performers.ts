/**
 * The performers: the repository's facet `performer` (decision 058; #282), who plays which part. Each fragment holds one
 * gate named by its role (`&drums`, `&bass`, `&pad`, `&stab`, `&lead`), which plays a part the score fills (a hole: `&drumlines`, `&bassline`,
 * `&padline`, `&stabline`, `&leadline`) at the levels it writes (a hole too: `&bassLevel` …), on the instrument it `use`s, moved where the instrument's register isn't the part's
 * (`play=&bassline^$-12`).
 *
 * They are Jambot's performers as its section text plays them (yggi/jambot packages/score/src/section-text.ts @ 24a528b):
 * one voice, register and channel a part, the same for all eight presets, so the eight share the four, each associated at
 * every preset's point. The seeds hold no ensembles: a section plays the parts it has (a section with no stab has no stab
 * player), so an ensemble of all four would leave holes a score doesn't fill; a text's ensemble is the performers it uses.
 * The drummer plays a stack of lines, one per drum role (`&drumlines [&kick, &backbeat, &hat …]`), on its own set-up of
 * the core kit, each hit still named by its line, the role the feel reads (#287). Each is a file of the seed library, `fragments/performers/*.md` (`seed.ts`), whose prose says what it plays and why.
 */
import type { Fragment } from './fragments';
import { seedFragments } from './seed';

/** The performers built so far: Jambot's drums, bass, pad, stab and lead, associated as the facet `performer`. */
export const PERFORMER_FRAGMENTS: readonly Fragment[] = seedFragments('performers');
