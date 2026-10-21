/**
 * The modes: the repository's sixth facet, the key the harmonies and the bass lines read (#228, decision 056). Each
 * fragment defines `key`, the piece's main key (decision 047's interface name), as `&key scale(mode, free(C))`: a mode
 * stated, its tonic left to the host, a number left to the performer that Jambot's key plan sets as it moves. It uses
 * nothing, so it fits any workbench that has no key yet.
 *
 * The four modes of Jambot's composer (`COMPOSER_MODES`, yggi/jambot packages/engine/src/key.ts), each associated as the
 * facet `mode` at the point of each preset that plays it (`PRESETS`' `mode`, style.ts there): aeolian at Synth-pop's,
 * Techno's and Lo-fi hip hop's, dorian at Deep house's and Funk's, ionian at Ambient's, Bossa nova's and Swing jazz's. No
 * preset is mixolydian, which sits halfway between Funk's point and Bossa nova's. A fifth, the bell and scale, is ionian
 * and a rhythm at once: the West African bell is the major scale's intervals, so its key stepped is its timeline.
 * Each is a file of the seed library, `fragments/modes/*.md` (`seed.ts`), whose prose says what it is, where it sits and why.
 */
import type { Fragment } from './fragments';
import { seedFragments } from './seed';

/** The modes built so far: aeolian, dorian, ionian, mixolydian, and the bell and scale, associated as the facet `mode`. */
export const MODE_FRAGMENTS: readonly Fragment[] = seedFragments('modes');
