/**
 * Standard MIDI Files (#307), the pure part: a file's bytes into its notes, tempos and meters by track, and back. Format
 * 0 and 1 are read (2, independent sequences, as if 1); format 1 is written, a conductor track (tempos, meters, the
 * piece's name) first. What is read: notes (note-on with velocity 0 ends one, as note-off does; a key struck again
 * before it is let go ends the earlier strike), pitch bends, program changes, tempos, time signatures, track names, the
 * copyright notice. Everything else (controllers, sysex, other metas) is skipped; format 1's conductor track (only
 * tempos, meters, a name, a copyright) is the file's header, not a track. Text is written as UTF-8 and read as UTF-8
 * where it is that, else as Latin-1 (an older file's). Times are ticks; `secondsAt` lays them through the tempo map.
 */
/** A note: on a channel (1–16), a key (0–127) struck at a velocity (1–127), from one tick to another. */
export interface SmfNote {
    readonly channel: number;
    readonly key: number;
    readonly velocity: number;
    readonly tick: number;
    readonly end: number;
}
/** A track: its name, its notes by when they start, and its channels' bends (14-bit, 8192 the centre) and programs. */
export interface SmfTrack {
    readonly name?: string;
    readonly notes: readonly SmfNote[];
    readonly bends: readonly {
        readonly tick: number;
        readonly channel: number;
        readonly value: number;
    }[];
    readonly programs: readonly {
        readonly tick: number;
        readonly channel: number;
        readonly program: number;
    }[];
}
/**
 * A MIDI file: ticks a quarter note (`ppq`), its tracks, and the tempo map (microseconds a quarter from each tick on;
 * 500 000, 120 bpm, until the first) and time signatures, from whichever track they are in.
 */
export interface Smf {
    readonly format: number;
    readonly ppq: number;
    readonly name?: string;
    /** Its copyright notice (the copyright meta event): who made it and on what terms. */
    readonly copyright?: string;
    readonly tracks: readonly SmfTrack[];
    readonly tempos: readonly {
        readonly tick: number;
        readonly micros: number;
    }[];
    readonly meters: readonly {
        readonly tick: number;
        readonly num: number;
        readonly den: number;
    }[];
}
/** Why a file can't be read. */
export declare class SmfError extends Error {
}
/** Do these bytes start as a MIDI file does (MThd)? */
export declare const isMidi: (bytes: Uint8Array) => boolean;
/** A file's bytes as a Smf. Throws SmfError when they aren't a MIDI file (or end too soon). */
export declare function readMidi(bytes: Uint8Array): Smf;
/** A Smf as the bytes of a format 1 file: a conductor track (the name, the copyright, tempos, meters), then each track. */
export declare function writeMidi(smf: Smf): Uint8Array;
/** When a tick falls, in seconds from the start: laid through the tempo map. */
export declare function secondsAt(smf: Pick<Smf, 'ppq' | 'tempos'>, tick: number): number;
