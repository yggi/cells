/**
 * MIDI out, the pure part (#205): a played note (`Played`, realize.ts) as MIDI — its note and the cents it is off a
 * key, its velocity, its pitch bends — and which channel each voice of a piece goes to, with a kit's members on
 * channel 10 under General MIDI drum notes picked by their names (a kit read beside a pitch term is transposed, decision
 * 029: its members go out at their pitch, as voices). Sending it, at the right moment and with the
 * note-offs worked out, is the browser's business (`src/midi/out.ts`).
 *
 * Two ways a piece's notes find their channels (decision 019): a piece with MIDI cards (map=midi) says it — each note
 * goes where its cards' entries say (`Played.midi`), on their channels and output slots, and nothing else is sent; a
 * piece with none goes out on the app's outputs, by default every voice heard on the first, on a channel of its own in
 * the order the piece declares them; the MIDI page's matrix puts each on any output and channel, and this browser keeps
 * it (docs/ui/midi.md).
 */
import type { Played } from './realize';
import { type CompileResult } from './program';
/** The bend range most synths start with, in semitones each way; an MPE synth takes 48. */
export declare const DEFAULT_BEND_RANGE = 2;
/** A pitch bend's centre: no bend. */
export declare const BEND_CENTRE = 8192;
/** A frequency as the MIDI note nearest it, tuned from A4 (note 69), and the cents it is above that note (−50 … 50). */
export declare function noteOf(freq: number, a4?: number): {
    note: number;
    cents: number;
};
/** Cents of bend as a 14-bit pitch-bend value (0 … 16383, 8192 the centre) on a synth bending `range` semitones each way. */
export declare function bendValue(cents: number, range?: number): number;
/** A pitch-bend message on a channel (1–16). */
export declare const bendMessage: (channel: number, value: number) => number[];
/**
 * How hard a note is struck, 1 … 127: its level at its start times the louder of its two channels' gains (on a MIDI
 * card, the gain of its product there). Synths
 * mostly turn velocity into amplitude on a square law, so the velocity is the square root of that amplitude.
 */
export declare function velocityOf(e: Pick<Played, 'gains' | 'levels'>, gain?: number): number;
export declare function gmDrumNote(name: string): number | null;
/**
 * Each kit member's drum note: by its name where General MIDI has one (`gmDrumNote`), else the next note from 36
 * that no other member has, up to 127 (a member past that has none, and isn't sent).
 */
export declare function kitNotes(members: readonly string[]): Map<string, number>;
/**
 * Where a piece's notes go: each gate (all its receivers) and each voice it plays directly on a channel of an output, each
 * kit member with a note on the kit's channel of each output it goes to.
 */
export interface ChannelTable {
    /**
     * The gates and the voices played directly, in the order the piece declares them, each on a channel (1–16) of an
     * output (`port`: 1 the first); a voice sent to several outputs, or set by the piece's MIDI cards on several channels,
     * has an entry for each.
     */
    readonly voices: readonly {
        readonly voice: string;
        readonly channel: number;
        readonly port: number;
    }[];
    /** The kits' members, in the order the piece declares them, each with its General MIDI drum note. */
    readonly kit: readonly {
        readonly member: string;
        readonly note: number;
    }[];
    /** The outputs the kits' members go to, each on a channel (10, General MIDI's, on the first unless chosen). */
    readonly kits: readonly {
        readonly port: number;
        readonly channel: number;
    }[];
    /** Set by the piece: its MIDI cards say where each note goes (the channels above can't be chosen by hand). */
    readonly byPiece?: true;
    /** The output slots its MIDI cards name, in order (none: the first output alone). */
    readonly ports?: readonly number[];
}
/**
 * What a person chose on one output (the MIDI page's matrix): a channel for some gates and voices, and for the kit; 0
 * is not sent there. Left out: on the first output, the channel in order (the kit on 10); on any other, not sent.
 */
