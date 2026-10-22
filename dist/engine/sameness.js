import { compileSource } from "./compile.js";
import { codeShifts } from "./program.js";
import { eventsBetween, plan } from "./realize.js";
import { flatten } from "./flatten.js";
import { pieceTime } from "./duration.js";
export function sameNotes(a, b, names, options = {}) {
    try {
        const ra = compileSource(a, undefined, options);
        const rb = compileSource(b, undefined, options);
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
const whole = (e, voice) => `${voice} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)} ${e.gains.map((g) => g.toFixed(5)).join(',')} ${JSON.stringify([e.bends, e.levels, e.params ?? null, e.env ?? null])}`;
const note = (e, voice) => `${voice} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)}`;
function sameEvents(a, b, until, key, options = {}) {
    try {
        const ra = compileSource(a, undefined, options);
        const rb = compileSource(b, undefined, options);
        if (!ra.ok || !rb.ok)
            return false;
        const to = typeof until === 'number' ? until : until(ra, rb);
        const play = (r) => {
            const events = eventsBetween(plan(r, codeShifts(r)), 0, to);
            const heard = new Set(events.map((e) => e.voice));
            const place = new Map([...r.cells.keys()].filter((name) => heard.has(name)).map((name, i) => [name, `#${i}`]));
            return events
                .map((e) => key(e, place.get(e.voice) ?? e.voice))
                .sort()
                .join('\n');
        };
        return play(ra) === play(rb);
    }
    catch {
        return false;
    }
}
export function samePiece(a, b, until = SAMENESS_SECONDS) {
    return sameEvents(a, b, until, whole);
}
export const WHOLE_PIECE_LIMIT = 1200;
export function wholeWindow(a, b) {
    const end = (r) => pieceTime(r).ends ?? SAMENESS_SECONDS;
    return Math.min(WHOLE_PIECE_LIMIT, Math.max(end(a), end(b)));
}
export function soundsIdentical(a, b, until, options) {
    return sameEvents(a, b, until ?? wholeWindow, whole, options);
}
export function playsSameNotes(a, b, until, options) {
    return sameEvents(a, b, until ?? wholeWindow, note, options);
}
