import { type Bar, type Part, type Sounding } from './style';
export declare const VOICES: readonly ["drums", "bass", "comp", "lead"];
export type Voice = (typeof VOICES)[number];
/** The voice a part belongs to: the pad and the stab are the comp. */
export declare const voiceOf: (part: Part) => Voice;
/** What one voice's notes say, on the axes it can say. */
export interface VoiceReading {
    /** Its share of the bar's steps with an onset, 0 to 1. */
    readonly density: number;
    readonly sync?: number;
    /** The bass's and the lead's. */
    readonly bite?: number;
    /** The comp's. */
    readonly harm?: number;
}
/** A voice's notes alone, out of a bar's notes (the comp reads with its bass, for the chord's root). */
export declare function readVoice(voice: Voice, notes: readonly Sounding[], bar?: Bar): VoiceReading;
/** Where a voice reads at a style: the axes of a reading, each a number. */
export type VoiceLandmark = Readonly<Record<'density', number>> & Partial<Record<'sync' | 'bite' | 'harm', number>>;
/** The root mean square of the differences over the axes the reading and the landmark both have; 0 over none. */
export declare function partDistance(read: VoiceReading, landmark: VoiceLandmark): number;
