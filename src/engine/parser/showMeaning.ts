// Lifted from yggi/cell-studio src/layout/show.ts @ e168c8d (SHOW_MEANING): what each show= value means is part of the
// language (docs/language/display.md, the reference), so it lives with the parser; the workbench draws each one.
import { SHOWS } from './cell';

/** A show= value the language knows (a plugin's is the piece's own). */
export type CoreShow = (typeof SHOWS)[number];

/** What each show= value draws, in words: the reference's and the editor's. */
export const SHOW_MEANING: Readonly<Record<CoreShow, string>> = {
  braid: 'steps, coloured by pitch',
  pattern: 'rhythm only: hits and rests',
  equal: 'its entries evenly round the ring, wired from the slots they take: the readers stay put as it turns',
  notes: 'note names: C4 D4 E4',
  midi: 'MIDI numbers: 60 62 64',
  do: 'movable do: do re mi from the tonic',
  degrees: 'scale degrees: 1 2 3',
  table: 'its entries as numbers',
  scale: 'a scale: its mode on its tonic',
  mode: 'its mode: major, minor, Dorian …',
  key: 'a key: its tonic',
  grid: 'a grid: steps to its period',
  meter: 'a meter: beats to the bar',
  spectrum: 'the sound: a spectral waterfall',
  adsr: 'an envelope curve',
  mix: 'the voices it mixes',
  wave: 'its waveform: one cycle, and the sound itself while it plays',
  brightness: 'its modes by brightness: each degree shaded by the mode that starts on it (Lydian bright … Locrian dark)',
  levels: 'its levels, as bars',
  note: 'a note in the graph: its label',
  petal: 'small, hung from the cell that uses it',
  off: 'hidden from the graph',
  matrix: 'a barrel of pins: a ring per part, a pin where it plays',
  lfo: 'one cycle of its movement, round the ring, at its rate',
};
