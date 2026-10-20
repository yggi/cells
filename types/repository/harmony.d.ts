/**
 * The harmonies: the repository's fourth facet, the chord in force the bass and the comp read (yggi/jambot#425, decision
 * 043's order). Each fragment is a vamp of Jambot's themes (yggi/jambot packages/engine/src/themes.ts, `VAMPS`): one
 * chord or two, eight bars of triads over the host's key, laid out as `buildTheme` lays a vamp under harm 0.15, a chord
 * per four bars. Each defines `&harm` and uses the host's `key` and main meter, with no card of its own, so it fits any
 * workbench that writes them first and plays through what reads it (`over=&harm`).
 *
 * The mode is the host key's, so one text is every mode's vamp of the same degrees: the twelve vamps of the four modes
 * are five texts, each associated as the facet `harmony` at the point of each preset whose mode plays it (aeolian at
 * Techno's, dorian at Funk's, ionian at Ambient's with its harmony at 0.12, where `buildTheme` lays it a chord per four
 * bars). No preset is mixolydian, so mixolydian adds no point. A mode's vamps are drawn alike, so a query for the
 * harmony at its point finds all of them at distance 0.
 * Each is a file of the seed library, `fragments/harmony/*.md` (`seed.ts`), whose prose says what it is, where it sits and why.
 */
import type { Fragment } from './fragments';
/** The harmonies built so far: the five texts of `themes.ts`'s vamps, associated as the facet `harmony`. */
export declare const HARMONY_FRAGMENTS: readonly Fragment[];
