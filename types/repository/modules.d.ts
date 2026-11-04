/**
 * The modules: a modular synthesizer's, the repository's facet `module` (decision 067 §3; #457). A module is a fragment
 * with a signature: its optional parameters are its jacks, each one's line its default (the knob's place when nothing
 * is patched in), its main parameter the audio it takes in, and its head what it gives out. `osc` (a voice: the VCO),
 * `lowpass` and `highpass` (instruments with a filter: VCFs), `amp` (an instrument with an envelope and a level: the
 * VCA), `lfo` (a braid turned slowly) and `sh` (a sample and hold, the language's chance). Each is a file of the seed
 * library, `fragments/modules/*.md` (`seed.ts`), whose prose says its jacks and defaults.
 */
import type { Fragment } from './fragments';
/** The modules built so far, associated as the facet `module`, at the centre of style space, at a quarter weight. */
export declare const MODULE_FRAGMENTS: readonly Fragment[];
