import type { Resolve } from '../engine/program';
import { type Fragment, type StylePoint } from './fragments';
/** The voice each pitched performer plays (the seed performers, decision 058), and the instrument it takes it from. */
export declare const PERFORMER_VOICES: {
    readonly bass: {
        readonly voice: "bassV";
        readonly own: "bass";
    };
    readonly pad: {
        readonly voice: "padV";
        readonly own: "pad";
    };
    readonly stab: {
        readonly voice: "keysV";
        readonly own: "keys";
    };
    readonly lead: {
        readonly voice: "leadV";
        readonly own: "lead";
    };
};
/** A pitched performer: one of `PERFORMER_VOICES`. */
export type VoicedPart = keyof typeof PERFORMER_VOICES;
/** An instrument a performer plays in place of its own: the fragment's id and the line that defines the voice. */
export interface FoundInstrument {
    readonly id: string;
    readonly line: string;
}
/** The centre of style space: every axis at its middle, where a score that names no style is played. */
export declare const CENTRE: StylePoint;
/**
 * The instrument each pitched performer plays at a style's point, where it isn't the performer's own: the first that
 * defines the performer's voice in the ranking on the facet `instrument`. A performer whose own instrument ranks first
 * is left out, and plays as the band writes it.
 */
export declare function instrumentsAt(point: StylePoint, fragments?: readonly Fragment[]): Partial<Record<VoicedPart, FoundInstrument>>;
/**
 * A band's text at a style's point: each pitched voice the found instrument's line (`instrumentsAt`), in place of the
 * band's own line for it, or after the band's lines where it writes none; the band as it is where nothing is found.
 */
export declare function bandAt(point: StylePoint, band?: string, fragments?: readonly Fragment[]): string;
/**
 * The style a score starts on: where its `&style` note's `style=` starts (a range's first end), as a point on the axes;
 * null where the score names no style, or names one by a cell it takes from elsewhere (`&funk from styles`), which
 * only its compile reads.
 */
export declare function scoreStyle(score: string): StylePoint | null;
/**
 * A resolver that answers `band` with the default band at the score's style (`bandAt` at `scoreStyle`, the centre where
 * it names none), and every other id as `resolve` does (the seed library by default, or a client's own library): what
 * a client hands the compile of a score that ends in `* from band`. A client with a band of its own answers `band`
 * with that instead, its own lines its choice of instruments.
 */
export declare function resolveBand(score: string, resolve?: Resolve): Resolve;
