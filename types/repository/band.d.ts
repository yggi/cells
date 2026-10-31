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
/** The centre of style space as a point (the language's, `CENTRE` in `engine/style.ts`), where a score that names no style is played. */
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
 * A found instrument is voiced for its own point (#350, #366): it reads no `&style`, so where one plays, the style moves
 * no cutoff of that voice; the default instruments it stands in for read it (`lpf=450..900 * &style[artic]`). The point
 * is the score's style where it starts (`scoreStyle`): a section that glides from one style to another plays the
 * instruments found at its first end throughout.
 */
export declare function bandAt(point: StylePoint, band?: string, fragments?: readonly Fragment[]): string;
/**
 * The style a score starts on: where its `&style` note's `style=` starts (a range's first end), as a point on the axes;
 * null where the score names no style. A style it takes from elsewhere (`&funk from styles`, `&style style=&funk`) is
 * read through its expansion by `resolve` (the seed library by default), its band left out: a band reads the style, it
 * never sets it.
 */
export declare function scoreStyle(score: string, resolve?: Resolve): StylePoint | null;
/**
 * A resolver that answers `band` with the default band at the score's style (`bandAt` at `scoreStyle`, the centre where
 * it names none), and every other id as `resolve` does (the seed library by default, or a client's own library): what
 * a client hands the compile of a score that ends in `* from band`. A client with a band of its own answers `band`
 * with that instead, its own lines its choice of instruments.
 */
export declare function resolveBand(score: string, resolve?: Resolve): Resolve;
