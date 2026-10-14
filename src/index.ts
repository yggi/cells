/**
 * The cells language. Text in, events out: `compileSource` reads a piece, `plan` and `windowAt` realize it a window at a
 * time, and `createHost` answers the same as messages (in a worker, in this thread, or in node). `shorten` writes a piece
 * shorter, `fold` and `cellsFromMidi` write cells from notes, `pieceMidi` and `readMidi` carry MIDI files.
 * Every module is also reachable on its own: `@yggi/cells/engine/<module>`, `@yggi/cells/theory/<module>`.
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
export type { CompileResult } from './engine/program';
export type { Diagnostic } from './engine/ast';
