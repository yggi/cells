/**
 * A MIDI file as text (#307): what the code editor shows of a `.mid`, and what is saved back as one. The file as it is,
 * readably: a header, the tempo map, then a track at a time, a line an event at its place in bars and beats.
 *
 * ```
 * midi format=1 ppq=480 name="Bach, Prelude and Fugue in C minor"
 * copyright "Typeset by … (CC BY-SA 4.0)"   (the file's copyright notice, if it has one)
 * tempo 1:1:0 107.9
 * meter 1:1:0 4/4
 *
 * track "saw"
 * 1:1:0 ch1 C5 120 v90        (a note: where, channel, key, ticks it lasts, velocity)
 * 1:1:120 ch1 Eb4 120 v90
 * program 1:1:0 ch1 81
 * bend 3:2:0 ch1 8192
 * ```
 *
 * A place is bar:beat:tick, from 1:1:0, through the time signatures (`meter`, 4/4 until the first); a key a name (C4 is
 * middle C, 60; sharps or flats) or a number. Lines starting `#` are comments. `isMidiText` tells such a text from a
 * piece's code: its first line that isn't blank or a comment starts `midi`. Pure: text in, `Smf` out, and back.
 */
import type { Diagnostic } from './ast';
import type { Smf } from './midifile';
/** A key's name: 60 is C4. */
export declare const keyName: (key: number) => string;
/** A key from its name (C4, C#4, Db4, Cb4, B#3 …) or its number; null if it is neither, or out of 0–127. */
export declare function keyOf(word: string): number | null;
/** Is this text a MIDI file's (its first line that isn't blank or a comment starts `midi`)? */
export declare function isMidiText(text: string): boolean;
/** A MIDI file as text: its header, tempos and meters, then its tracks. `file`: its name, said in the first comment. */
export declare function midiText(smf: Smf, file?: string): string;
/**
 * A MIDI file's text as the file: what each line says, and a diagnostic for each line that says nothing it can read
 * (an error: the line is left out; the rest is read).
 */
export declare function parseMidiText(text: string): {
    smf: Smf;
    diagnostics: Diagnostic[];
};
