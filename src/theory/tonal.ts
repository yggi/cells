/**
 * tonal's scale types, as Strudel's `scale("C:…")` reads them (decision 027, #337): its intervals, then its names
 * (copied from @tonaljs/scale-type 4.9.3, data.ts; a name's spaces are colons in Strudel's spelling,
 * `scale("C:harmonic:minor")`). Ours (modes.ts SCALES) keep their short names; where a name is both, the two agree
 * (tonal.test.ts checks).
 */
const TONAL: readonly (readonly string[])[] = [
  ['1P 2M 3M 5P 6M', 'major pentatonic', 'pentatonic'],
  ['1P 2M 3M 4P 5P 6M 7M', 'major', 'ionian'],
  ['1P 2M 3m 4P 5P 6m 7m', 'minor', 'aeolian'],
  ['1P 2M 3m 3M 5P 6M', 'major blues'],
  ['1P 3m 4P 5d 5P 7m', 'minor blues', 'blues'],
  ['1P 2M 3m 4P 5P 6M 7M', 'melodic minor'],
  ['1P 2M 3m 4P 5P 6m 7M', 'harmonic minor'],
  ['1P 2M 3M 4P 5P 6M 7m 7M', 'bebop'],
  ['1P 2M 3m 4P 5d 6m 6M 7M', 'diminished', 'whole-half diminished'],
  ['1P 2M 3m 4P 5P 6M 7m', 'dorian'],
  ['1P 2M 3M 4A 5P 6M 7M', 'lydian'],
  ['1P 2M 3M 4P 5P 6M 7m', 'mixolydian', 'dominant'],
  ['1P 2m 3m 4P 5P 6m 7m', 'phrygian'],
  ['1P 2m 3m 4P 5d 6m 7m', 'locrian'],
  ['1P 3M 4P 5P 7M', 'ionian pentatonic'],
  ['1P 3M 4P 5P 7m', 'mixolydian pentatonic', 'indian'],
  ['1P 2M 4P 5P 6M', 'ritusen'],
  ['1P 2M 4P 5P 7m', 'egyptian'],
  ['1P 3M 4P 5d 7m', 'neapolitan major pentatonic'],
  ['1P 3m 4P 5P 6m', 'vietnamese 1'],
  ['1P 2m 3m 5P 6m', 'pelog'],
  ['1P 2m 4P 5P 6m', 'kumoijoshi'],
  ['1P 2M 3m 5P 6m', 'hirajoshi'],
  ['1P 2m 4P 5d 7m', 'iwato'],
  ['1P 2m 4P 5P 7m', 'in-sen'],
  ['1P 3M 4A 5P 7M', 'lydian pentatonic', 'chinese'],
  ['1P 3m 4P 6m 7m', 'malkos raga'],
  ['1P 3m 4P 5d 7m', 'locrian pentatonic', 'minor seven flat five pentatonic'],
  ['1P 3m 4P 5P 7m', 'minor pentatonic', 'vietnamese 2'],
  ['1P 3m 4P 5P 6M', 'minor six pentatonic'],
  ['1P 2M 3m 5P 6M', 'flat three pentatonic', 'kumoi'],
  ['1P 2M 3M 5P 6m', 'flat six pentatonic'],
  ['1P 2m 3M 5P 6M', 'scriabin'],
  ['1P 3M 5d 6m 7m', 'whole tone pentatonic'],
  ['1P 3M 4A 5A 7M', 'lydian #5p pentatonic'],
  ['1P 3M 4A 5P 7m', 'lydian dominant pentatonic'],
  ['1P 3m 4P 5P 7M', 'minor #7m pentatonic'],
  ['1P 3m 4d 5d 7m', 'super locrian pentatonic'],
  ['1P 2M 3m 4P 5P 7M', 'minor hexatonic'],
  ['1P 2A 3M 5P 5A 7M', 'augmented'],
  ['1P 2M 4P 5P 6M 7m', 'piongio'],
  ['1P 2m 3M 4A 6M 7m', 'prometheus neapolitan'],
  ['1P 2M 3M 4A 6M 7m', 'prometheus'],
  ['1P 2m 3M 5d 6m 7m', 'mystery #1'],
  ['1P 2m 3M 4P 5A 6M', 'six tone symmetric'],
  ['1P 2M 3M 4A 5A 6A', 'whole tone', "messiaen's mode #1"],
  ['1P 2m 4P 4A 5P 7M', "messiaen's mode #5"],
  ['1P 2M 3M 4P 5d 6m 7m', 'locrian major', 'arabian'],
  ['1P 2m 3M 4A 5P 6m 7M', 'double harmonic lydian'],
  ['1P 2m 2A 3M 4A 6m 7m', 'altered', 'super locrian', 'diminished whole tone', 'pomeroy'],
  ['1P 2M 3m 4P 5d 6m 7m', 'locrian #2', 'half-diminished', 'aeolian b5'],
  ['1P 2M 3M 4P 5P 6m 7m', 'mixolydian b6', 'melodic minor fifth mode', 'hindu'],
  ['1P 2M 3M 4A 5P 6M 7m', 'lydian dominant', 'lydian b7', 'overtone'],
  ['1P 2M 3M 4A 5A 6M 7M', 'lydian augmented'],
  ['1P 2m 3m 4P 5P 6M 7m', 'dorian b2', 'phrygian #6', 'melodic minor second mode'],
  ['1P 2m 3m 4d 5d 6m 7d', 'ultralocrian', 'superlocrian bb7', 'superlocrian diminished'],
  ['1P 2m 3m 4P 5d 6M 7m', 'locrian 6', 'locrian natural 6', 'locrian sharp 6'],
  ['1P 2A 3M 4P 5P 5A 7M', 'augmented heptatonic'],
  ['1P 2M 3m 4A 5P 6M 7m', 'dorian #4', 'ukrainian dorian', 'romanian minor', 'altered dorian'],
  ['1P 2M 3m 4A 5P 6M 7M', 'lydian diminished'],
  ['1P 2M 3M 4A 5A 7m 7M', 'leading whole tone'],
  ['1P 2M 3M 4A 5P 6m 7m', 'lydian minor'],
  ['1P 2m 3M 4P 5P 6m 7m', 'phrygian dominant', 'spanish', 'phrygian major'],
  ['1P 2m 3m 4P 5P 6m 7M', 'balinese'],
  ['1P 2m 3m 4P 5P 6M 7M', 'neapolitan major'],
  ['1P 2M 3M 4P 5P 6m 7M', 'harmonic major'],
  ['1P 2m 3M 4P 5P 6m 7M', 'double harmonic major', 'gypsy'],
  ['1P 2M 3m 4A 5P 6m 7M', 'hungarian minor'],
  ['1P 2A 3M 4A 5P 6M 7m', 'hungarian major'],
  ['1P 2m 3M 4P 5d 6M 7m', 'oriental'],
  ['1P 2m 3m 3M 4A 5P 7m', 'flamenco'],
  ['1P 2m 3m 4A 5P 6m 7M', 'todi raga'],
  ['1P 2m 3M 4P 5d 6m 7M', 'persian'],
  ['1P 2m 3M 5d 6m 7m 7M', 'enigmatic'],
  ['1P 2M 3M 4P 5A 6M 7M', 'major augmented', 'major #5', 'ionian augmented', 'ionian #5'],
  ['1P 2A 3M 4A 5P 6M 7M', 'lydian #9'],
  ['1P 2m 2M 4P 4A 5P 6m 7M', "messiaen's mode #4"],
  ['1P 2m 3M 4P 4A 5P 6m 7M', 'purvi raga'],
  ['1P 2m 3m 3M 4P 5P 6m 7m', 'spanish heptatonic'],
  ['1P 2M 3m 3M 4P 5P 6M 7m', 'bebop minor'],
  ['1P 2M 3M 4P 5P 5A 6M 7M', 'bebop major'],
  ['1P 2m 3m 4P 5d 5P 6m 7m', 'bebop locrian'],
  ['1P 2M 3m 4P 5P 6m 7m 7M', 'minor bebop'],
  ['1P 2M 3M 4P 5d 5P 6M 7M', 'ichikosucho'],
  ['1P 2M 3m 4P 5P 6m 6M 7M', 'minor six diminished'],
  ['1P 2m 3m 3M 4A 5P 6M 7m', 'half-whole diminished', 'dominant diminished', "messiaen's mode #2"],
  ['1P 3m 3M 4P 5P 6M 7m 7M', 'kafi raga'],
  ['1P 2M 3M 4P 4A 5A 6A 7M', "messiaen's mode #6"],
  ['1P 2M 3m 3M 4P 5d 5P 6M 7m', 'composite blues'],
  ['1P 2M 3m 3M 4A 5P 6m 7m 7M', "messiaen's mode #3"],
  ['1P 2m 2M 3m 4P 4A 5P 6m 6M 7M', "messiaen's mode #7"],
  ['1P 2m 2M 3m 3M 4P 5d 5P 6m 6M 7m 7M', 'chromatic'],
];

/** An interval's semitones: a degree (1–7) and its quality — P perfect, M major, m minor, A augmented, d diminished. */
export function semitones(interval: string): number {
  const m = /^([1-7])([PMmAd])$/.exec(interval);
  if (!m) throw new Error(`not an interval: ${interval}`);
  const degree = Number(m[1]);
  const base = [0, 2, 4, 5, 7, 9, 11][degree - 1]!;
  const perfect = degree === 1 || degree === 4 || degree === 5;
  return base + ({ P: 0, M: 0, m: -1, A: 1, d: perfect ? -1 : -2 } as const)[m[2] as 'P' | 'M' | 'm' | 'A' | 'd'];
}

/** tonal's scales by name (words joined by spaces): their steps, as scan(…) takes them (they add up to 12). */
export const TONAL_SCALES: Readonly<Record<string, readonly number[]>> = Object.fromEntries(
  TONAL.flatMap(([intervals, ...names]) => {
    const at = intervals!.split(' ').map(semitones);
    const steps = at.map((p, i) => (at[i + 1] ?? 12) - p);
    return names.map((n) => [n, steps]);
  }),
);
