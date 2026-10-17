const STEPS_PER_MINUTE = 84;
export const BAR = 12;
const BARS_PER_KEY = 70;
export const KEY = BAR * BARS_PER_KEY;
export const BLOCK = KEY * 12;
export const DAY = BLOCK * 12;
export const SECONDS_PER_STEP = 60 / STEPS_PER_MINUTE;
export const START = 11 * 3600 + 55 * 60;
export const MODE_NAMES = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];
const STEPS = [2, 2, 1, 2, 2, 2, 1];
export const DAY_MODES = [0, 4, 1, 5, 2, 6, 2, 5, 1, 4, 0, 3];
export const BLOCK_NAMES = [
    'the false zenith',
    'the first shadow',
    'twilight',
    'evening',
    'late night',
    'the nadir',
    'the spark',
    'deep morning',
    'dawn',
    'morning',
    'mid-morning',
    'the earned zenith',
];
const mod = (a, n) => ((a % n) + n) % n;
const MODE_BRIGHTNESS = [5, 3, 1, 6, 4, 2, 0].map((b) => b / 6);
export function dayLaw() {
    return {
        start: START,
        blockSeconds: BLOCK * SECONDS_PER_STEP,
        keySeconds: KEY * SECONDS_PER_STEP,
        modeNames: [...MODE_NAMES],
        blockNames: [...BLOCK_NAMES],
        blocks: DAY_MODES.map((mode) => ({ mode, brightness: MODE_BRIGHTNESS[mode] })),
        tonics: DAY_MODES.map((_, block) => Array.from({ length: 12 }, (__, key) => tonicOf(block, key))),
    };
}
export function modeSemis(mode) {
    const s = [0];
    for (let i = 0; i < 6; i++)
        s.push(s[i] + STEPS[(i + mode) % 7]);
    return s;
}
export function place(step) {
    const d = mod(Math.floor(step), DAY);
    const block = Math.floor(d / BLOCK);
    const key = Math.floor((d % BLOCK) / KEY);
    const bar = Math.floor((d % KEY) / BAR);
    return { block, key, bar, inBar: d % BAR, mode: DAY_MODES[block], tonic: tonicOf(block, key) };
}
export function tonicOf(block, key) {
    return mod((block < 6 ? 7 : 5) * key, 12);
}
export function rowOf(block, key) {
    const base = [0, 4, 1, 5, 2, 6, 3];
    const mode = DAY_MODES[block];
    return base.map((_, i) => mod(base[(i + key) % 7] + mode, 7));
}
function bellOf(mode) {
    return modeSemis(mode);
}
function stated(row, mode, bar) {
    const phrase = Math.floor(bar / 7);
    const r = bar % 7;
    const R = row.map((_, i) => row[(i + r) % 7]);
    let bell = bellOf(mode);
    if (phrase === 1)
        bell = bell.map((_, j) => mod(bell[(j + r) % 7] - bell[r], 12)).sort((a, b) => a - b);
    const onsets = [];
    for (let j = 0; j < 7; j++) {
        let degree = R[j];
        let density = R[(j + 2) % 7] + 1;
        let dynamic = R[(j + 4) % 7];
        let space = R[(j + 6) % 7];
        if (phrase === 0)
            degree = mod(degree + r + 1, 7);
        if (phrase === 2)
            density = 8 - density;
        if (phrase === 3)
            dynamic = R[(6 - j + 4) % 7];
        if (phrase === 4)
            space = mod(space * 5, 7);
        const at = bell[j];
        const next = j < 6 ? bell[j + 1] : BAR;
        onsets.push({ at, dur: next - at, degree, density, dynamic, space });
    }
    return onsets;
}
export function barOf(block, key, bar) {
    const row = rowOf(block, key);
    const mode = DAY_MODES[block];
    if (bar < 35)
        return stated(row, mode, bar);
    const src = stated(row, mode, 69 - bar);
    return src.map((o) => ({ ...o, at: BAR - (o.at + o.dur), degree: mod(-o.degree, 7) })).sort((a, b) => a.at - b.at);
}
export function notesBetween(from, to) {
    const out = [];
    const firstBar = Math.floor(from / BAR);
    for (let b = firstBar; b * BAR < to; b++) {
        const s0 = b * BAR;
        const p = place(s0);
        const semis = modeSemis(p.mode);
        for (const o of barOf(p.block, p.key, p.bar)) {
            const step = s0 + o.at;
            if (step < from || step >= to)
                continue;
            for (let v = 0; v < o.density; v++) {
                const d = o.degree + 2 * v;
                out.push({
                    step,
                    dur: o.dur,
                    semis: p.tonic + semis[mod(d, 7)] + 12 * Math.floor(d / 7),
                    level: 0.18 + o.dynamic * 0.11,
                    pan: o.space / 3 - 1,
                });
            }
        }
    }
    return out;
}
