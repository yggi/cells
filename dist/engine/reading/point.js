import { readHarm } from "./chords.js";
import { readMood } from "./mood.js";
import { BAR_4_4, lineShares, onsetsOf, readStyle } from "./style.js";
export const SYNC_FULL = 1;
export const BITE_FULL = 4;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export function readPoint(bars, bar = BAR_4_4) {
    const sync = [];
    const bite = [];
    const harm = [];
    const trust = { sync: [], bite: [], harm: [] };
    const densities = [];
    let previous;
    for (const notes of bars) {
        const read = readStyle(notes, bar);
        densities.push(read.density);
        if (read.sync !== undefined)
            sync.push(read.sync);
        if (read.bite !== undefined)
            bite.push(read.bite);
        trust.sync.push(Math.min(1, onsetsOf(notes).length / (SYNC_FULL * bar.steps)));
        trust.bite.push(Math.min(1, lineShares(notes, bar.steps).length / BITE_FULL));
        const h = readHarm(notes, previous, bar);
        trust.harm.push(h ? h.chords.length / 2 : 0);
        if (h) {
            harm.push(h.harm);
            previous = h.chords.at(-1);
        }
    }
    const mood = readMood(bars.flat());
    const axes = { sync, bite, harm };
    const point = {};
    const confidence = {};
    for (const a of ['sync', 'harm', 'bite'])
        if (axes[a].length) {
            point[a] = mean(axes[a]);
            confidence[a] = mean(trust[a]);
        }
    if (mood) {
        point.mood = mood.mood;
        confidence.mood = mood.confidence;
    }
    return { point, confidence, intensity: mean(densities), ...(mood ? { mode: { mode: mood.mode, tonic: mood.tonic } } : {}) };
}
