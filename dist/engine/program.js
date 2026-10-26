import { pickLabel } from "./ast.js";
export const ROOT = 'fifths12TET';
export const MAIN_KEY = 'key:main';
export const MAX_EVENTS = 50_000;
export const MAX_NOTES_PER_SECOND = 2_000;
export const MAX_SPLICE_DEPTH = 256;
export const LABEL_FIELDS = ['name', 'notes', 'tonic', 'mode', 'steps', 'tempo', 'shift'];
export const DEFAULT_FREQ = 261.63;
export const BODIES = {
    fork: [
        [1, 1, 1],
        [6.27, 0.03, 0.35],
    ],
    bell: [
        [0.5, 1, 0.5],
        [1, 0.8, 1],
        [1.2, 0.6, 0.7],
        [1.5, 0.5, 0.45],
        [2, 0.45, 0.6],
        [2.5, 0.3, 0.35],
        [2.67, 0.28, 0.3],
        [3, 0.22, 0.25],
    ],
    bar: [
        [1, 1, 1],
        [2.756, 0.45, 0.5],
        [5.404, 0.22, 0.3],
        [8.933, 0.12, 0.18],
    ],
    plate: [
        [1, 1, 0.8],
        [1.58, 0.8, 0.7],
        [2.24, 0.7, 0.6],
        [2.92, 0.55, 0.55],
        [3.15, 0.5, 0.5],
        [3.88, 0.4, 0.4],
        [4.47, 0.35, 0.35],
        [5, 0.3, 0.3],
    ],
    box: [
        [1, 1, 1],
        [1.42, 0.7, 0.6],
        [1.91, 0.5, 0.45],
        [2.53, 0.35, 0.3],
    ],
    tine: [
        [1, 1, 1],
        [5.93, 0.12, 0.35],
        [17.6, 0.03, 0.12],
    ],
    pipe: [1, 3, 5, 7, 9, 11, 13].map((n) => [n, 1 / Math.sqrt(n), 1 / n]),
    wire: Array.from({ length: 12 }, (_, i) => i + 1).map((n) => [n * Math.sqrt(1 + 0.0006 * n * n), 1 / (0.6 + 0.4 * n), 1 / n]),
    spring: [[1, 1, 1]],
};
export function balance(pan) {
    if (typeof pan !== 'number')
        return [1, 1];
    const p = Math.min(1, Math.max(0, pan));
    return [Math.min(1, 2 * (1 - p)), Math.min(1, 2 * p)];
}
export const isMidiCard = (c) => c?.map?.kind === 'midi';
export const ROLES = ['drums', 'bass', 'pad', 'stab', 'lead'];
export function roleOf(name) {
    const bare = name.replace(/\d+$/, '');
    return ROLES.includes(bare) ? bare : null;
}
export const codeShifts = (result) => (name) => result.cells.get(name)?.shift ?? 0;
export const DEFAULT_ENV = { SAMPLE_RATE: 48000, A4: 440 };
const LETTERS = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
export function noteFrequency(name, a4 = 440) {
    const m = /^([A-G])([#b]?)(-?\d+)$/.exec(name);
    if (!m)
        return null;
    const semis = LETTERS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (parseInt(m[3], 10) - 4);
    return a4 * Math.pow(2, semis / 12);
}
export function pickIndices(n, pick) {
    if (!pick)
        return Array.from({ length: n }, (_, i) => i);
    if (pick.kind === 'at') {
        const i = pick.i < 0 ? n + pick.i : pick.i;
        return i >= 0 && i < n ? [i] : null;
    }
    const step = pick.step ?? 1;
    const norm = (x) => (x < 0 ? n + x : x);
    const out = [];
    if (step > 0) {
        const from = pick.from === null ? 0 : Math.max(0, Math.min(n, norm(pick.from)));
        const to = pick.to === null ? n : Math.max(0, Math.min(n, norm(pick.to)));
        for (let i = from; i < to; i += step)
            out.push(i);
    }
    else {
        const from = pick.from === null ? n - 1 : Math.max(-1, Math.min(n - 1, norm(pick.from)));
        const to = pick.to === null ? -1 : Math.max(-1, Math.min(n - 1, norm(pick.to)));
        for (let i = from; i > to; i += step)
            out.push(i);
    }
    return out.length ? out : null;
}
export function pickedUnits(n, pick, shift) {
    const idx = pickIndices(n, pick);
    return !idx || !pick || pick.abs || !n ? idx : idx.map((i) => (((i + shift) % n) + n) % n);
}
export function pickSteps(c, pick) {
    if (!pick)
        return c.steps;
    const idx = pickedUnits(c.units.length, pick, c.shift);
    return idx ? idx.reduce((a, i) => a + c.unitSteps[i], 0) : null;
}
export function pickProblem(name, pick, steps) {
    const at = `&${name}${pickLabel(pick)}`;
    const has = `&${name} has ${steps} step${steps === 1 ? '' : 's'}`;
    if (!pick || pick.kind === 'at')
        return `${at} picks nothing: ${pick && pick.i < 0 ? 'before the start' : 'past the end'}, ${has}`;
    const step = pick.step ?? 1;
    const norm = (x) => (x < 0 ? steps + x : x);
    if (step > 0 && pick.from !== null && norm(pick.from) >= steps)
        return `${at} picks nothing: it starts past the end, ${has}`;
    return `${at} picks nothing: ${step > 0 ? 'it ends before it starts (a slice runs forwards unless its step is negative: [::-1])' : 'it ends after it starts (a negative step runs backwards)'}, ${has}`;
}
export function adsrOf(c) {
    if (c.map?.kind !== 'adsr')
        return null;
    const v = c.units.map((u) => (u.atom.kind === 'note' ? u.atom.value : NaN));
    if (v.length !== 4 || v.some((x) => !(x >= 0)))
        return null;
    return { attack: v[0], decay: v[1], sustain: Math.min(1, v[2]), release: v[3] };
}
export function isPositional(c) {
    return c.root || c.scan !== null;
}
export function keepsTime(result, name) {
    const clock = result.clocks.get(name);
    return !!clock && clock.cell === name && !clock.tap && !!result.cells.get(name)?.meter;
}
