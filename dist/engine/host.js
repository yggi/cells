import { compileSource } from "./compile.js";
import { codeShifts } from "./program.js";
import { grab, resetPhysics } from "./physics.js";
import { physicsOf } from "./clocking.js";
import { plan } from "./realize.js";
import { retime, windowAt } from "./schedule.js";
import { keepBar, keepBeat } from "./keepbeat.js";
export function planOf(code, env, options) {
    const r = compileSource(code, env, options);
    return plan(r, codeShifts(r), r.off);
}
export function grabIn(p, cell, t, speed) {
    const w = physicsOf(p.result, p.statics, cell);
    if (w)
        grab(p.result, w, t, speed);
}
export const emptyWindow = (from, length) => ({ from, to: from + length, events: [], tapes: [] });
function shiftedWindow(p, from, length, begins, offset) {
    if (offset === 0)
        return windowAt(p, from, length, { begins });
    const w = windowAt(p, from + offset, length, { begins: (begins ?? 0) + offset });
    return { from, to: from + length, ...retime(w, from, 1) };
}
function joined(a, b) {
    const tapes = [...a.tapes];
    for (const t of b.tapes) {
        const i = tapes.findIndex((u) => u.tape === t.tape);
        if (i < 0)
            tapes.push(t);
        else
            tapes[i] = { tape: t.tape, points: [...tapes[i].points.filter((x) => x.at < b.from), ...t.points] };
    }
    const x = a.clock;
    const y = b.clock;
    const clock = x && y ? (x.at.length ? { first: x.first, at: [...x.at, ...y.at], before: x.before } : y) : (x ?? y ?? null);
    return { from: a.from, to: b.to, events: [...a.events, ...b.events], tapes, clock };
}
export function createHost(now = () => performance.now(), { resolve } = {}) {
    let p = null;
    let offset = 0;
    let kept = null;
    return (m) => {
        switch (m.type) {
            case 'load': {
                const t0 = now();
                const anchored = m.anchor !== undefined && Number.isFinite(m.anchor) ? m.anchor : null;
                const heard = kept && anchored !== null && anchored < kept.until ? kept : p ? { plan: p, offset } : null;
                kept = null;
                p = planOf(m.code, m.env, { ...(resolve ? { resolve } : {}), ...(m.locked ? { locked: m.locked } : {}) });
                if (!heard || anchored === null)
                    offset = 0;
                else {
                    const bar = keepBar(heard.plan, p, anchored + heard.offset);
                    if (bar) {
                        const until = bar.line - heard.offset;
                        kept = { plan: heard.plan, offset: heard.offset, until };
                        offset = bar.at - until;
                    }
                    else
                        offset = keepBeat(heard.plan, p, anchored + heard.offset) - anchored;
                }
                return { type: 'loaded', ms: now() - t0, ok: p.result.ok };
            }
            case 'window': {
                const t0 = now();
                const to = m.from + m.length;
                const window = !p
                    ? emptyWindow(m.from, m.length)
                    : kept && m.from < kept.until
                        ? to <= kept.until
                            ? shiftedWindow(kept.plan, m.from, m.length, m.begins, kept.offset)
                            : joined(shiftedWindow(kept.plan, m.from, kept.until - m.from, m.begins, kept.offset), shiftedWindow(p, kept.until, to - kept.until, m.begins, offset))
                        : shiftedWindow(p, m.from, m.length, m.begins, offset);
                return { type: 'window', id: m.id, window, ms: now() - t0 };
            }
            case 'grab':
                if (kept && m.t < kept.until)
                    grabIn(kept.plan, m.cell, m.t + kept.offset, m.speed);
                else if (p)
                    grabIn(p, m.cell, m.t + offset, m.speed);
                return null;
            case 'reset':
                if (kept)
                    resetPhysics(kept.plan.result);
                if (p)
                    resetPhysics(p.result);
                return null;
        }
    };
}
