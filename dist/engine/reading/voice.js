import { readHarm } from "./chords.js";
import { BAR_4_4, readStyle } from "./style.js";
export const VOICES = ['drums', 'bass', 'comp', 'lead'];
export const voiceOf = (part) => (part === 'pad' || part === 'stab' ? 'comp' : part);
export function readVoice(voice, notes, bar = BAR_4_4) {
    const own = notes.filter((n) => voiceOf(n.part) === voice);
    const { density, sync, bite } = readStyle(own, bar);
    const harm = voice === 'comp'
        ? readHarm(notes.filter((n) => voiceOf(n.part) === 'comp' || n.part === 'bass'), undefined, bar)?.harm
        : undefined;
    return {
        density,
        ...(sync === undefined ? {} : { sync }),
        ...(bite === undefined || (voice !== 'bass' && voice !== 'lead') ? {} : { bite }),
        ...(harm === undefined ? {} : { harm }),
    };
}
const VOICE_AXES = ['density', 'sync', 'bite', 'harm'];
export function partDistance(read, landmark) {
    const shared = VOICE_AXES.filter((a) => read[a] !== undefined && landmark[a] !== undefined);
    return shared.length ? Math.sqrt(shared.reduce((sum, a) => sum + (read[a] - landmark[a]) ** 2, 0) / shared.length) : 0;
}
