import { compileSource } from "./compile.js";
import { codeShifts } from "./program.js";
import { grab, resetPhysics } from "./physics.js";
import { physicsOf } from "./clocking.js";
import { plan } from "./realize.js";
import { retime, windowAt } from "./schedule.js";
import { keepBeat } from "./keepbeat.js";
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
export function createHost(now = () => performance.now(), { resolve } = {}) {
    let p = null;
    let offset = 0;
    return (m) => {
        switch (m.type) {
            case 'load': {
                const t0 = now();
                const before = p;
                p = planOf(m.code, m.env, { ...(resolve ? { resolve } : {}), ...(m.locked ? { locked: m.locked } : {}) });
                offset = before && m.anchor !== undefined && Number.isFinite(m.anchor) ? keepBeat(before, p, m.anchor + offset) - m.anchor : 0;
                return { type: 'loaded', ms: now() - t0, ok: p.result.ok };
            }
            case 'window': {
                const t0 = now();
                const window = p ? shiftedWindow(p, m.from, m.length, m.begins, offset) : emptyWindow(m.from, m.length);
                return { type: 'window', id: m.id, window, ms: now() - t0 };
            }
            case 'grab':
                if (p)
                    grabIn(p, m.cell, m.t + offset, m.speed);
                return null;
            case 'reset':
                if (p)
                    resetPhysics(p.result);
                return null;
        }
    };
}
