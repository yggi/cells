/**
 * `@yggi/cells/midi`: a piece as MIDI, and MIDI as a piece. A text's notes and routes (`channelTable`, `router`,
 * `routesOf`, `midiNote`, `noteOf`, `gmDrumNote`), the MIDI file and text formats (`readMidi`, `writeMidi`,
 * `pieceMidi`, `midiText`), notes folded into cells (`fold`, `cellsFromMidi`, `hints`), the keys a MIDI controller
 * plays (`keyboardOf`, `kitPads`), the clock, and the performer that reads a frame as a feel (`readerOf`, `played`,
 * `perform`). Nothing here is new: each name is what a frontend reached by a module path (`docs/api.md` lists them),
 * now from one place. The calls that run a text to its notes in one step, and a groove to its hits, are #715's, and
 * land here.
 */
export {
  channelTable,
  DEFAULT_BEND_RANGE,
  gmDrumNote,
  kitNotes,
  legatoNotes,
  midiNote,
  noteOf,
  rotationChannels,
  routable,
  router,
  routesOf,
  rowsOf,
  velocityOf,
  type ChannelTable,
  type OutputChoice,
  type Route,
  type Routes,
} from './engine/midi';
export { notesOf, type NotesOptions, type PlayedNote } from './engine/notesof';
export { mainMeter, ticksBetween, type ClockTicks } from './engine/midiclock';
export { isMidi, readMidi, writeMidi, type Smf } from './engine/midifile';
export { cellsFromMidi, type Imported, type StoryStep } from './engine/midiimport';
export { pieceMidi } from './engine/midiexport';
export { isMidiText, midiText, parseMidiText } from './engine/miditext';
export { armable, keyboardOf, keyFrequency, keyLevel, kitPads, rowNote, scaleKeys, type Armable, type Keyboard, type KeyMode, type Pad } from './engine/keys';
export { fold } from './engine/fold';
export { hints, MIN_NOTES, type Hint, type RepeatHint, type Span as HintSpan, type Transform } from './engine/fold/hints';
export {
  CONTRACT_WIDTHS,
  feelOf,
  played,
  readerByName,
  readerOf,
  readingOf,
  type DrumRole,
  type FeelEvent,
  type FeelFrame,
  type FeelPart,
  type Reading,
  type SectionType,
  type Widths,
} from './engine/perform/feel';
export { perform, widthsOf, type Performance, type TextBar } from './engine/perform/perform';
