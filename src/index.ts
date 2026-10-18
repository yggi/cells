/**
 * The cells language. Text in, events out: `compileSource` reads a piece, `plan` and `windowAt` realize it a window at a
 * time, and `createHost` answers the same as messages (in a worker, in this thread, or in node). `shorten` writes a piece
 * shorter, `fold` and `cellsFromMidi` write cells from notes, `pieceMidi` and `readMidi` carry MIDI files. `createRepository`
 * holds fragments and finds them by their place in style space and by how often they were used together; `METER_FRAGMENTS`
 * are its meters, `RHYTHM_FRAGMENTS` its rhythms, `LIBRARY` both, read from the seed library's files (`fragments/`);
 * `readFragment` and `writeFragment` read and write a fragment as a file, Markdown with YAML frontmatter; `readPiece` and
 * `writePiece` a piece (an example, a person's) as the same kind of file, its title, tags and tier in the frontmatter,
 * and `movedCard` takes them out of a text written the old way.
 * `holesOf` reads what a fragment uses, defines and its clock needs, `unionOf` and `fitOf` add it to a workbench and say
 * whether it fits.
 * Every module is also reachable on its own: `@yggi/cells/engine/<module>`, `@yggi/cells/theory/<module>`,
 * `@yggi/cells/repository/<module>`.
 */
export { compileSource } from './engine/compile';
export { parse, pieceMeta, type PieceMeta } from './engine/parser';
export { plan, type Plan, type Played } from './engine/realize';
export { windowAt, type Window } from './engine/schedule';
export { createHost, planOf, type ToEngine, type FromEngine } from './engine/host';
export { shorten, shortenAll } from './engine/shorten';
export { fold } from './engine/fold';
export { cellsFromMidi } from './engine/midiimport';
export { pieceMidi } from './engine/midiexport';
export { readMidi, writeMidi, isMidi } from './engine/midifile';
export { PRESETS, type Preset } from './engine/presets';
export { isPieceFile, readPiece, writePiece, type PieceFile, type PieceFileProblems, type PieceFrontmatter } from './engine/piecefile';
export { movedCard } from './engine/shorten/card';
export type { CompileResult } from './engine/program';
export type { Diagnostic } from './engine/ast';
export { createRepository, type Fragment, type Found, type QueryOptions, type Repository, type StylePoint, type WeightedPoint } from './repository/fragments';
export { METER_FRAGMENTS } from './repository/meters';
export { RHYTHM_FRAGMENTS } from './repository/rhythms';
export { LIBRARY } from './repository/library';
export { holesOf, INTERFACE_NAMES, type ClockNeed, type Holes } from './repository/holes';
export { fitOf, unionOf, type Fit, type Union } from './repository/fit';
export { readFragment, readFragments, writeFragment, type FragmentFile, type FragmentFileProblems, type LibraryFile, type Meta } from './repository/files';
