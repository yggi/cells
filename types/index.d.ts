/**
 * The cells language. Text in, events out: `compileSource` reads a piece, `plan` and `windowAt` realize it a window at a
 * time, and `createHost` answers the same as messages (in a worker, in this thread, or in node). `styleAt` reads the style a piece plays at a time. `shorten` writes a piece
 * shorter, `normalise` in the canonical spelling, `toCore` in the core grammar for a machine reader (decision 069), `migrate` a text of an earlier version as it is written now, `variations` and `varied` vary a fragment (its anchors: `anchorsOf`), `fold` and `cellsFromMidi` write cells from notes, `hints` says what repeats in them (#158), `pieceMidi` and
 * `readMidi` carry MIDI files, `pieceAudio`, `createRenderer` and `writeWav` render audio (decision 062). `createRepository` holds fragments and finds them by their place in style space and by how
 * often they were used together; `METER_FRAGMENTS` are its meters, `RHYTHM_FRAGMENTS` its rhythms, `BASS_FRAGMENTS` its bass lines, `HARMONY_FRAGMENTS` its harmonies, `INSTRUMENT_FRAGMENTS` its instruments, `EXPRESSION_FRAGMENTS` its expressions (a vibrato), `MODE_FRAGMENTS` its modes, `STAB_FRAGMENTS` its stab lines, `MOTIF_FRAGMENTS` its motifs, `FORM_FRAGMENTS` its forms, `LIBRARY` all, read
 * from the seed library's files (`fragments/`);
 * `readFragment` and `writeFragment` read and write a fragment as a file, Markdown with YAML frontmatter; `readPiece` and
 * `writePiece` a piece (an example, a person's) as the same kind of file, its title, tags and tier in the frontmatter,
 * and `movedCard` takes them out of a text written the old way; a file's code is the join of its cells blocks, the rest prose
 * (`readLiterate`, `fileLine`, `rewrite`).
 * `holesOf` reads what a fragment uses, defines and its clock needs and a template's signature; `useOn` takes a template
 * onto a workbench by a `from` line, and `fitsAs` says whether it fits there.
 * Every module is also reachable on its own: `@yggi/cells/engine/<module>`, `@yggi/cells/theory/<module>`,
 * `@yggi/cells/repository/<module>`.
 */
export { compileSource } from './engine/compile';
export { parse, pieceMeta, type PieceMeta } from './engine/parser';
export { plan, type Plan, type Played } from './engine/realize';
export { windowAt, type Window } from './engine/schedule';
export { createHost, planOf, type ToEngine, type FromEngine } from './engine/host';
export { shorten, shortenAll, type ShortenOptions } from './engine/shorten';
export { normalise } from './engine/normalise';
export { migrate } from './engine/migrate';
export { toCore, type Core, type CoreOptions, type Interface } from './engine/core';
export { anchorsOf, varied, variations, type Anchor, type Operator, type Variation, type VaryOptions } from './engine/vary';
export { fold } from './engine/fold';
export { hints, MIN_NOTES, type Hint, type RepeatHint, type Span as HintSpan, type Transform } from './engine/fold/hints';
export { cellsFromMidi } from './engine/midiimport';
export { pieceMidi } from './engine/midiexport';
export { spanOf, LONGEST, TAIL, UNBOUNDED, type Span, type SpanOptions } from './engine/span';
export { readMidi, writeMidi, isMidi } from './engine/midifile';
export { pieceAudio, type AudioOptions, type PieceAudio } from './engine/audioexport';
export { createRenderer, loudness, DEFAULT_RATE, type Renderer, type RenderOptions, type RenderDiagnostic, type Rendered, type Tracks } from './engine/render';
export { writeWav, type WavFormat } from './engine/wavfile';
export { EXAMPLES, type Example, type ExampleKey } from './engine/examples';
export { PRESETS, type Preset, type PresetKey } from './engine/presets';
export { isPieceFile, lockfileOf, readPiece, withLockfile, writePiece, type PieceFile, type PieceFileProblems, type PieceFrontmatter } from './engine/piecefile';
export { fileLine, readLiterate, rewrite, type CodeLine, type Layout, type Literate, type LiterateProblems } from './engine/literate';
export { movedCard } from './engine/shorten/card';
export { jacksOf, patch, unpatch, PatchError, type Jack } from './engine/patch';
export type { CompileOptions, CompileResult, Locked, Performer, Resolve, Used } from './engine/program';
export { bodyOf, expand, fragmentHash, signatureOf } from './engine/use';
export type { Diagnostic } from './engine/ast';
export { createRepository, EMPTY_LAYER, layerProblems, pointDistance, type Fragment, type Found, type LearnedLayer, type LearnedPoint, type Merged, type QueryOptions, type Repository, type StylePoint, type UsedPair, type WeightedPoint, } from './repository/fragments';
export { canonicalText, fileFragment, sameText, usedTogether, useFragments, renamedLayer, type Filed, type Filing, type Use } from './repository/learned';
export { METER_FRAGMENTS } from './repository/meters';
export { AXES, AXIS_NAMES, SLOTS, type Axis } from './engine/style';
export { styleAt } from './engine/styleat';
export { CONTRACT_WIDTHS, feelOf, played, readerOf, readingOf, type DrumRole, type FeelEvent, type FeelFrame, type FeelPart, type Reading, type SectionType, type Widths, } from './engine/perform/feel';
export { perform, widthsOf, type Performance, type TextBar } from './engine/perform/perform';
export { meterOfFrame, swungPlace, writtenPlace } from './engine/meter';
export { RHYTHM_FRAGMENTS } from './repository/rhythms';
export { BASS_FRAGMENTS } from './repository/bass';
export { HARMONY_FRAGMENTS } from './repository/harmony';
export { INSTRUMENT_FRAGMENTS } from './repository/instruments';
export { MODE_FRAGMENTS } from './repository/modes';
export { PERFORMER_FRAGMENTS } from './repository/performers';
export { STAB_FRAGMENTS } from './repository/stab';
export { EXPRESSION_FRAGMENTS } from './repository/expression';
export { MOTIF_FRAGMENTS } from './repository/motifs';
export { FORM_FRAGMENTS } from './repository/forms';
export { BAND_FRAGMENTS } from './repository/bands';
export { nearestStyle, STYLE_FRAGMENTS, STYLES, type NearStyle, type Style } from './repository/styles';
export { MODULE_FRAGMENTS } from './repository/modules';
export { bandAt, instrumentsAt, resolveBand, scoreStyle, PERFORMER_VOICES, type FoundInstrument, type VoicedPart } from './repository/band';
export { LIBRARY, resolveSeed } from './repository/library';
export { RENAMED_IDS, wordOf } from './engine/renamed';
export { ALL_OPERATORS, createRecogniser, type PathStep, type Recognised, type RecogniseOptions, type Recogniser } from './repository/recognise';
export { decompose, writtenOut, type Decomposition, type DecomposeOptions, type LineNote } from './repository/decompose';
export { holesOf, type ClockNeed, type Holes } from './repository/holes';
export { coreFragment, type FragmentCore } from './repository/corefragment';
export { fitsAs, useOn, type FitAs, type UseOn, type UseOnOptions } from './repository/fit';
export { readFragment, readFragments, writeFragment, type FragmentFile, type FragmentFileProblems, type LibraryFile, type Meta } from './repository/files';
