import { even, mod } from "../theory/modes.js";
import { resolveIn, semitones } from "./helix.js";
import { codeShifts } from "./program.js";
export const GRADES = '*+-.,';
function pitchClassOf(result, key, degree, shifts) {
    const r = resolveIn(result, key, 0, degree, 0, shifts);
    return mod(Math.round(semitones(result, r.root, r.position)), 12);
}
export function gradesOf(result, key, degree = 0, shifts = codeShifts(result)) {
    const n = result.cells.get(key)?.units.length ?? 0;
    if (n < 3)
        return null;
    const pcs = Array.from({ length: n }, (_, d) => pitchClassOf(result, key, d, shifts));
    const triad = even(3, n).map((i) => pcs[mod(degree + i, n)]);
    const fifths = even(2, 3, 1).map((i) => triad[i]);
    const grades = Array.from({ length: 12 }, () => 4);
    for (const pc of pcs)
        grades[pc] = 3;
    for (const pc of triad)
        grades[pc] = 2;
    for (const pc of fifths)
        grades[pc] = 1;
    grades[fifths[0]] = 0;
    return grades;
}
export function gradeOf(result, key, pitch, degree = 0, shifts) {
    const grades = gradesOf(result, key, degree, shifts);
    return grades ? grades[mod(Math.round(pitch), 12)] : null;
}
export const gradeText = (grades) => grades.map((g) => GRADES[g]).join('');
