import { SECONDS_PER_STEP as LAW_SPS, START as LAW_START, notesBetween as lawNotes } from "./fiveto12.js";
import { adsrOf, balance } from "./program.js";
import { tableChain } from "./helix.js";
import { clocking, EPS, playedCells, tapeMotion, varispeedOf } from "./clocking.js";
import { ExpansionLimit, flatten, stepsOf } from "./flatten.js";
import { cellId } from "./ids.js";
import { refsOf } from "./readers.js";
import { heldAt, levelSeries, modulation, paramTracks, pitchOf, valueThen } from "./series.js";
import { warpOf } from "./physics.js";
import { tapShare } from "./meter.js";
import { mod } from "../theory/modes.js";
export const HELD = 600;
export function endOf(result, statics, o) {
    const clk = clocking(result, statics);
    const seen = new Set();
    const ends = [];
    const visit = (name) => {
        for (let guard = 0; name && !seen.has(name) && guard < 32; guard++) {
            seen.add(name);
            const c = result.cells.get(name);
            if (!c)
                return;
            if (c.laps && c.clock)
                ends.push(clk.map(c.clock).q((c.laps * Math.max(1, stepsOf(result, name, null))) / c.rate));
            if (c.clock && c.clock !== name)
                visit(c.clock);
            name = c.step?.driver;
        }
    };
    visit(o.cell);
    for (const x of o.select)
        visit(x.cell);
    return ends.length ? Math.min(...ends) : Infinity;
}
export function droneEnd(result, statics) {
    const ends = result.outputs.filter((o) => !o.drone).map((o) => endOf(result, statics, o));
    return ends.length ? Math.max(...ends) : Infinity;
}
export function chanceOf(text) {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
        const ch = text.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return ((h2 >>> 0) * 2 ** 21 + (h1 >>> 11)) / 2 ** 53;
}
function thrown(result, t, e, lap) {
    if (e.laps && mod(lap, e.laps.of) !== e.laps.is)
        return null;
    if (e.chance === undefined && !e.options && !e.chosen)
        return e;
    const seed = `${result.cells.get(t.output.cell)?.seed ?? 0}|${t.output.cell}`;
    for (const c of e.chosen ?? [])
        if (Math.floor(chanceOf(`${seed}|${lap + c.lap}|${c.at.toFixed(6)}|${c.id}|picks`) * c.of) !== c.is)
            return null;
    if (e.chance === undefined && !e.options)
        return e;
    const key = `${seed}|${lap}|${e.step.toFixed(6)}`;
    if (e.chance !== undefined && chanceOf(`${key}|sounds`) >= 1 - e.chance)
        return null;
    if (!e.options)
        return e;
    const o = e.options[Math.floor(chanceOf(`${key}|picks`) * e.options.length)];
    return { ...e, value: o.value, alter: o.alter };
}
function restartOf(result, select) {
    let restart = false;
    for (const x of select) {
        const word = result.cells.get(x.part)?.params.restart ?? result.cells.get(x.cell)?.params.restart;
        if (word === 'resume' || word === 'free')
            return word;
        if (word === 'restart' || !x.performer)
            restart = true;
    }
    return restart ? 'restart' : 'free';
}
export function picksNow(result, statics, name, seconds) {
    const c = result.cells.get(name);
    const entries = result.cells.get(c?.over ?? '')?.units.length ?? 0;
    if (!c?.clock || entries === 0)
        return new Set();
    const period = Math.max(1, stepsOf(result, name, null));
    const local = mod(clocking(result, statics).map(c.clock).stepAt(seconds) * c.rate, period);
    const out = new Set();
    for (const e of flatten(result, name, statics, null))
        if (local >= e.step - EPS && local < e.step + e.duration - EPS)
            out.add(mod(Math.round(e.value + e.alter), entries));
    return out;
}
function windowsOf(p, sel, from, to) {
    const m = sel.series;
    if (!m.clock || m.events.length === 0)
        return [];
    const tm = clocking(p.result, p.statics).map(m.clock);
    let c0 = tm.stepAt(Math.max(0, from)) * m.rate;
    let c1 = tm.stepAt(Math.max(0, to)) * m.rate;
    if (!Number.isFinite(c0))
        c0 = 0;
    if (!Number.isFinite(c1))
        c1 = c0;
    const out = [];
    for (let lap = Math.floor(c0 / m.period) - 1; lap * m.period < c1; lap++)
        for (const e of m.events) {
            if (mod(Math.round(e.value + e.alter), sel.entries) !== sel.entry)
                continue;
            const s0 = lap * m.period + e.step;
            const s1 = s0 + e.duration;
            if (s1 <= c0 + EPS || s0 >= c1 - EPS)
                continue;
            out.push({ a: tm.q(s0 / m.rate), b: tm.q(s1 / m.rate) });
        }
    return out.sort((x, y) => x.a - y.a);
}
export const chainMuted = (result, table, muted) => tableChain(result, table).some((c) => muted.has(cellId(c)));
const driverMuted = (result, name, muted) => {
    let c = result.cells.get(name);
    for (let guard = 0; c?.step && guard < 32; guard++) {
        if (muted.has(cellId(c.step.driver)))
            return true;
        c = result.cells.get(c.step.driver);
    }
    return false;
};
function voiceGain(result, voice) {
    const c = result.cells.get(voice);
    const l = c?.voice ? c.params.gain : undefined;
    return typeof l === 'number' && Number.isFinite(l) ? l : 1;
}
export function liveGains(o, muted) {
    if (o.silent)
        return o.via.some((m) => muted.has(cellId(m)) && !o.midi?.some((d) => d.card === m)) ? [0, 0] : [o.gains[0], o.gains[1]];
    return partsGains(o.parts, muted);
}
export function heardGains(o, muted) {
    const g = liveGains(o, muted);
    if (o.silent || audible(g))
        return g;
    const gain = liveMidi(o, muted).reduce((m, d) => (Math.abs(d.gain) > Math.abs(m) ? d.gain : m), 0);
    return [gain, gain];
}
export function returnGains(x, muted) {
    return x.through.some((t) => muted.has(cellId(t))) ? [0, 0] : partsGains(x.parts, muted);
}
function partsGains(parts, muted) {
    const g = [0, 0];
    for (const p of parts)
        if (!muted.has(cellId(p.mix)) && !muted.has(cellId(p.sink))) {
            g[0] += p.gains[0];
            g[1] += p.gains[1];
        }
    return g;
}
const audible = (g) => g[0] !== 0 || g[1] !== 0;
export function outputSounds(result, o, muted) {
    if (!outputOn(result, o, muted))
        return false;
    return audible(heardGains(o, muted));
}
export function outputPlays(result, o, muted) {
    if (!outputOn(result, o, muted))
        return false;
    const g = liveGains(o, muted);
    return audible(g) || outputSent(o, muted);
}
function liveMidi(o, muted) {
    return (o.midi ?? []).filter((m) => !muted.has(cellId(m.card)) && !(m.mix && muted.has(cellId(m.mix))));
}
const outputSent = (o, muted) => liveMidi(o, muted).length > 0;
function outputOn(result, o, muted) {
    if (muted.has(cellId(o.voice)) || muted.has(cellId(o.cell)))
        return false;
    if (o.drone)
        return !o.through.some((t) => muted.has(cellId(t))) && !(o.envelopeCell && muted.has(cellId(o.envelopeCell)));
    const c = result.cells.get(o.cell);
    if (!c?.clock || chainMuted(result, c.clock, muted) || driverMuted(result, o.cell, muted))
        return false;
    if (o.through.some((t) => muted.has(cellId(t))) || (o.envelopeCell && muted.has(cellId(o.envelopeCell))))
        return false;
    if (o.select.some((x) => muted.has(cellId(x.cell)) || muted.has(cellId(x.part)) || muted.has(cellId(result.cells.get(x.cell).over))))
        return false;
    if (o.select.some((x) => [...result.cells.get(x.cell).children.keys()].some((c) => muted.has(cellId(c)))))
        return false;
    return true;
}
export function plan(result, statics, muted = new Set()) {
    if (!result.ok)
        return { result, statics, muted, tracks: [], drones: [], played: new Set(), voiceParams: new Map(), end: Infinity };
    const tracks = [];
    const drones = [];
    const voiceParams = new Map();
    for (const o of result.outputs) {
        if (!outputPlays(result, o, muted))
            continue;
        const c = result.cells.get(o.cell);
        const series = (cell, pick, shift, sign) => {
            const m = result.cells.get(cell);
            const events = muted.has(cellId(cell)) ? [] : flatten(result, cell, statics, pick, (n) => muted.has(cellId(n)), shift).filter((e) => !chainMuted(result, e.table, muted));
            return { sign, lin: m.map?.kind === 'lin', db: m.map?.kind === 'db', clock: m.clock, rate: m.rate, period: Math.max(1, stepsOf(result, cell, pick)), events };
        };
        try {
            for (const voice of o.kit ? refsOf(result.cells.get(o.voice)) : [o.voice]) {
                if (voiceParams.has(voice))
                    continue;
                const vc = result.cells.get(voice);
                const out = {};
                for (const [key, pc] of Object.entries(vc?.paramCells ?? {})) {
                    const envCell = pc.factors.find((f) => result.cells.get(f)?.map?.kind === 'adsr');
                    out[key] = {
                        range: pc.range,
                        series: pc.factors.filter((f) => f !== envCell).map((f) => series(f, null, 0, 1)),
                        env: envCell ? adsrOf(result.cells.get(envCell)) : null,
                    };
                }
                voiceParams.set(voice, out);
            }
            if (o.drone) {
                drones.push({
                    output: o,
                    mods: o.mods.map((t) => series(t.cell, t.pick, t.shift, t.sign)).filter((m) => m.events.length > 0),
                    levels: o.levels.map((t) => series(t.cell, t.pick, t.shift, t.sign)),
                });
                continue;
            }
            const main = series(o.cell, o.pick, o.shift, o.sign);
            const mods = o.mods
                .filter((t) => !t.picks)
                .map((t) => series(t.cell, t.pick, t.shift, t.sign))
                .filter((m) => m.events.length > 0);
            const picks = o.mods.find((t) => t.picks);
            const picker = picks ? series(picks.cell, picks.pick, picks.shift, 1) : undefined;
            const levels = o.levels.map((t) => series(t.cell, t.pick, t.shift, t.sign));
            const selects = o.select.map((x) => ({
                series: series(x.cell, null, 0, 1),
                entry: x.entry,
                entries: result.cells.get(result.cells.get(x.cell).over).units.length,
            }));
            const lc = c.paramCells.legato;
            const tapped = c.step?.tap ? result.cells.get(c.step.driver)?.meter : null;
            const ratio = c.step?.chain.reduce((r, x) => (x.op === '×' ? r * x.n : r / x.n), 1) ?? 1;
            const share = lc
                ? { range: lc.range, series: lc.factors.map((f) => series(f, null, 0, 1)) }
                : typeof c.params.legato === 'number'
                    ? c.params.legato
                    : tapped
                        ? tapShare(tapped, c.step.tap, ratio)
                        : 1;
            if (main.events.length)
                tracks.push({ ...main, output: o, clock: c.clock, mods, ...(picker ? { picker } : {}), levels, selects, end: endOf(result, statics, o), share });
        }
        catch (e) {
            if (!(e instanceof ExpansionLimit))
                throw e;
        }
    }
    const ends = tracks.map((t) => t.end);
    let stops = -Infinity;
    for (const c of result.clocks.values()) {
        const at = warpOf(result, c.cell)?.stopsAt();
        if (at != null)
            stops = Math.max(stops, at);
    }
    const lapsEnd = ends.length ? Math.max(...ends) : Infinity;
    return { result, statics, muted, tracks, drones, played: playedCells(result), voiceParams, end: Math.min(lapsEnd, stops > -Infinity ? stops : Infinity) };
}
function memberEnvelope(result, voice) {
    const name = result.cells.get(voice)?.env;
    const cell = name ? result.cells.get(name) : undefined;
    return cell?.map?.kind === 'adsr' ? adsrOf(cell) : null;
}
export function voiceFor(result, o, value) {
    if (!o.kit)
        return { voice: o.voice, freq: result.cells.get(o.voice).freq };
    const kit = result.cells.get(o.voice);
    const u = kit.units[mod(Math.round(value), kit.units.length)];
    if (u?.atom.kind !== 'ref')
        return null;
    return { voice: u.atom.name, freq: result.cells.get(u.atom.name).freq };
}
export function kitPickAt(p, o, at) {
    const t = p.tracks.find((x) => x.output === o);
    const e = t?.picker && heldAt(p, t.picker, at);
    return (e && voiceFor(p.result, o, e.value)?.voice) ?? null;
}
function lawOffset(result, cell) {
    const day = result.cells.get(result.cells.get(cell)?.over ?? '');
    const anchor = day?.params.anchor;
    if (typeof anchor !== 'number')
        return 0;
    const sec = (h) => Math.floor(h) * 3600 + Math.round((h % 1) * 100) * 60;
    return Math.round(((((sec(anchor) - LAW_START) % 86400) + 86400) % 86400) / LAW_SPS);
}
const RUN = 256;
export function eventsBetween(p, from, to, outputs = false, held = {}) {
    const lawful = (t) => p.result.cells.get(t.output.cell)?.params.law !== undefined;
    const plain = p.tracks.filter((t) => !t.output.tape && !lawful(t));
    const taped = p.tracks.filter((t) => t.output.tape);
    const out = plainEvents({ ...p, tracks: plain }, from, to, outputs);
    if (p.drones.length) {
        out.push(...droneEvents(p, from, to, outputs, held));
        out.sort((a, b) => a.at - b.at);
    }
    for (const o of p.result.outputs) {
        if (p.result.cells.get(o.cell)?.params.law !== 'fiveto12')
            continue;
        const g = heardGains(o, p.muted);
        const midi = o.midi ? liveMidi(o, p.muted) : [];
        const heard = audible(g);
        if (!heard && !midi.length)
            continue;
        const base = p.result.cells.get(o.voice)?.freq || 261.63;
        const off = lawOffset(p.result, o.cell);
        for (const n of lawNotes(Math.ceil(from / LAW_SPS - 1e-9) + off, Math.ceil(to / LAW_SPS - 1e-9) + off)) {
            const at = (n.step - off) * LAW_SPS;
            out.push({
                at,
                dur: n.dur * LAW_SPS,
                voice: o.voice,
                freq: base * Math.pow(2, n.semis / 12),
                bends: [],
                gains: [g[0] * Math.min(1, 1 - n.pan) * voiceGain(p.result, o.voice), g[1] * Math.min(1, 1 + n.pan) * voiceGain(p.result, o.voice)],
                levels: [{ at, level: n.level }],
                ...(heard ? {} : { unheard: true }),
                ...(midi.length ? { midi } : {}),
                ...(outputs ? { output: o.id } : {}),
            });
        }
    }
    if (!taped.length)
        return out;
    const clk = clocking(p.result, p.statics);
    for (const t of taped) {
        const tp = t.output.tape;
        const tc = p.result.cells.get(tp.tape);
        const { pos, real, speed, moving: m } = tapeMotion(p.result, clk, tp.tape);
        const vari = typeof tc?.params.varispeed === 'number' ? tc.params.varispeed : 0;
        const keep = 1 - tp.erase;
        const passes = tp.length > 0 ? Math.min(40, keep > 0 ? Math.ceil(Math.log(0.02) / Math.log(keep)) : 1) : 1;
        const source = { ...t, output: { ...t.output, tape: undefined } };
        for (let k = 0; k < passes; k++) {
            const shift = tp.at + k * tp.length;
            const g = Math.pow(keep, k);
            const s0 = real(pos(from) - shift);
            const s1 = real(pos(to) - shift);
            if (!(s1 > 0) || !Number.isFinite(s1))
                continue;
            const through = (x) => real(pos(x) + shift);
            for (const e of plainEvents({ ...p, tracks: [source] }, Math.max(0, s0), s1, outputs)) {
                const at = through(e.at);
                if (!(at >= from && at < to) || !Number.isFinite(at))
                    continue;
                const end = through(e.at + e.dur);
                if (m && speed(e.at) < 0.05)
                    continue;
                const ratio = vari ? Math.min(4, Math.max(0.25, Math.pow(speed(at) / speed(e.at), vari))) : 1;
                out.push({
                    ...e,
                    at,
                    dur: Math.max(0.01, (Number.isFinite(end) ? end : at + e.dur) - at),
                    freq: e.freq * ratio,
                    bends: e.bends.map((b) => ({ ...b, at: through(b.at) })),
                    levels: e.levels.map((l) => ({ ...l, at: through(l.at) })),
                    gains: [e.gains[0] * g, e.gains[1] * g],
                    ...(e.params
                        ? {
                            params: Object.fromEntries(Object.entries(e.params).map(([key, tr]) => [key, tr.kind === 'points' ? { ...tr, points: tr.points.map((x) => ({ ...x, at: through(x.at) })) } : tr])),
                        }
                        : {}),
                });
            }
        }
    }
    return out.sort((a, b) => a.at - b.at);
}
function plainEvents(p, from, to, outputs) {
    const out = [];
    const { result, statics } = p;
    const clk = clocking(result, statics);
    for (const t of p.tracks) {
        const tm = clk.map(t.clock);
        const until = Math.min(to, t.end);
        if (until <= from)
            continue;
        const c0 = tm.stepAt(Math.max(0, from)) * t.rate;
        const c1 = tm.stepAt(Math.max(0, until)) * t.rate;
        if (!Number.isFinite(c0) || !Number.isFinite(c1) || c1 <= c0)
            continue;
        const shareAt = (s) => {
            const l = t.share;
            if (typeof l === 'number')
                return l;
            const at = tm.q(s / t.rate);
            const x = l.series.reduce((a, m) => {
                const e = heldAt(p, m, at);
                return a * (e ? e.value + e.alter : 1);
            }, 1);
            return l.range ? l.range[0] + (l.range[1] - l.range[0]) * x : x;
        };
        const make = (s, e, upto, bound = Infinity) => {
            const at = tm.q(s / t.rate);
            if (!Number.isFinite(at))
                return null;
            if (at >= t.end - EPS)
                return null;
            const share = shareAt(s);
            const ends = Math.min(tm.q((share === 1 ? upto : s + share * (upto - s)) / t.rate), bound < Infinity ? tm.q(bound / t.rate) : Infinity, t.end);
            const by = t.picker ? heldAt(p, t.picker, at) : e;
            const v = by && voiceFor(result, t.output, by.value);
            if (!v || p.muted.has(cellId(v.voice)))
                return null;
            const hit = result.cells.get(v.voice)?.oneshot ? (t.output.envelope ?? memberEnvelope(result, v.voice)) : null;
            const dur = hit ? hit.attack + hit.decay : Number.isFinite(ends) ? ends - at : 8;
            const selects = t.output.kit && !t.picker;
            let semis = selects || t.output.gate ? t.output.offset : t.sign * pitchOf(p, e, at) + t.output.offset;
            const bends = [];
            if (t.mods.length) {
                const series = t.mods.map((m) => modulation(p, m, at, at + dur));
                const start = series.reduce((a, s) => a + s[0].semis, 0);
                semis += start;
                const times = [...new Set(series.flatMap((s) => s.slice(1).map((x) => x.at)))].sort((a, b) => a - b);
                for (const time of times) {
                    const ramp = series.some((s) => s.some((x) => x.ramp && Math.abs(x.at - time) < EPS));
                    const total = series.reduce((a, s) => a + valueThen(s, time, (x) => x.semis), 0);
                    bends.push({ at: time, cents: 100 * (total - start), ...(ramp ? { ramp } : {}) });
                }
            }
            const vs = varispeedOf(result, t.clock);
            if (vs && tm.speed && !t.output.gate) {
                const sp = (x) => Math.max(1e-3, tm.speed(x));
                const s0 = sp(at);
                if (s0 < 0.05)
                    return null;
                semis += 12 * vs * Math.log2(s0);
                if (!bends.length)
                    for (let x = at + 0.04, n = 0; x < at + dur && n < 400; x += 0.04, n++) {
                        const cents = 1200 * vs * Math.log2(sp(x) / s0);
                        if (Math.abs(cents) > 1)
                            bends.push({ at: x, cents, ramp: true });
                    }
            }
            const own = t.db ? Math.pow(10, (e.value + e.alter) / 20) : Math.max(0, e.value + e.alter);
            const level = [{ at, level: (t.output.gate ? own : 1) * (e.level ?? 1) }];
            if (t.levels.length) {
                const written = clk.written(t.clock).q(s / t.rate);
                const series = t.levels.map((m) => levelSeries(p, m, at, at + dur, written));
                const times = [...new Set(series.flatMap((s) => s.map((x) => x.at)))].sort((a, b) => a - b);
                const base = level[0].level;
                level.length = 0;
                for (const time of times)
                    level.push({
                        at: time,
                        level: base * series.reduce((a, s) => a * valueThen(s, time, (x) => x.level), 1),
                        ...(series.some((s) => s.some((x) => x.ramp && Math.abs(x.at - time) < EPS)) ? { ramp: true } : {}),
                    });
            }
            const freq = v.freq * Math.pow(2, semis / 12);
            const params = paramTracks(p, v.voice, at, dur);
            const env = t.output.envelope ?? (t.output.kit ? memberEnvelope(result, v.voice) : null);
            const memberPan = (g) => {
                const k = voiceGain(result, v.voice);
                if (!t.output.kit)
                    return [g[0] * k, g[1] * k];
                const [l, r] = balance(result.cells.get(v.voice)?.params.pan);
                return [g[0] * l * k, g[1] * r * k];
            };
            const gains = memberPan(heardGains(t.output, p.muted));
            const midi = t.output.midi ? liveMidi(t.output, p.muted) : [];
            if (!(freq > 0 && freq < 20000 && level.some((l) => l.level > 0)))
                return null;
            return {
                at,
                dur,
                voice: v.voice,
                freq,
                bends,
                value: e.value + e.alter,
                gains,
                levels: level,
                ...(!t.output.silent && !audible(gains) ? { unheard: true } : {}),
                ...(midi.length ? { midi } : {}),
                ...(env ? { env } : {}),
                ...(t.output.through.length ? { instrument: t.output.through[0] } : {}),
                ...(params ? { params } : {}),
                ...(outputs ? { output: t.output.id } : {}),
            };
        };
        const glide = t.output.kit || t.output.gate ? 0 : (result.cells.get(t.output.voice)?.glide ?? 0);
        const tie = glide > 0;
        const n = t.events.length;
        const single = (i) => (i === 0 || t.events[i - 1].step !== t.events[i].step) && (i === n - 1 || t.events[i + 1].step !== t.events[i].step);
        const before = (i, lap) => (i > 0 ? [i - 1, lap] : [n - 1, lap - 1]);
        const tied = (i, lap, minLap, base, notBefore) => {
            if (!tie || !single(i) || mod(lap * n + i, RUN) === 0)
                return false;
            const [k, kl] = before(i, lap);
            const end = kl * t.period + t.events[k].step + t.events[k].duration;
            const start = lap * t.period + t.events[i].step;
            return (single(k) &&
                kl >= minLap &&
                base + kl * t.period + t.events[k].step >= notBefore - EPS &&
                Math.abs(end - start) < EPS &&
                shareAt(base + kl * t.period + t.events[k].step) >= 1 - EPS &&
                !!thrown(result, t, t.events[k], kl));
        };
        const emit = (s, e, upto, i = -1, lap = 0, base = 0, minLap = 0, bound = Infinity, notBefore = -Infinity) => {
            if (i >= 0 && tied(i, lap, minLap, base, notBefore))
                return;
            const first = make(s, e, upto, bound);
            if (!first)
                return;
            if (i < 0 || !tie || !single(i))
                return void out.push(first);
            let run = first;
            const notes = [{ at: first.at, dur: first.dur, freq: first.freq, bends: first.bends }];
            let [j, jl] = [i, lap];
            for (let guard = 0; guard < RUN; guard++) {
                [j, jl] = j < n - 1 ? [j + 1, jl] : [0, jl + 1];
                const sj = base + jl * t.period + t.events[j].step;
                if (sj >= bound - EPS || !tied(j, jl, minLap, base, notBefore))
                    break;
                const r = thrown(result, t, t.events[j], jl);
                const next = r && make(sj, r, sj + t.events[j].duration, bound);
                if (!next)
                    break;
                const cents = 1200 * Math.log2(next.freq / run.freq);
                const was = run.bends.length ? run.bends[run.bends.length - 1].cents : 0;
                const slide = Math.min(glide, next.dur);
                run = {
                    ...run,
                    dur: next.at + next.dur - run.at,
                    bends: [
                        ...run.bends,
                        { at: next.at, cents: was },
                        { at: next.at + slide, cents, ramp: true },
                        ...next.bends.map((b) => ({ ...b, at: Math.max(b.at, next.at + slide), cents: b.cents + cents })),
                    ],
                    levels: [...run.levels, ...next.levels.filter((l) => l.at >= next.at)],
                };
                notes.push({ at: next.at, dur: next.dur, freq: next.freq, bends: next.bends });
            }
            out.push(notes.length > 1 ? { ...run, legato: { glide, notes } } : run);
        };
        if (t.selects.length === 0) {
            for (let lap = Math.floor(c0 / t.period) - 1; lap * t.period < c1; lap++)
                for (const [i, e] of t.events.entries()) {
                    const s = lap * t.period + e.step;
                    if (s < c0 - EPS || s >= c1 - EPS)
                        continue;
                    const r = thrown(result, t, e, lap);
                    if (r)
                        emit(s, r, s + e.duration, i, lap);
                }
            continue;
        }
        const policy = restartOf(result, t.output.select);
        const join = (ws) => ws.reduce((all, w) => {
            const last = all[all.length - 1];
            if (last && Math.abs(w.a - last.b) < EPS)
                all[all.length - 1] = { a: last.a, b: w.b };
            else
                all.push(w);
            return all;
        }, []);
        const of = (i, a) => {
            const x = t.output.select[i];
            const ws = windowsOf(p, t.selects[i], a, until);
            const said = result.cells.get(x.part)?.params.restart ?? result.cells.get(x.cell)?.params.restart;
            return x.performer && said !== 'restart' ? join(ws) : ws;
        };
        const windowsFrom = (a) => {
            let ws = of(0, a);
            for (const i of t.selects.keys()) {
                if (i === 0)
                    continue;
                const other = of(i, a);
                ws = ws.flatMap((w) => other.flatMap((x) => (Math.max(w.a, x.a) < Math.min(w.b, x.b) ? [{ a: Math.max(w.a, x.a), b: Math.min(w.b, x.b) }] : [])));
            }
            return policy === 'restart' ? ws : join(ws);
        };
        const windows = windowsFrom(policy === 'resume' ? 0 : from);
        let held = 0;
        for (const w of windows) {
            const sA = tm.stepAt(w.a) * t.rate;
            const sB = tm.stepAt(w.b) * t.rate;
            const base = policy === 'free' ? 0 : policy === 'resume' ? sA - held : sA;
            held += sB - sA;
            const lo = Math.max(c0, sA);
            const hi = Math.min(c1, sB);
            if (hi <= lo)
                continue;
            for (let lap = Math.floor((lo - base) / t.period) - 1; base + lap * t.period < hi; lap++)
                for (const [i, e] of t.events.entries()) {
                    const s = base + lap * t.period + e.step;
                    if (lap < 0 || s < lo - EPS || s >= hi - EPS)
                        continue;
                    const r = thrown(result, t, e, lap);
                    if (r)
                        emit(s, r, s + e.duration, i, lap, base, 0, sB, sA);
                }
        }
    }
    return out.sort((a, b) => a.at - b.at);
}
function merged(series, v, combine, unit) {
    const times = [...new Set(series.flatMap((s) => s.map((x) => x.at)))].sort((a, b) => a - b);
    const idx = series.map(() => 0);
    const out = [];
    for (const time of times) {
        let value = unit;
        let ramp = false;
        series.forEach((s, k) => {
            let i = idx[k];
            while (i + 1 < s.length && s[i + 1].at <= time + EPS)
                i++;
            idx[k] = i;
            const a = s[i];
            const next = s[i + 1];
            const x = !next?.ramp || Math.abs(a.at - time) < EPS ? v(a) : v(a) + ((v(next) - v(a)) * (time - a.at)) / Math.max(EPS, next.at - a.at);
            value = combine(value, x);
            if (a.ramp && Math.abs(a.at - time) < EPS)
                ramp = true;
        });
        out.push({ at: time, value, ...(ramp ? { ramp } : {}) });
    }
    return out;
}
function droneEvents(p, from, to, outputs, held) {
    const begins = Math.max(0, held.begins ?? 0);
    const ends = Math.min(p.end, held.until ?? Infinity);
    const out = [];
    for (let k = Math.max(0, Math.floor((from - begins) / HELD)); begins + k * HELD < Math.min(to, ends); k++) {
        const at = begins + k * HELD;
        if (at < from - EPS)
            continue;
        const dur = Math.min(HELD, ends - at);
        if (!(dur > 0))
            continue;
        for (const d of p.drones) {
            const o = d.output;
            const voice = p.result.cells.get(o.voice);
            if (!voice)
                continue;
            const mods = d.mods.map((m) => modulation(p, m, at, at + dur));
            const bend = merged(mods, (x) => x.semis, (a, b) => a + b, 0);
            const start = bend[0]?.value ?? 0;
            const bends = bend.slice(1).map((x) => ({ at: x.at, cents: 100 * (x.value - start), ...(x.ramp ? { ramp: true } : {}) }));
            const levels = d.levels.length
                ? merged(d.levels.map((m) => levelSeries(p, m, at, at + dur)), (x) => x.level, (a, b) => a * b, 1).map((x) => ({ at: x.at, level: x.value, ...(x.ramp ? { ramp: true } : {}) }))
                : [{ at, level: 1 }];
            const freq = voice.freq * Math.pow(2, (o.offset + start) / 12);
            if (!(freq > 0 && freq < 20000) || !levels.some((l) => l.level > 0))
                continue;
            const gains = heardGains(o, p.muted);
            const midi = o.midi ? liveMidi(o, p.muted) : [];
            const params = paramTracks(p, o.voice, at, dur);
            out.push({
                at,
                dur,
                voice: o.voice,
                freq,
                bends,
                gains,
                levels,
                held: true,
                ...(!o.silent && !audible(gains) ? { unheard: true } : {}),
                ...(midi.length ? { midi } : {}),
                ...(o.envelope ? { env: o.envelope } : {}),
                ...(o.through.length ? { instrument: o.through[0] } : {}),
                ...(params ? { params } : {}),
                ...(outputs ? { output: o.id } : {}),
            });
        }
    }
    return out;
}
