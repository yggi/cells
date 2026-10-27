/**
 * The instruments: the repository's fifth facet, the voices the patterns play through (decision 054; #225). An instrument
 * fragment defines voices and uses nothing, so it fills the holes a groove leaves and fits any workbench; a kit's voices
 * are named so that General MIDI sends each on its drum note (`GM_KIT`, `gmDrumNote`).
 *
 * The General MIDI kit (`gm_kit`) defines a voice for each of General MIDI's 47 percussion notes, and a piece takes the
 * ones it needs by name (`use &bd, &sd, &hh from gm_kit`). A kit is style-neutral: it is associated once, as the facet
 * `instrument`, at the centre of style space, at weight 1, so a query for an instrument finds it first.
 * Each is a file of the seed library, `fragments/instruments/*.md` (`seed.ts`), whose prose says what it is and why.
 */
import type { Fragment } from './fragments';
import { seedFragments } from './seed';

/** The instruments built so far: the General MIDI kit and the four performers' instruments, associated as the facet `instrument`. */
export const INSTRUMENT_FRAGMENTS: readonly Fragment[] = seedFragments('instruments');
