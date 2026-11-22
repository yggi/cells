/**
 * `@yggi/cells/repository`: fragments found by their place in style space, and how a fragment is read. Hold and query
 * them (`createRepository`, `fragmentDistance`, `pointDistance`), learn from a player's filing (`fileFragment`,
 * `useFragments`, `renamedLayer`), fit a template onto a text (`fitsAs`, `useOn`, `cachedFit`), read what a fragment
 * uses and defines (`holesOf`, `partsOf`, `signatureOf`), read it as cells means it (the chords, the voice, the style
 * and the point of a text: `readHarm`, `readVoice`, `readStyle`, `readPoint`), take it apart and recognise it
 * (`decompose`, `createRecogniser`), and write a score's `from` lines (`fromLine`, `takeIn`). Nothing here is new: each
 * name is what a frontend reached by a module path (`docs/api.md` lists them), now from one place. A learned layer's
 * migration (`engine/migrate/axes`, `engine/migrate/moved`) is not here: it becomes one call, #716's.
 */
export {
  byId,
  CO_USE_PULL,
  createRepository,
  EMPTY_LAYER,
  fragmentDistance,
  layerProblems,
  pointDistance,
  type Found,
  type Fragment,
  type LearnedLayer,
  type LearnedPoint,
  type Merged,
  type QueryOptions,
  type RepositoryOptions,
  type Repository,
  type StylePoint,
  type UsedPair,
  type WeightedPoint,
} from './repository/fragments';
export { canonicalText, fileFragment, renamedLayer, sameText, usedTogether, useFragments, type Filed, type Filing, type Use } from './repository/learned';
export { axedLayer, migrateLayer, MOVED_IDS, movedLayer, movedText, roledLayer, signedLayer } from './repository/migratelayer';
export { cachedFit, declarations, fitsAs, unionOf, useOn, type FitAs, type FragmentRef, type Union, type UseOn, type UseOnOptions } from './repository/fit';
export { holesOf, type ClockNeed, type Holes } from './repository/holes';
export { readFragment, readFragments, writeFragment, type FragmentFile, type FragmentFileProblems, type LibraryFile, type Meta } from './repository/files';
export { decompose, writtenOut, type DecomposeOptions, type Decomposition, type LineNote } from './repository/decompose';
export { ALL_OPERATORS, createRecogniser, type PathStep, type Recognised, type RecogniseOptions, type Recogniser } from './repository/recognise';
export { extract, type ExtractOptions, type Extraction, type NoExtraction } from './repository/extract';
export { audition, headsOf, playedHeadsOf, type Audition, type AuditionOptions } from './repository/audition';
export { catalogue, type CatalogueEntry } from './repository/catalogue';
export { coreFragment, type FragmentCore } from './repository/corefragment';
export { bodyOf, expand, expansion, fragmentHash, hasFrom, partOf, partsOf, signatureOf } from './engine/use';
export { readFrom } from './engine/parser/use';
export { fromLine, references, type FromLine, type Reference } from './engine/references';
export { takeIn, type TakenIn } from './engine/takein';
export { RENAMED_IDS, wordOf } from './engine/renamed';
export { chordOf, QUALITY_STACKS, readChords, readHarm, type HarmReading, type ReadChord } from './engine/reading/chords';
export { readPoint } from './engine/reading/point';
export { BAR_4_4, readStyle, readTiming, type Bar, type StyleReading, type TimingReading } from './engine/reading/style';
export { partDistance, readVoice, VOICES, voiceOf, type Voice, type VoiceLandmark, type VoiceReading } from './engine/reading/voice';
