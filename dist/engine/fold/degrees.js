import { SCALES } from "../../theory/modes.js";
const NAMES = ['major', 'minor', 'harmonic'];
const TONICS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const keyOf = (name, tonic) => {
    const positions = [0];
    for (const step of SCALES[name].steps.slice(0, -1))
        positions.push(positions[positions.length - 1] + step);
    return { name, tonic, positions };
};
export const scaleText = (k) => `scale(${k.name}, ${TONICS[k.tonic]})`;
export const keyName = (k) => `${TONICS[k.tonic]} ${k.name === 'harmonic' || k.name === 'melodic' ? `${k.name} minor` : k.name}`;
export function pitchOf(k, degree) {
    const n = k.positions.length;
    const octave = Math.floor(degree / n);
    return k.tonic + k.positions[degree - octave * n] + 12 * octave;
}
export function degreeOf(k, pitch) {
    const n = k.positions.length;
    const octave = Math.floor((pitch - k.tonic) / 12);
    const within = pitch - k.tonic - 12 * octave;
    let i = 0;
    while (i + 1 < n && k.positions[i + 1] <= within)
        i++;
    const below = octave * n + i;
    const up = pitch - pitchOf(k, below);
    if (up === 0)
        return { degree: below, alter: 0 };
    const down = pitch - pitchOf(k, below + 1);
    return -down < up ? { degree: below + 1, alter: down } : { degree: below, alter: up };
}
export const degreeText = ({ degree, alter }) => `${degree}${alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter)}`;
export function bestKey(lines) {
    const pitches = lines.flatMap((l) => l.chords.flatMap((c) => c.values.map(Number).filter((v) => Number.isInteger(v))));
    if (!pitches.length)
        return null;
    const chords = lines.flatMap((l) => l.chords.filter((c) => c.values.some((v) => Number.isInteger(Number(v)))));
    const end = Math.max(...chords.map((c) => c.at + c.dur));
    const lastBass = Math.min(...chords.filter((c) => c.at + c.dur === end).flatMap((c) => c.values.map(Number).filter((v) => Number.isInteger(v))));
    const home = ((lastBass % 12) + 12) % 12;
    let best = null;
    for (const name of NAMES) {
        for (let tonic = 0; tonic < 12; tonic++) {
            const key = keyOf(name, tonic);
            const cost = pitches.reduce((a, p) => a + Math.abs(degreeOf(key, p).alter), 0);
            const better = !best || cost < best.cost || (cost === best.cost && tonic === home && best.key.tonic !== home);
            if (better)
                best = { key, cost };
        }
    }
    return best.key;
}
export function inDegrees(lines, k) {
    return lines.map((l) => ({
        ...l,
        chords: l.chords.map((c) => ({ ...c, values: c.values.map((v) => (Number.isInteger(Number(v)) ? degreeText(degreeOf(k, Number(v))) : v)) })),
    }));
}
