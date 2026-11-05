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
export const HEARD = { cents: 0.5, db: 0.1, seconds: 0.00025, silent: 1e-5 };
const RELATIVE = 2 ** (HEARD.cents / 1200) - 1;
const near = (a, b) => a === b || Math.abs(a - b) <= HEARD.seconds + RELATIVE * Math.max(Math.abs(a), Math.abs(b));
function alike(a, b) {
    if (typeof a === 'number' && typeof b === 'number')
        return near(a, b);
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object')
        return a === b;
    if (Array.isArray(a) !== Array.isArray(b))
        return false;
    const ka = Object.keys(a).filter((k) => a[k] !== undefined);
    const kb = Object.keys(b).filter((k) => b[k] !== undefined);
    return ka.length === kb.length && ka.every((k) => alike(a[k], b[k]));
}
const samePitch = (a, b) => a === b || (a > 0 && b > 0 && Math.abs(1200 * Math.log2(a / b)) <= HEARD.cents);
const sameLevel = (a, b) => Math.abs(a) < HEARD.silent ? Math.abs(b) < HEARD.silent : Math.abs(b) >= HEARD.silent && Math.sign(a) === Math.sign(b) && Math.abs(20 * Math.log10(a / b)) <= HEARD.db;
const NOISES = new Set(['white', 'pink', 'brown']);
const nine = (_, v) => (typeof v === 'number' && Number.isFinite(v) ? +v.toPrecision(9) : v);
const IN_EVENTS = new Set(['gain', 'pan', 'legato']);
function soundOf(r) {
    const shifts = codeShifts(r);
    const memo = new Map();
    const of = (name, seen) => {
        if (memo.has(name))
            return memo.get(name);
        const c = r.cells.get(name);
        if (!c || seen.has(name))
            return c ? '(loop)' : name;
        const inner = new Set([...seen, name]);
        const ref = (n) => (n ? of(n, inner) : null);
        const noise = NOISES.has(String(c.params.s));
        const params = Object.entries(c.params)
            .filter(([k]) => !IN_EVENTS.has(k))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, typeof v === 'string' && CELL_PARAMS.has(k) ? ref(v) : v]);
        const moving = Object.entries(c.paramCells)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, m]) => [k, m.range, m.factors.map((f) => ref(f))]);
        const steps = noise ? [] : flatten(r, name, shifts).map((e) => [e.step, e.duration, e.value + e.alter + (e.transpose ?? 0)]);
        const out = [
            c.map?.kind === 'table' ? ref(c.map.table) : c.map,
            noise ? null : c.freq,
            noise ? null : c.loops,
            noise ? null : c.steps,
            noise ? null : c.glide,
            c.oneshot,
            c.kit,
            ref(c.env),
            c.exciters ?? null,
            params,
            moving,
            steps,
        ];
        if (!seen.size)
            memo.set(name, out);
        return out;
    };
    return (voice) => of(voice, new Set());
}
function sameEvents(a, b, until, reading, options = {}) {
    try {
        const ra = compileSource(a, undefined, options);
        const rb = compileSource(b, undefined, options);
        if (!ra.ok || !rb.ok)
            return false;
        const to = typeof until === 'number' ? until : until(ra, rb);
        const played = (r) => {
            const events = eventsBetween(plan(r, codeShifts(r), r.off), 0, to, true);
            const route = router(r, channelTable(r));
            const sent = (e) => routesOf(e.midi ? route(e) : null)
                .map((x) => midiNote(e, x))
                .map((m) => (m ? `${m.channel}:${m.note}` : '-'))
                .join(',');
            return { r, events, sent: events.map(sent), sound: soundOf(r) };
        };
        const pa = played(ra);
        const pb = played(rb);
        const sounds = [];
        const classOf = new Map();
        const voiceOf = (p, side) => (voice) => {
            const key = `${side}${voice}`;
            let k = classOf.get(key);
            if (k === undefined) {
                const s = p.sound(voice);
                k = sounds.findIndex((t) => alike(t, s));
                if (k < 0)
                    k = sounds.push(s) - 1;
                classOf.set(key, k);
            }
            return k;
        };
        const exact = (p, side) => {
            const voice = voiceOf(p, side);
            return p.events
                .map((e, i) => {
                const v = `${voice(e.voice)} ${p.sent[i]}`;
                const n = `${v} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)}`;
                return reading === 'note' ? n : `${n} ${e.gains.map((g) => g.toFixed(5)).join(',')} ${JSON.stringify([e.bends, e.levels, e.params ?? null, e.env ?? null], nine)}`;
            })
                .sort()
                .join('\n');
        };
        if (exact(pa, 'a') === exact(pb, 'b'))
            return true;
        const within = (h) => h.at < to - HEARD.seconds;
        return sameHeard(heard(pa, voiceOf(pa, 'a'), reading).filter(within), heard(pb, voiceOf(pb, 'b'), reading).filter(within), reading);
    }
    catch {
        return false;
    }
}
function heard(p, voice, reading) {
    const out = [];
    const sorted = p.events.map((e, i) => ({ e, sent: p.sent[i] })).sort((x, y) => x.e.at - y.e.at);
    for (const { e, sent } of sorted) {
        const noise = NOISES.has(String(p.r.cells.get(e.voice)?.params.s));
        const h = {
            voice: voice(e.voice),
            at: e.at,
            dur: e.dur,
            freq: noise ? null : e.freq,
            gains: reading === 'note' ? [0, 0] : e.gains,
            rest: reading === 'note' ? null : [noise ? [] : e.bends, e.levels, e.params ?? null, e.env ?? null],
            sent,
        };
        let j = out.length - 1;
        while (j >= 0 && h.at - out[j].at <= HEARD.seconds && !sameBut(out[j], h))
            j--;
        if (j >= 0 && h.at - out[j].at <= HEARD.seconds) {
            const g = out[j].gains;
            out[j] = { ...out[j], gains: [g[0] + h.gains[0], g[1] + h.gains[1]] };
        }
        else
            out.push(h);
    }
    return reading === 'note' ? out : out.filter((h) => h.sent !== '' || h.gains.some((g) => Math.abs(g) >= HEARD.silent));
}
const sameBut = (x, y) => x.voice === y.voice &&
    x.sent === y.sent &&
    Math.abs(x.at - y.at) <= HEARD.seconds &&
    Math.abs(x.at + x.dur - (y.at + y.dur)) <= HEARD.seconds &&
    (x.freq === null ? y.freq === null : y.freq !== null && samePitch(x.freq, y.freq)) &&
    alike(x.rest, y.rest);
