import { beatCount } from "../meter.js";
export const STEPS_PER_EIGHTH = 2;
export const BAR_4_4 = { steps: 16, pulses: [0, 4, 8, 12] };
export function barOf(meter) {
    const perPulse = 16 / meter.unit;
    if (meter.written !== 'meter' || !Number.isInteger(perPulse) || perPulse < 1)
        return null;
    const beats = meter.beats.length ? meter.beats : Array.from({ length: beatCount(meter) }, () => 1);
    const pulses = [];
    let at = 0;
    for (const b of beats) {
        pulses.push(at * perPulse);
        at += b;
    }
    return { steps: meter.pulses * perPulse, pulses };
}
const LINES = ['bass', 'lead'];
const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
export function soundingShares(line, steps) {
    const starts = [...new Set(line.map((n) => n.step))].sort((a, b) => a - b);
    return starts.map((step, i) => {
        const gap = (starts[i + 1] ?? steps) - step;
        const length = Math.max(...line.filter((n) => n.step === step).map((n) => n.length));
        return Math.min(length, gap) / gap;
    });
}
export const onsetsOf = (notes) => [...new Set(notes.map((n) => `${n.part}:${n.step}`))].map((id) => Number(id.split(':')[1]));
export const lineShares = (notes, steps) => LINES.flatMap((part) => soundingShares(notes.filter((n) => n.part === part), steps));
export function readStyle(notes, bar = BAR_4_4) {
    const onsets = onsetsOf(notes);
    const shares = lineShares(notes, bar.steps);
    return {
        density: onsets.length / bar.steps,
        ...(onsets.length ? { sync: onsets.filter((step) => !bar.pulses.includes(step) && step % STEPS_PER_EIGHTH !== 0).length / onsets.length } : {}),
        ...(shares.length ? { bite: 1 - median(shares) } : {}),
    };
}
export function readTiming(laid) {
    return laid.length ? { bpm: 15 / (laid.reduce((sum, s) => sum + s.length, 0) / laid.length) } : {};
}
