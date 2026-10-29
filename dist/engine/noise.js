import { chanceOf } from "./realize.js";
function seeded(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function grainOffset(seed, voice, at, duration) {
    return chanceOf(`${seed}|${voice}|${at.toFixed(6)}|grain`) * duration;
}
export const NOISE_SECONDS = 4;
const made = new Map();
export function noise(colour, sampleRate) {
    const key = `${colour}:${sampleRate}`;
    const cached = made.get(key);
    if (cached)
        return cached;
    const length = Math.floor(sampleRate * NOISE_SECONDS);
    const d = new Float32Array(length);
    const random = seeded(colour === 'white' ? 1 : colour === 'pink' ? 2 : 3);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < length; i++) {
        const w = random() * 2 - 1;
        if (colour === 'white')
            d[i] = w;
        else if (colour === 'pink') {
            b0 = 0.99886 * b0 + w * 0.0555179;
            b1 = 0.99332 * b1 + w * 0.0750759;
            b2 = 0.969 * b2 + w * 0.153852;
            b3 = 0.8665 * b3 + w * 0.3104856;
            b4 = 0.55 * b4 + w * 0.5329522;
            b5 = -0.7616 * b5 - w * 0.016898;
            d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
            b6 = w * 0.115926;
        }
        else {
            last = (last + 0.02 * w) / 1.02;
            d[i] = last * 3.5;
        }
    }
    made.set(key, d);
    return d;
}
