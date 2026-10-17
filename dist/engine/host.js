import { compileSource } from "./compile.js";
import { codeShifts } from "./program.js";
import { grab, resetPhysics } from "./physics.js";
import { physicsOf } from "./clocking.js";
import { plan } from "./realize.js";
import { windowAt } from "./schedule.js";
export function planOf(code, env) {
    const r = compileSource(code, env);
    return plan(r, codeShifts(r), r.off);
}
export function grabIn(p, cell, t, speed) {
    const w = physicsOf(p.result, p.statics, cell);
    if (w)
        grab(p.result, w, t, speed);
}
export const emptyWindow = (from, length) => ({ from, to: from + length, events: [], tapes: [] });
export function createHost(now = () => performance.now()) {
    let p = null;
    return (m) => {
        switch (m.type) {
            case 'load': {
                const t0 = now();
                p = planOf(m.code, m.env);
                return { type: 'loaded', ms: now() - t0, ok: p.result.ok };
            }
            case 'window': {
                const t0 = now();
                const window = p ? windowAt(p, m.from, m.length, { begins: m.begins }) : emptyWindow(m.from, m.length);
                return { type: 'window', id: m.id, window, ms: now() - t0 };
            }
            case 'grab':
                if (p)
                    grabIn(p, m.cell, m.t, m.speed);
                return null;
            case 'reset':
                if (p)
                    resetPhysics(p.result);
                return null;
        }
    };
}
