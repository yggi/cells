/**
 * A disentangler (#344, docs/notes/fold.md): a piece's pitches as degrees of its key, so a phrase that comes back a
 * step of the scale higher (a sequence: its thirds major then minor) is the same phrase moved a degree (`&m^1`), as one
 * a fifth up is moved seven semitones. The key is the scale the notes need fewest accidentals over; a note outside it is
 * its nearest degree with a sharp or a flat (`6#`), which moves with it. Pure.
 */
import { SCALES } from '../../theory/modes';
import type { Line } from './ir';

/** A key: its scale's name (`scale(name, tonic)`), its tonic (a pitch class) and its degrees' steps above the tonic. */
export interface Key {
  readonly name: 'major' | 'minor' | 'harmonic' | 'melodic';
  readonly tonic: number;
  readonly positions: readonly number[];
}

/** The scales a key is looked for in, the commoner first (a tie goes to it). */
const NAMES: readonly Key['name'][] = ['major', 'minor', 'harmonic'];
const TONICS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export const keyOf = (name: Key['name'], tonic: number): Key => {
  const positions = [0];
  for (const step of SCALES[name]!.steps.slice(0, -1)) positions.push(positions[positions.length - 1]! + step);
  return { name, tonic, positions };
};

/** A key as the cell that is it: `scale(minor, C)`. */
export const scaleText = (k: Key): string => `scale(${k.name}, ${TONICS[k.tonic]})`;
/** A key as words: `C minor`, `C harmonic minor`. */
export const keyName = (k: Key): string => `${TONICS[k.tonic]} ${k.name === 'harmonic' || k.name === 'melodic' ? `${k.name} minor` : k.name}`;

/** A degree's pitch (semitones from C4), as a line reading through the key plays it (the tonic in the octave above
 * C4, each seven degrees an octave). */
export function pitchOf(k: Key, degree: number): number {
  const n = k.positions.length;
  const octave = Math.floor(degree / n);
  return k.tonic + k.positions[degree - octave * n]! + 12 * octave;
}

/** A pitch (semitones from C4) as a degree of the key: in it, the degree; else the nearer of the degree below with
 * sharps and the one above with flats (a sharp where they are as near). */
export function degreeOf(k: Key, pitch: number): { degree: number; alter: number } {
  const n = k.positions.length;
  const octave = Math.floor((pitch - k.tonic) / 12);
  const within = pitch - k.tonic - 12 * octave;
  let i = 0;
  while (i + 1 < n && k.positions[i + 1]! <= within) i++;
  const below = octave * n + i;
  const up = pitch - pitchOf(k, below);
  if (up === 0) return { degree: below, alter: 0 };
  const down = pitch - pitchOf(k, below + 1);
  return -down < up ? { degree: below + 1, alter: down } : { degree: below, alter: up };
}

/** A degree as braid text: `6`, `6#`, `7b`, `-2##`. */
export const degreeText = ({ degree, alter }: { degree: number; alter: number }): string => `${degree}${alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter)}`;

/**
 * The key the lines need fewest accidentals in: of the twelve tonics, major, minor and harmonic minor, the one whose
 * sharps and flats over every note are fewest; a tie goes to the key whose tonic is the bass at the end (a piece ends
 * on its tonic), then to the commoner scale. Null when the lines have no pitches.
 */
export function bestKey(lines: readonly Line[]): Key | null {
  const pitches = lines.flatMap((l) => l.chords.flatMap((c) => c.values.map(Number).filter((v) => Number.isInteger(v))));
  if (!pitches.length) return null;
  // (the lowest note sounding at the end: the bass of the last chord, however early it started)
  const chords = lines.flatMap((l) => l.chords.filter((c) => c.values.some((v) => Number.isInteger(Number(v)))));
  const end = Math.max(...chords.map((c) => c.at + c.dur));
  const lastBass = Math.min(...chords.filter((c) => c.at + c.dur === end).flatMap((c) => c.values.map(Number).filter((v) => Number.isInteger(v))));
  const home = ((lastBass % 12) + 12) % 12;
  let best: { key: Key; cost: number } | null = null;
  for (const name of NAMES) {
    for (let tonic = 0; tonic < 12; tonic++) {
      const key = keyOf(name, tonic);
      const cost = pitches.reduce((a, p) => a + Math.abs(degreeOf(key, p).alter), 0);
      // (fewest accidentals; then the tonic the piece ends on; then the commoner scale)
      const better = !best || cost < best.cost || (cost === best.cost && tonic === home && best.key.tonic !== home);
      if (better) best = { key, cost };
    }
  }
  return best!.key;
}

/** The lines with their pitches as degrees of the key (`6#`); a drum stays as it is. */
export function inDegrees(lines: readonly Line[], k: Key): Line[] {
  return lines.map((l) => ({
    ...l,
    chords: l.chords.map((c) => ({ ...c, values: c.values.map((v) => (Number.isInteger(Number(v)) ? degreeText(degreeOf(k, Number(v))) : v)) })),
  }));
}
