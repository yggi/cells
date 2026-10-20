/**
 * The bass lines: the repository's third facet, the first band member after the drums (yggi/jambot#423, decision 043's
 * order). Each fragment is one of the five patterns Jambot's bass blends by the style (yggi/jambot
 * packages/engine/src/bass.ts): a root on one and three, a pump of offbeat eighths, straight eighths, the funk line and a
 * walk on every beat. Each is a line of indices into the chord in force (`over=&harm`, #95, #125): it reads the host's
 * `&harm` and taps the host's main meter, with no `&bar` and no key of its own, so its holes are `&harm` and a meter that
 * holds its braid, and it fits any workbench that writes them first. Each carries its card on Jambot's bass channel, 2,
 * and a voice whose octave is the performer's to move.
 *
 * Every point of a bass line is associated as the facet `bass`: the role it is found as, so a query for the bass never
 * sees a lead's line (both are lines over `&harm`, which the fit can't tell apart). Each sits where its pattern's share of
 * `bass.ts`'s blend is greatest, and where several points tie, the one nearest the preset where its share is greatest; and
 * at each of Jambot's presets where `bass.ts` plays its pattern most, as the meters are at theirs (#209), so a query for the
 * bass at a preset finds that pattern first.
 * Each is a file of the seed library, `fragments/bass/*.md` (`seed.ts`), whose prose says what it is, where it sits and why,
 * and what `bass.ts` draws that a fixed line doesn't.
 */
import type { Fragment } from './fragments';
/** The bass lines built so far: `bass.ts`'s five patterns, associated as the facet `bass`. */
export declare const BASS_FRAGMENTS: readonly Fragment[];