export interface OutputChoice {
    readonly voices?: Readonly<Record<string, number>>;
    readonly kit?: number;
}
/** The melodic channels in the order voices take them: 1, 2, 3 … skipping the kit's (10), round again past 16. */
export declare const melodicChannel: (i: number, kit?: number) => number;
/**
 * The gates and voices of a piece without MIDI cards that can be routed, in the order it declares them (a gate's
 * receivers go out on its channel, as one part: a doubling is the synth's to layer), and its kits' members. A send (a
 * voice played only into a resonator or a tape) is not heard from itself and is left out.
 */
export declare function routable(result: CompileResult): {
    voices: string[];
    members: string[];
};
/**
 * The rows of the routing a voice played directly goes out as (its gates, or itself; on a piece's MIDI cards, itself
 * where a card names it): where a key played on it live is echoed (thru). None: it isn't sent.
 */
export declare function rowsOf(result: CompileResult, voice: string): string[];
/**
 * The channel table of a piece: on each output (`outputs`, the MIDI page's matrix; none chosen: one), each gate and
 * voice on the channel chosen there. Not chosen: on the first output they are numbered 1, 2, 3 … in the order the piece
 * declares them, skipping the kit's channel (10, or the one chosen), which its kits' members share; on the others,
 * nothing is sent until chosen.
 */
export declare function channelTable(result: CompileResult, outputs?: readonly OutputChoice[]): ChannelTable;
/**
 * Where one note goes: a channel (1–16), and for a kit's member its drum note; on a MIDI card, its output slot and the
 * gain of its product there (velocity reads it instead of the sound card's gains). Null: it isn't sent.
 */
export type Route = {
    readonly channel: number;
    readonly drum: number | null;
    readonly port?: number;
    readonly gain?: number;
} | null;
/** Where a note goes: one place, none (null), or, on MIDI cards, every entry it is on. */
export type Routes = Route | readonly NonNullable<Route>[];
/** Where a note goes, as a list: every place, none for a note that isn't sent. */
export declare const routesOf: (r: Routes) => readonly NonNullable<Route>[];
/**
 * A piece's routing: where each played note goes, from its channel table: every output and channel it is on there.
 * Set by the piece (MIDI cards): each entry the note is on (`Played.midi`, those switched on), a kit's member as its
 * drum note, and nothing for a note on none.
 */
export declare function router(result: CompileResult, table: ChannelTable): (e: Played) => Routes;
/** One note as MIDI: what to strike, when, how hard, and the bends over it (14-bit values at moments). */
export interface MidiNote {
    readonly channel: number;
    readonly note: number;
    readonly velocity: number;
    readonly at: number;
    readonly end: number;
    /** The bend it starts on (the cents its frequency is off its key): the centre for a note on a key. */
    readonly bend: number;
    /** Bends while it sounds (its `bends`, ramps sampled every BEND_STEP), each a change from the one before. */
    readonly bends: readonly {
        readonly at: number;
        readonly value: number;
    }[];
}
/**
 * A played note as the notes MIDI sends: itself, or a glide's run (`Played.legato`, #334) as the notes it is made of,
 * each held into the next by the slide (at most the next one's length; into one on the same key, up to it): the
 * overlap a synth glides on (legato), and Convert to cells reads back as `glide=`.
 */
export declare function legatoNotes(e: Played): Played[];
/**
 * A played note as MIDI, on the route given: its key and the bend for the cents it is off it, then its bends as
 * bend messages (a ramp glides there from the point before, sampled). A drum is its drum note, unbent. Null for a
 * note no MIDI key can play (below note 0 or above 127, or no frequency).
 */
export declare function midiNote(e: Played, route: NonNullable<Route>, bendRange?: number, a4?: number): MidiNote | null;
/**
 * MPE-style channels for microtonal pieces: a note takes, from `channels`, one that nothing still sounds on (the one
 * free longest), so notes with different bends never share a channel; when all are busy, the one that frees first.
 */
export declare class Rotation {
    #private;
    readonly channels: readonly number[];
    constructor(channels: readonly number[]);
    take(end: number): number;
    forget(): void;
}
/** The channels a rotation runs over: `from` … `to` (1–16), without the kit's (10 unless chosen) where the piece has a kit. */
export declare function rotationChannels(from: number, to: number, kit: boolean, kitChannel?: number): number[];
