export const mod = (n, m) => ((n % m) + m) % m;
export const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const MODES = ['Locrian', 'Phrygian', 'Aeolian', 'Dorian', 'Mixolydian', 'Ionian', 'Lydian'].map((name, phase) => ({
    name,
    intervals: even(7, 12, phase),
}));
const evenSteps = (k, n, phase) => intervals(even(k, n, phase), n);
export const SCALES = {
    major: { steps: evenSteps(7, 12, 5), name: 'Ionian' },
    minor: { steps: evenSteps(7, 12, 2), name: 'Aeolian' },
    ionian: { steps: evenSteps(7, 12, 5), name: 'Ionian' },
    dorian: { steps: evenSteps(7, 12, 3), name: 'Dorian' },
    phrygian: { steps: evenSteps(7, 12, 1), name: 'Phrygian' },
    lydian: { steps: evenSteps(7, 12, 6), name: 'Lydian' },
    mixolydian: { steps: evenSteps(7, 12, 4), name: 'Mixolydian' },
    aeolian: { steps: evenSteps(7, 12, 2), name: 'Aeolian' },
    locrian: { steps: evenSteps(7, 12, 0), name: 'Locrian' },
    harmonic: { steps: [2, 1, 2, 2, 1, 3, 1], name: 'Harmonic minor' },
    melodic: { steps: [2, 1, 2, 2, 2, 2, 1], name: 'Melodic minor' },
    pentatonic: { steps: evenSteps(5, 12, 0), name: 'Pentatonic' },
    minorpentatonic: { steps: evenSteps(5, 12, 3), name: 'Minor pentatonic' },
    blues: { steps: [3, 2, 1, 1, 3, 2], name: 'Blues' },
    wholetone: { steps: evenSteps(6, 12, 0), name: 'Whole tone' },
};
export const MODE_WORDS = {
    locrian: 0,
    phrygian: 1,
    aeolian: 2,
    minor: 2,
    dorian: 3,
    mixolydian: 4,
    ionian: 5,
    major: 5,
    lydian: 6,
};
export const diatonicSteps = (phase) => intervals(even(7, 12, phase), 12);
export function scaleOfPhase(phase) {
    const mode = MODES[phase]?.name.toLowerCase() ?? 'major';
    return mode === 'ionian' ? 'major' : mode === 'aeolian' ? 'minor' : mode;
}
export function modeName(values) {
    const shape = values.map((v) => v - values[0]).join();
    if (values.length === 7) {
        const m = MODES.find((x) => x.intervals.join() === shape);
        if (m)
            return m.name;
    }
    return Object.values(SCALES).find((x) => scan(x.steps).positions.join() === shape)?.name ?? null;
}
export function even(k, n, phase = 0, i) {
    const at = (j) => Math.floor((j * n + phase) / k);
    return i === undefined ? Array.from({ length: k }, (_, j) => at(j)) : [at(i)];
}
const AGOGIC = {
    '4/4': [0, 3.24, 6, 9.12],
    '3/4': [0, 3.36, 7.8],
};
export function agogic(n, d) {
    return [...(AGOGIC[`${n}/${d}`] ?? Array.from({ length: n }, (_, i) => (i * 12) / n))];
}
export function pitchHue(semitones) {
    return mod(Math.round(semitones), 12) * 30;
}
export function midiOf(freq) {
    return 69 + 12 * Math.log2(freq / 440);
}
export function noteName(freq) {
    if (!(freq > 0))
        return '';
    const m = Math.round(midiOf(freq));
    return `${NOTE_NAMES[mod(m, 12)]}${Math.floor(m / 12) - 1}`;
}
export function intervals(positions, lap) {
    return positions.map((p, i) => +((i + 1 < positions.length ? positions[i + 1] : positions[0] + lap) - p).toFixed(6));
}
export function modeBrightness(positions, lap) {
    const sums = positions.map((p) => positions.reduce((sum, q) => sum + mod(q - p, lap), 0));
    const [lo, hi] = [Math.min(...sums), Math.max(...sums)];
    return sums.map((v) => (hi > lo ? (v - lo) / (hi - lo) : 0.5));
}
export function scan(steps) {
    const positions = [];
    let at = 0;
    for (const s of steps) {
        positions.push(+at.toFixed(6));
        at += s;
    }
    return { positions, lap: +at.toFixed(6) };
}
export function pitchOfName(name) {
    const m = /^([A-G])(#|b)?(-?[0-9]+)?$/.exec(name);
    if (!m)
        return null;
    const letter = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
    return letter + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * ((m[3] === undefined ? 4 : parseInt(m[3], 10)) - 4);
}
