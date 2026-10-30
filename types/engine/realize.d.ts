import { type CompileResult, type Output, type Shifts } from './program';
import { type ParamTrack, type Series, type VoiceParam } from './series';
export interface Played {
    /** Absolute start in seconds at the code's rates. */
    readonly at: number;
    /** Its start in the code's seconds when `at` is on another clock (`retime` keeps it): what a note's own chance is keyed on, so a live play and a render agree. */
    readonly code?: number;
    readonly dur: number;
    /** Voice cell that sounds it, and at what frequency (modulation at the start included). */
    readonly voice: string;
    readonly freq: number;
    /** Pitch changes while it sounds, from modulating terms: cents relative to the start (ramp: glide there). */
    readonly bends: readonly {
        readonly at: number;
        readonly cents: number;
        readonly ramp?: boolean;
    }[];
    /** Level per channel [left, right], from the mixes. */
    readonly gains: readonly [number, number];
    /** Volume over the note: its level at the start, then each change (volume streams, a gate). */
    readonly levels: readonly {
        readonly at: number;
        readonly level: number;
        readonly ramp?: boolean;
    }[];
    /** The instrument (a mix used like a voice) it plays through, if any. */
    readonly instrument?: string;
    /** Its voice's moving parameters over the note (lpf=200..3000 * &fenv …). */
    readonly params?: Readonly<Record<string, ParamTrack>>;
    /** The value that started it (a resonator reads it as where it's struck). */
    readonly value?: number;
    /** Its envelope (map=adsr, seconds), or absent for the voice's own. */
    readonly env?: {
        readonly attack: number;
        readonly decay: number;
        readonly sustain: number;
        readonly release: number;
    };
    /** Heard nowhere: its gains are 0 on every card that is on (a sound card's, or a MIDI card's entry: decision 064). The voices leave it out. */
    readonly unheard?: true;
    /** The MIDI cards' entries it goes out on (those switched on): MIDI out sends it there and nowhere else. */
    readonly midi?: Output['midi'];
    /** The output it comes from (`Output.id`), when asked for (`eventsBetween(…, true)`): which mixes' wheels hear it (Cell studio's audio wiring). */
    readonly output?: string;
    /**
     * A drone's note (a voice alone, decision 028): held from where play starts until play stops or the piece ends, so it
     * isn't articulated (no gate shortened under it); `dur` is to the piece's end, to where the asker stops listening, or
     * HELD at most (then it is struck again).
     */
    readonly held?: true;
    /**
     * A glide's run (`glide=`, its voice's): the notes it is made of, each as it would sound alone (its start, length,
     * frequency and its own bends), and the slide's time. The run plays as one note; MIDI out sends its notes, each
     * overlapping the next by the slide (#334: a synth hears a legato run, and Convert to cells reads it back).
     */
    readonly legato?: {
        readonly glide: number;
        readonly notes: readonly RunNote[];
    };
}
/** A note of a glide's run, as it would sound alone (`Played.legato`). */
interface RunNote {
    readonly at: number;
    readonly dur: number;
    readonly freq: number;
    readonly bends: Played['bends'];
}
/** How long a drone's note is held at a time, at most (s): ten minutes, then it is struck again. What moves in it (a vibrato, a level, a moving parameter) is worked out a note at a time, so this bounds that work. */
export declare const HELD = 600;
/** Where a run of windows began and where its listener stops: a drone's note starts at `begins` (0, the piece's start, by default) and is held to `until` at most. */
export interface Held {
    readonly begins?: number;
    readonly until?: number;
}
/** A drone: a voice alone, its own pitch held (its own pitch= and the levels in its product move it). */
interface DroneTrack {
    readonly output: Output;
    readonly mods: readonly Series[];
    readonly levels: readonly Series[];
}
interface PlanTrack extends Series {
    readonly output: Output;
    readonly clock: string;
    readonly mods: readonly Series[];
    /** A kit read held under the term that starts notes: its number picks the member (decision 029). */
    readonly picker?: Series;
    /** Volume streams (map=amp). */
    readonly levels: readonly Series[];
    /** The selectors it plays through, with the entry that picks it (and how many entries they read). */
    readonly selects: readonly {
        readonly series: Series;
        readonly entry: number;
        readonly entries: number;
    }[];
    /** When it stops, in seconds (laps= on a cell that drives it); Infinity if it loops. */
    readonly end: number;
    /**
     * Its line's `legato=` (#94): the share of its written length (its steps) each note sounds, its end then placed by the
     * time map as its onset is (#120), a number (1: as written), or cells read at the note's onset (their product, scaled by
     * a range when one is written).
     */
    readonly share: number | {
        readonly range: readonly [number, number] | null;
        readonly series: readonly Series[];
    };
}
/** The static part of playback (braids flattened); pitches are resolved per moment. */
export interface Plan {
    readonly result: CompileResult;
    readonly statics: Shifts;
    readonly muted: ReadonlySet<string>;
    readonly tracks: readonly PlanTrack[];
    /** Drones (decision 028): voices alone, each one held note; they don't end the piece or give it a length. */
    readonly drones: readonly DroneTrack[];
    readonly played: ReadonlySet<string>;
    /** Each voice's moving parameters: their cells as series (an envelope among them, apart). */
    readonly voiceParams: ReadonlyMap<string, Readonly<Record<string, VoiceParam>>>;
    /** When the piece ends, in seconds: the last track's end — Infinity if anything loops (or nothing plays). */
    readonly end: number;
}
/**
 * When an output stops: laps= on its cell, the chain of cells that step it, its
 * clock, or a selector it plays through — the earliest of those. Infinity: it loops.
 */