function sameHeard(a, b, reading) {
    if (a.length !== b.length)
        return false;
    const taken = new Uint8Array(b.length);
    let from = 0;
    for (const x of a) {
        while (from < b.length && b[from].at < x.at - HEARD.seconds) {
            if (!taken[from])
                return false;
            from++;
        }
        let found = -1;
        for (let j = from; j < b.length && b[j].at <= x.at + HEARD.seconds; j++)
            if (!taken[j] && sameBut(x, b[j]) && (reading === 'note' || (sameLevel(x.gains[0], b[j].gains[0]) && sameLevel(x.gains[1], b[j].gains[1])))) {
                found = j;
                break;
            }
        if (found < 0)
            return false;
        taken[found] = 1;
    }
    return true;
}
export function samePiece(a, b, until = SAMENESS_SECONDS) {
    return sameEvents(a, b, until, 'whole');
}
export const WHOLE_PIECE_LIMIT = 1200;
export function wholeWindow(a, b) {
    const end = (r) => pieceTime(r).ends ?? SAMENESS_SECONDS;
    return Math.min(WHOLE_PIECE_LIMIT, Math.max(end(a), end(b)));
}
export function soundsIdentical(a, b, until, options) {
    return sameEvents(a, b, until ?? wholeWindow, 'whole', options);
}
export function playsSameNotes(a, b, until, options) {
    return sameEvents(a, b, until ?? wholeWindow, 'note', options);
}
