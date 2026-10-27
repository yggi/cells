import { legatoNotes, channelTable, midiNote, noteOf, routesOf, router, BEND_CENTRE } from "./midi.js";
import { keyName } from "./miditext.js";
import { mainMeter } from "./midiclock.js";
import { clocking } from "./clocking.js";
import { spanOf } from "./span.js";
import { eventsBetween, plan } from "./realize.js";
import { DEFAULT_FREQ } from "./program.js";
const PPQ = 480;
const SAME_TEMPO = 2;
function meterOf(result, root) {
    const own = result.cells.get(root)?.meter;
    if (own)
        return own;
    const on = [...result.cells.values()].filter((c) => c.meter && c.step?.driver === root);
    return on.length === 1 ? on[0].meter : undefined;
}
export function pieceMidi(result, shifts, muted = result.off, name, span = {}) {
    const p = plan(result, shifts, muted);
    const seconds = spanOf(result, p, { ...span, from: 0 }).to;
    const events = eventsBetween(p, 0, seconds, true, { until: seconds })
        .flatMap(legatoNotes)
        .filter((e) => e.at < seconds);
    const meter = mainMeter(result);
    const map = meter ? clocking(result, p.statics).map(meter.cell) : null;
    const perBeat = meter?.beat ?? 4;
    const last = events.reduce((m, e) => Math.max(m, e.at + e.dur), seconds);
    const steps = [];
    for (let k = 0; steps.length < 1_000_000; k++) {
        const t = map ? map.q(k) : k * 0.125;
        if (!Number.isFinite(t) || (steps.length && t <= steps[steps.length - 1]))
            break;
        steps.push(t);
        if (t > last)
            break;
    }
    while (steps.length < 2 || steps[steps.length - 1] <= last) {
        const n = steps.length;
        steps.push(n >= 2 ? 2 * steps[n - 1] - steps[n - 2] : n * 0.125);
    }
    const tickOf = (k) => Math.round((k * PPQ) / perBeat);
    const tickAt = (t) => {
        let lo = 0;
        let hi = steps.length - 2;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (steps[mid] <= t)
                lo = mid;
            else
                hi = mid - 1;
        }
        return Math.round(tickOf(lo) + ((tickOf(lo + 1) - tickOf(lo)) * (t - steps[lo])) / (steps[lo + 1] - steps[lo]));
    };
    const tempos = [];
    const lastTick = tickAt(last);
    for (let k = 0; k + 1 < steps.length && (k === 0 || tickOf(k) < lastTick); k++) {
        const micros = Math.round(((steps[k + 1] - steps[k]) * 1e6 * PPQ) / (tickOf(k + 1) - tickOf(k)));
        if (!tempos.length || Math.abs(micros - tempos[tempos.length - 1].micros) >= SAME_TEMPO)
            tempos.push({ tick: tickOf(k), micros });
    }
    const table = channelTable(result);
    const route = router(result, table);
    const byChannel = new Map();
    let dropped = 0;
    for (const e of [...events].sort((a, b) => a.at - b.at)) {
        for (const r of routesOf(route(e))) {
            const m = midiNote(e, r);
            if (!m) {
                dropped++;
                continue;
            }
            const tick = tickAt(m.at);
            const end = Math.max(tick + 1, tickAt(m.end));
            const track = byChannel.get(m.channel) ?? { notes: [], at: [] };
            byChannel.set(m.channel, track);
            track.notes.push({ channel: m.channel, key: m.note, velocity: m.velocity, tick, end });
            const bend = (at, value) => {
                const before = track.at.length ? track.at[track.at.length - 1].value : BEND_CENTRE;
                if (value !== before)
                    track.at.push({ tick: at, value });
            };
            bend(tick, m.bend);
            for (const b of m.bends)
                bend(tickAt(b.at), b.value);
        }
    }
    const names = new Map();
    for (const v of table.voices)
        names.set(v.channel, [...(names.get(v.channel) ?? []), v.voice]);
    for (const k of table.kits)
        names.set(k.channel, [...(names.get(k.channel) ?? []), kitName(result, table.kit)]);
    const tracks = [...byChannel]
        .sort(([a], [b]) => a - b)
        .map(([channel, t]) => ({
        name: [...new Set(names.get(channel) ?? [`channel ${channel}`])].join(' '),
        notes: t.notes,
        bends: t.at.map((b) => ({ ...b, channel })),
        programs: [],
    }));
    const m = meter ? meterOf(result, meter.cell) : undefined;
    const meters = m && m.unit === 4 && m.beats.every((b) => b === 1) && m.pulses > 0 ? [{ tick: 0, num: m.pulses, den: 4 }] : [];
    return { smf: { format: 1, ppq: PPQ, ...(name !== undefined ? { name } : {}), tracks, tempos, meters }, dropped };
}
function kitName(result, kit) {
    return kit
        .map(({ member }) => {
        const freq = result.cells.get(member)?.freq ?? DEFAULT_FREQ;
        if (!(freq > 0) || Math.abs(freq - DEFAULT_FREQ) < 0.01)
            return member;
        const { note, cents } = noteOf(freq);
        return `${member}(${Math.abs(cents) < 0.5 && note >= 0 && note <= 127 ? keyName(note) : Number(freq.toPrecision(6))})`;
    })
        .join(' ');
}