export declare function endOf(result: CompileResult, statics: Shifts, o: Output): number;
/** Where a drone stops (decision 028): where the rest of the piece ends (laps=), or never — a drone alone doesn't end it. */
export declare function droneEnd(result: CompileResult, statics: Shifts): number;
/** A number in [0, 1) from a text: the same text, the same number (cyrb53). */
export declare function chanceOf(text: string): number;
/** The entries a selector picks right now. */
export declare function picksNow(result: CompileResult, statics: Shifts, name: string, seconds: number): Set<number>;
export declare const chainMuted: (result: CompileResult, table: string, muted: ReadonlySet<string>) => boolean;
/** An output's level per channel, leaving out mixes (or sound cards) that are switched off. */
export declare function liveGains(o: Output, muted: ReadonlySet<string>): [number, number];
/**
 * An output's level as heard (decision 064): on a sound card, its gains there (`liveGains`); on MIDI cards alone, the
 * loudest of its entries' gains there, in the middle (a MIDI card is heard as well as sent). A send is heard only in what
 * it feeds.
 */
export declare function heardGains(o: Output, muted: ReadonlySet<string>): [number, number];
/** What a read head's return or a resonator ringing alone in a mix reaches the sound card at, with what is switched off. */
export declare function returnGains(x: {
    readonly parts: Output['parts'];
    readonly through: Output['through'];
}, muted: ReadonlySet<string>): [number, number];
/** Is it heard: on, and reaching a card (a sound card, or a MIDI card: decision 064) through what is on (a send: into what it feeds)? */
export declare function outputSounds(result: CompileResult, o: Output, muted: ReadonlySet<string>): boolean;
/** Does it play at all: heard (`outputSounds`), or sent on a MIDI card that is on (`outputSent`)? What the plan plays. */
export declare function outputPlays(result: CompileResult, o: Output, muted: ReadonlySet<string>): boolean;
/** What to play. A program with errors plays nothing: it may name cells it doesn't have. */
export declare function plan(result: CompileResult, statics: Shifts, muted?: ReadonlySet<string>): Plan;
/** Which voice a number plays on, and that voice's base frequency. */
export declare function voiceFor(result: CompileResult, o: Output, value: number): {
    voice: string;
    freq: number;
} | null;
/** The member a kit read held under a melody picks at a moment (decision 029); null: none, or the output has no such read. */
export declare function kitPickAt(p: Plan, o: Output, at: number): string | null;
/**
 * Everything that starts in [from, to). The triggering term's pitch (tables as
 * they stand at that moment) plus every modulating term sets the voice's rate:
 * freq = voice rate × 2^(semitones / 12). A kit read takes its number as an index and adds no pitch (decision 029).
 * `outputs`: each note names the output it comes from (for the audio: which mixes' wheels hear it); left out,
 * a note is only what sounds.
 */
export declare function eventsBetween(p: Plan, from: number, to: number, outputs?: boolean, held?: Held): Played[];
export {};
