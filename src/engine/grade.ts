/**
 * A key's grades (#508, decision 072): its tonal hierarchy, Lerdahl's basic space (Tonal Pitch Space, 2001, ch. 2), as a
 * meter's levels are its metrical one. Each level is `even` inside the one above, the chain decision 072 names: the key's
 * degrees (the scale, `even(7, 12, mode)` for a diatonic key), its triad `even(3, n)` of them from a degree, the root and
 * fifth `even(2, 3, 1)` of the triad, and the root its first. A pitch's grade is the finest level it is in: 0 the root,
 * 1 the fifth, 2 the triad's third, 3 the scale, 4 the chromatic. Graded as a meter's levels are written, from the ends
 * (yggi/music-commons `contracts/meter`): `*` the root, `+` the fifth, `-` the third, `.` the scale, `,` the chromatic, so
 * C major's tonic is `*,.,-.,+,.,.`, as 12/8's bar is `*..-..+..-..`.
 *
 * For a key of seven notes this is Lerdahl's basic space. For any other it is the same chain, taken as it is, the
 * "triad" `even(3, n)` of the key's n degrees: a pentatonic's is a sus2 (C D G in C), a blues scale's a sus4 (C F G), the
 * whole tone's the augmented triad (C E G#), each the three of its degrees as even as three go (#508, the owner's (a)).
 *
 * No new form (the owner on #508): a key already is its levels. The query reads the key a text writes (`scale(major, C)`,
 * `scale(&mode, &tonic)`, a scan over a turned twelve), through the tables it reads, as its notes are read. The same chain
 * is playable as tables over the key: `&triad over=&key[>>k] even(3, 7)` is the triad on degree k, `&power over=&triad
 * even(2, 3, 1)` its root and fifth (`grade.test.ts` holds the two for the same pitches).
 */
import { even, mod } from '../theory/modes';
import { resolveIn, semitones } from './helix';
import { codeShifts, type CompileResult, type Shifts } from './program';

/** The grades as written, coarse to fine: the root, the fifth, the third, the scale, the chromatic. */
export const GRADES = '*+-.,';

/** The pitch class (0 C … 11 B) of a key's degree, read through its tables as a note on it is. */
function pitchClassOf(result: CompileResult, key: string, degree: number, shifts: Shifts): number {
  const r = resolveIn(result, key, 0, degree, 0, shifts);
  return mod(Math.round(semitones(result, r.root, r.position)), 12);
}

/**
 * A key's basic space from its degree `degree` (0 the tonic's triad; 4 the dominant's in a major key): each pitch class's
 * grade, 0 to 4, twelve of them. Null where the key isn't one: no cell of that name, or no degrees to read.
 */
export function gradesOf(result: CompileResult, key: string, degree = 0, shifts: Shifts = codeShifts(result)): number[] | null {
  const n = result.cells.get(key)?.units.length ?? 0;
  if (n < 3) return null;
  const pcs = Array.from({ length: n }, (_, d) => pitchClassOf(result, key, d, shifts));
  // (the chain: the triad even(3, n) of the degrees from `degree`, its root and fifth even(2, 3, 1), its root the first)
  const triad = even(3, n).map((i) => pcs[mod(degree + i, n)]!);
  const fifths = even(2, 3, 1).map((i) => triad[i]!);
  const grades = Array.from({ length: 12 }, () => 4);
  for (const pc of pcs) grades[pc] = 3;
  for (const pc of triad) grades[pc] = 2;
  for (const pc of fifths) grades[pc] = 1;
  grades[fifths[0]!] = 0;
  return grades;
}

/** A pitch's grade in a key (`gradesOf`): semitones from C4, any octave; null where the key isn't one. */
export function gradeOf(result: CompileResult, key: string, pitch: number, degree = 0, shifts?: Shifts): number | null {
  const grades = gradesOf(result, key, degree, shifts);
  return grades ? grades[mod(Math.round(pitch), 12)]! : null;
}

/** A key's basic space written as grades, C first (`*,.,-.,+,.,.`: C major's tonic). */
export const gradeText = (grades: readonly number[]): string => grades.map((g) => GRADES[g]).join('');
