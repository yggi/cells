import { compileSource } from "./compile.js";
import { codeShifts } from "./program.js";
import { eventsBetween, plan } from "./realize.js";
import { flatten } from "./flatten.js";
export function sameNotes(a, b, names) {
    try {
        const ra = compileSource(a);
        const rb = compileSource(b);
        if (!rb.ok)
            return false;
        const notes = (r, n) => flatten(r, n, codeShifts(r))
            .map((e) => `${e.step.toFixed(6)}:${e.duration.toFixed(6)}:${e.value + e.alter + (e.transpose ?? 0)}:${e.table}`)
            .join(' ');
        return names.every((n) => notes(ra, n) === notes(rb, n));
    }
    catch {
        return false;
    }
}
export const SAMENESS_SECONDS = 60;
export function samePiece(a, b, until = SAMENESS_SECONDS) {
    try {
        const play = (src) => {
            const r = compileSource(src);
            if (!r.ok)
                return null;
            return eventsBetween(plan(r, codeShifts(r)), 0, until)
                .map((e) => `${e.voice} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)} ${e.gains.map((g) => g.toFixed(5)).join(',')} ${JSON.stringify([e.bends, e.levels, e.params ?? null, e.env ?? null])}`)
                .sort()
                .join('\n');
        };
        const x = play(a);
        return x !== null && x === play(b);
    }
    catch {
        return false;
    }
}
