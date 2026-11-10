import { SCALES } from "../../theory/modes.js";
import { moodOf } from "../style.js";
export const MODES = ['ionian', 'aeolian', 'dorian', 'mixolydian', 'harmonic_minor', 'lydian', 'phrygian', 'locrian'];
const tonesOf = (mode) => new Set(SCALES[mode === 'harmonic_minor' ? 'harmonic' : mode].steps.slice(0, -1).reduce((at, s) => [...at, at.at(-1) + s], [0]));
const TONES = new Map(MODES.map((m) => [m, tonesOf(m)]));
const pc = (note) => ((note % 12) + 12) % 12;
export function readMood(notes) {
    const weight = Array(12).fill(0);
    const bass = Array(12).fill(0);
    for (const n of notes) {
        if (n.note === undefined || n.part === 'drums' || n.length <= 0)
            continue;
        weight[pc(n.note)] += n.length;
        if (n.part === 'bass')
            bass[pc(n.note)] += n.length;
    }
    const total = weight.reduce((a, b) => a + b, 0);
    if (total === 0)
        return undefined;
    const heard = weight.filter((w) => w > 0).length;
    let best = null;
    for (const mode of MODES)
        for (let tonic = 0; tonic < 12; tonic++) {
            const covered = weight.reduce((sum, w, p) => sum + (TONES.get(mode).has(pc(p - tonic)) ? w : 0), 0);
            const tonicWeight = weight[tonic] + 2 * bass[tonic];
            if (!best || covered > best.covered + 1e-9 || (Math.abs(covered - best.covered) <= 1e-9 && tonicWeight > best.tonicWeight + 1e-9))
                best = { mode, tonic, covered, tonicWeight };
        }
    const { mode, tonic, covered } = best;
    return { mood: moodOf(mode), mode, tonic, confidence: (covered / total) * Math.min(1, heard / 7) };
}
