import { compileSource } from "./compile.js";
import { codeShifts } from "./program.js";
import { eventsBetween, plan } from "./realize.js";
import { flatten } from "./flatten.js";
import { pieceTime } from "./duration.js";
import { CELL_PARAMS } from "./attributes.js";
import { channelTable, midiNote, router, routesOf } from "./midi.js";
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
const IN_EVENTS = new Set(['gain', 'pan', 'legato']);
function soundOf(r) {
    const shifts = codeShifts(r);
    const memo = new Map();
    const of = (name, seen) => {
        const known = memo.get(name);
        if (known !== undefined)
            return known;
        const c = r.cells.get(name);
        if (!c || seen.has(name))
            return c ? '(loop)' : name;
        const inner = new Set([...seen, name]);
        const ref = (n) => (n ? of(n, inner) : null);
        const params = Object.entries(c.params)
            .filter(([k]) => !IN_EVENTS.has(k))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, typeof v === 'string' && CELL_PARAMS.has(k) ? ref(v) : v]);
        const moving = Object.entries(c.paramCells)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, m]) => [k, m.range, m.factors.map((f) => ref(f))]);
        const steps = flatten(r, name, shifts).map((e) => `${e.step.toFixed(6)}:${e.duration.toFixed(6)}:${e.value + e.alter + (e.transpose ?? 0)}`);
        const out = JSON.stringify([
            c.map?.kind === 'table' ? ref(c.map.table) : c.map,
            c.freq,
            c.loops,
            c.steps,
            c.glide,
            c.oneshot,
            c.kit,
            ref(c.env),
            ref(c.pitch),
            c.exciters ?? null,
            params,
            moving,
            steps,
        ]);
        if (!seen.size)
            memo.set(name, out);
        return out;
    };
    return (voice) => of(voice, new Set());
}
function sameEvents(a, b, until, key, options = {}) {
    try {
        const ra = compileSource(a, undefined, options);
        const rb = compileSource(b, undefined, options);
        if (!ra.ok || !rb.ok)
            return false;
        const to = typeof until === 'number' ? until : until(ra, rb);
        const play = (r) => {
            const events = eventsBetween(plan(r, codeShifts(r)), 0, to, true);
            const sound = soundOf(r);
            const route = router(r, channelTable(r));
            const sent = (e) => routesOf(e.midi ? route(e) : null)
                .map((x) => midiNote(e, x))
                .map((m) => (m ? `${m.channel}:${m.note}` : '-'))
                .join(',');
            return events
                .map((e) => key(e, `${sound(e.voice)} ${sent(e)}`))
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
