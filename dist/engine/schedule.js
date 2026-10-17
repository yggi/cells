import { clocking, tapeMotion } from "./clocking.js";
import { eventsBetween } from "./realize.js";
import { ticksBetween } from "./midiclock.js";
const SPEED_STEP = 0.05;
export function tapeSpeeds(p, from, to) {
    if (!p.result.tapes.length)
        return [];
    const clk = clocking(p.result, p.statics);
    const out = [];
    for (const tp of p.result.tapes) {
        const motion = tapeMotion(p.result, clk, tp.name);
        if (!motion.moving && !tp.dropout && !tp.heads.some((h) => h.wander > 0))
            continue;
        const points = [];
        for (let x = from; x <= to; x += SPEED_STEP)
            points.push({ at: x, speed: motion.speed(x) });
        out.push({ tape: tp.name, points });
    }
    return out;
}
export function windowAt(p, from, length, held = {}) {
    return {
        from,
        to: from + length,
        events: eventsBetween(p, from, from + length, true, held),
        tapes: tapeSpeeds(p, from, from + length + 1e-9),
        clock: ticksBetween(p, from, from + length),
    };
}
export function isPhysical(result) {
    for (const c of result.cells.values())
        if (typeof c.params.motor === 'number' || typeof c.params.belt === 'number')
            return true;
    return false;
}
export function retime(w, time, scale) {
    const at = (x) => time + (x - w.from) * scale;
    return {
        events: w.events.map((e) => ({
            ...e,
            at: at(e.at),
            code: e.code ?? e.at,
            dur: e.dur * scale,
            bends: e.bends.map((b) => ({ at: at(b.at), cents: b.cents, ramp: b.ramp })),
            levels: e.levels.map((l) => ({ at: at(l.at), level: l.level, ramp: l.ramp })),
            params: e.params && Object.fromEntries(Object.entries(e.params).map(([k, t]) => [k, t.kind === 'points' ? { ...t, points: t.points.map((x) => ({ ...x, at: at(x.at) })) } : t])),
            ...(e.legato && {
                legato: {
                    glide: e.legato.glide * scale,
                    notes: e.legato.notes.map((n) => ({ ...n, at: at(n.at), dur: n.dur * scale, bends: n.bends.map((b) => ({ ...b, at: at(b.at) })) })),
                },
            }),
        })),
        tapes: w.tapes.map((t) => ({ tape: t.tape, points: t.points.map((p) => ({ at: at(p.at), speed: p.speed })) })),
        clock: w.clock ? { first: w.clock.first, at: w.clock.at.map(at), before: at(w.clock.before) } : null,
    };
}
