/**
 * A MIDI file as a piece (#307, step 2): its notes written out flat, every one kept, ready to play and for Shorten to
 * fold. Pure: a `Smf` (`midifile.ts`) in, `.cells` source out.
 *
 * - **The grid**: the coarsest step (a quarter note, an eighth, a triplet … down to a 64th) that every start falls on,
 *   within a 96th of a quarter (and an eighth of the step); a file played in, whose starts fall on none, is laid on sixteenths and says how many
 *   notes moved.
 * - **The time**: one meter for the whole piece, `&tempo scan(…) step=free(…bpm) laps=1`, a step each grid step (its
 *   bpm counts them: a scan's beats are its steps, decision 040), each as long as the file's tempo map makes it (a
 *   scan's steps are its weights against their mean), so a tempo change is a change of weight, as BWV 847 writes its
 *   own; laps=1, so the piece ends. Every line taps it by the pulse (`step=pulse`, `step=pulse/2`).
 * - **The lines**: a line a track and channel (a format 0 file's channels apart), named after the track. Notes that start
 *   and end together are a chord; one that overlaps another goes in a line of its own beside it (`&lead2`), so every
 *   note is written. A melodic note is its key in semitones from C4, on a voice at C4; channel 10 is drums, each note
 *   a drum voice by its General MIDI name (`&bd`, `&sd`, `&hh` …), or, on a drum track the app saved, the kit its name
 *   lists (`bd(A1) dundun(C2) shekere`: each member at its pitch, #334). Each line is as long as the piece (a rest at its
 *   end), so nothing comes round again.
 * - **What is not kept**: velocities (each line at one level), bends, programs (every melodic line one voice, a
 *   triangle), controllers.
 */
import { type Smf } from './midifile';
import { type Stage } from './fold';
/** A file as a piece, and what was made of it. */
export interface Imported {
    readonly source: string;
    readonly notes: number;
    /** The braids written (a track's overlapping notes in more than one). */
    readonly lines: number;
    /** Grid steps a quarter note. */
    readonly perQuarter: number;
    /** Notes moved onto the grid (a file played in); drum notes no drum voice is for. */
    readonly moved: number;
    readonly dropped: number;
    /** Folded (engine/fold): what comes back written as cells of its own; else every note written out. */
    readonly folded: boolean;
    /** Folded in degrees of this key (`C minor`), its lines reading through it (#344); null: in semitones. */
    readonly inKey: string | null;
    /**
     * How the fold comes about (asked for: `story`), as frames to replay (fold/story.ts): the lines written out, then a
     * cell at a time to the piece folded, the last frame `source`. Each plays the same notes. What each frame did, `says`.
     */
    readonly story?: readonly StoryStep[];
}
/** A frame of a fold's story: the piece by then, and a line on what came. */
export interface StoryStep {
    readonly source: string;
    readonly says: string;
}
/**
 * A MIDI file as a piece's source: every note it plays, flat; `shorten`, folded (engine/fold) where that plays the same
 * and is shorter. `free`: its tempo a slider (else fixed). `watch`: the fold as it runs, each move the piece as it is
 * by then (a thunk: printed only if wanted), the last the fold taken (`done`; the piece returned is that, or the flat
 * one where the fold doesn't play the same). `credit`: lines said as comments under the card (where the file came from). `pitches`: folded in semitones, in degrees of the piece's key (#344), in sections by key (#346), or each and the shortest taken (`auto`).
 * `split`: a line a track (`tracks`), a line a voice (`voices`: a keyboard part's notes as the voices a fugue is
 * written in, `fold/voices.ts`), or each and the shorter fold taken (`auto`).
 */
export declare function cellsFromMidi(smf: Smf, title: string, { free, shorten, credit, pitches, split, watch, story, }?: {
    free?: boolean;
    shorten?: boolean;
    credit?: readonly string[];
    pitches?: 'auto' | 'semitones' | 'degrees' | 'sections';
    split?: 'auto' | 'tracks' | 'voices';
    watch?: (source: () => string, stage: Stage) => void;
    /** Tell how the fold taken comes about (`Imported.story`). */
    story?: boolean;
}): Imported;
/**
 * A file's melodic notes a track a voice (`fold/voices.ts`), its drums as they were: where the tracks are one instrument
 * (a program) and some track holds more than one voice (a keyboard part's hands). Null where there is nothing to split,
 * or a track is a legato line (its overlaps a glide's, not voices).
 */
export declare function byVoice(smf: Smf): Smf | null;
