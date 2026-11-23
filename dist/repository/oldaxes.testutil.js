import { moodOf } from "../engine/style.js";
export const OLD_AXES = ['sync', 'harm', 'artic', 'energy'];
export const OLD_MODES = [
    { mode: 'aeolian', point: { sync: 0.3, harm: 0.45, artic: 0.55, energy: 0.55 } },
    { mode: 'aeolian', point: { sync: 0.12, harm: 0, artic: 1, energy: 0.8 } },
    { mode: 'aeolian', point: { sync: 0.5, harm: 0.75, artic: 0.35, energy: 0.5 } },
    { mode: 'dorian', point: { sync: 0.35, harm: 0.55, artic: 0.65, energy: 0.65 } },
    { mode: 'dorian', point: { sync: 1, harm: 0.12, artic: 0.85, energy: 0.75 } },
    { mode: 'ionian', point: { sync: 0.05, harm: 0.3, artic: 0, energy: 0.2 } },
    { mode: 'ionian', point: { sync: 0.75, harm: 0.85, artic: 0.45, energy: 0.45 } },
    { mode: 'ionian', point: { sync: 0.35, harm: 1, artic: 0.3, energy: 0.6 } },
    { mode: 'ionian', point: { sync: 0.1, harm: 0.12, artic: 0.5, energy: 0.35 } },
    { mode: 'mixolydian', point: { sync: 0.875, harm: 0.485, artic: 0.65, energy: 0.6 } },
    { mode: 'phrygian', point: { sync: 0.6, harm: 0.6, artic: 0.7, energy: 0.85 } },
    { mode: 'lydian', point: { sync: 0.15, harm: 0.6, artic: 0.15, energy: 0.3 } },
    { mode: 'locrian', point: { sync: 0.9, harm: 1, artic: 0.6, energy: 0.9 } },
    { mode: 'ionian', point: { sync: 0.383, harm: 0.717, artic: 0.25, energy: 0.417 } },
    { mode: 'harmonic_minor', point: { sync: 0.55, harm: 0.75, artic: 0.6, energy: 0.75 } },
    { mode: 'harmonic_minor', point: { sync: 0.2, harm: 0.9, artic: 0.3, energy: 0.35 } },
];
const d2 = (p, q) => OLD_AXES.reduce((a, k) => a + (p[k] - q[k]) ** 2, 0);
export function oldMode(p) {
    return OLD_MODES.reduce((best, m) => (d2(p, m.point) < d2(p, best.point) ? m : best)).mode;
}
export const OLD_STYLES = [
    { id: 'synthPop', mood: 0.5, point: { sync: 0.3, harm: 0.45, artic: 0.55, energy: 0.55 } },
    { id: 'techno', mood: 0.4, point: { sync: 0.12, harm: 0, artic: 1, energy: 0.8 } },
    { id: 'deepHouse', mood: 0.65, point: { sync: 0.35, harm: 0.55, artic: 0.65, energy: 0.65 } },
    { id: 'ambient', mood: 0.9, point: { sync: 0.05, harm: 0.3, artic: 0, energy: 0.2 } },
    { id: 'lofi', mood: 0.5, point: { sync: 0.5, harm: 0.75, artic: 0.35, energy: 0.5 } },
    { id: 'funk', mood: 0.65, point: { sync: 1, harm: 0.12, artic: 0.85, energy: 0.75 } },
    { id: 'bossaNova', mood: 0.9, point: { sync: 0.75, harm: 0.85, artic: 0.45, energy: 0.45 } },
    { id: 'swingJazz', mood: 0.85, point: { sync: 0.35, harm: 1, artic: 0.3, energy: 0.6 } },
    { id: 'electroSwing', mood: 0.5, point: { sync: 0.55, harm: 0.75, artic: 0.6, energy: 0.75 } },
    { id: 'spooky', mood: 0.3, point: { sync: 0.2, harm: 0.9, artic: 0.3, energy: 0.35 } },
    { id: 'kinderlied', mood: 0.95, point: { sync: 0.1, harm: 0.12, artic: 0.5, energy: 0.35 } },
];
export const NEAR_STYLE = 0.15;
export function oldMood(p) {
    const near = OLD_STYLES.reduce((best, s) => (d2(p, s.point) < d2(p, best.point) ? s : best));
    return Math.sqrt(d2(p, near.point) / OLD_AXES.length) <= NEAR_STYLE + 1e-9 ? near.mood : moodOf(oldMode(p));
}
export function newPoint(p, mood = true) {
    return { sync: p.sync, harm: p.harm, bite: p.artic, ...(mood ? { mood: oldMood(p) } : {}) };
}
