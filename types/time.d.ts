/**
 * `@yggi/cells/time`: analysis of what plays. Where a piece changes and repeats (`cones`, `swells`, `novelty` and
 * `sectionsOver` for its boundaries; `motifs` and `multiscale`; `structure` and `splices` from a plan), how it moves
 * at every scale (`scalograms` of the five `SIGNALS`, the wavelet's `grid`, `fold`, `ridges`, `reach`), its meter
 * and rhythm as necklaces (`levelsOf`, `foldings`, `alike`, `pulseOf`; `findMeter` for a meter found in onsets), a
 * render's spectrum (`waterfall`, `owners`, `peaks`) and how long to listen (`listening`). Nothing here is new: each name is what a frontend
 * reached by a module path (`docs/api.md` lists them), now from one place. The wavelet's `fold` is exported as
 * `foldScalogram`, and the found meter's `Found` as `FoundMeter`: the folder's `fold` and the repository's `Found`
 * are other things.
 */
export { cones, novelty, sectionsOver, swells, type Boundary } from './engine/time/boundaries';
export { findMeter, meterText, type Found as FoundMeter } from './engine/time/cycles';
export { motifs, multiscale, type Motif } from './engine/time/motifs';
export { alike, foldings, levelsOf, pulseOf, type Folding, type Level, type Necklace } from './engine/time/necklace';
export { scalograms, SIGNALS, type Onset, type Signal } from './engine/time/signals';
export { listening } from './engine/time/span';
export { owners, peaks, waterfall, type Sounding, type Waterfall } from './engine/time/spectrogram';
export { splices, type Splice } from './engine/time/splices';
export { structure, type StructureNode } from './engine/time/structure';
export { fold as foldScalogram, grid, MOST_RATE, PER_OCTAVE, reach, ridges, type Grid, type Scalogram } from './engine/time/wavelet';
