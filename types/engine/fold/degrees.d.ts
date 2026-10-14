import type { Line } from './ir';
/** A key: its scale's name (`scale(name, tonic)`), its tonic (a pitch class) and its degrees' steps above the tonic. */
export interface Key {
    readonly name: 'major' | 'minor' | 'harmonic' | 'melodic';
    readonly tonic: number;
    readonly positions: readonly number[];
}
export declare const keyOf: (name: Key["name"], tonic: number) => Key;
/** A key as the cell that is it: `scale(minor, C)`. */
export declare const scaleText: (k: Key) => string;
/** A key as words: `C minor`, `C harmonic minor`. */
export declare const keyName: (k: Key) => string;
/** A degree's pitch (semitones from C4), as a line reading through the key plays it (the tonic in the octave above
 * C4, each seven degrees an octave). */
export declare function pitchOf(k: Key, degree: number): number;
/** A pitch (semitones from C4) as a degree of the key: in it, the degree; else the nearer of the degree below with
 * sharps and the one above with flats (a sharp where they are as near). */
export declare function degreeOf(k: Key, pitch: number): {
    degree: number;
    alter: number;
};
/** A degree as braid text: `6`, `6#`, `7b`, `-2##`. */
export declare const degreeText: ({ degree, alter }: {
    degree: number;
    alter: number;
}) => string;
/**
 * The key the lines need fewest accidentals in: of the twelve tonics, major, minor and harmonic minor, the one whose
 * sharps and flats over every note are fewest; a tie goes to the key whose tonic is the bass at the end (a piece ends
 * on its tonic), then to the commoner scale. Null when the lines have no pitches.
 */
export declare function bestKey(lines: readonly Line[]): Key | null;
/** The lines with their pitches as degrees of the key (`6#`); a drum stays as it is. */
export declare function inDegrees(lines: readonly Line[], k: Key): Line[];
