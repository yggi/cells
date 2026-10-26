/**
 * The performers: the repository's facet `performer` (decision 058; #282), who plays which part. Each fragment holds one
 * gate named by its role (`&drums`, `&bass`, `&pad`, `&stab`, `&lead`), which plays a part the score fills (a hole:
 * `&groove`, `&bassline`, `&padline`, `&stabline`, `&leadline`) at the levels it writes (a hole too: `&bassLevel` …; the
 * drums' hits carry theirs, `2:.4`), on the instrument it `use`s, moved where the instrument's register isn't the part's
 * (`play=&bassline^$-12`).
 *
 * They are Jambot's performers as its section text plays them (yggi/jambot packages/score/src/section-text.ts @ 24a528b):
 * one voice, register and channel a part, the same for all eight presets, so the eight share the five, each associated at
 * every preset's point. The seeds hold no ensembles: a section plays the parts it has (a section with no stab has no stab
 * player), so an ensemble of all five would leave holes a score doesn't fill; a text's ensemble is the performers it uses.
 * Each is a file of the seed library, `fragments/performers/*.md` (`seed.ts`), whose prose says what it plays and why.
 */
import type { Fragment } from './fragments';
/** The performers built so far: Jambot's drums, bass, pad, stab and lead, associated as the facet `performer`. */
export declare const PERFORMER_FRAGMENTS: readonly Fragment[];
