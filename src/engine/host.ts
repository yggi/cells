/**
 * The engine as a message handler: the half of the engine protocol that holds the piece (compiled, planned,
 * its physics) and answers for windows of it. The worker (audio/engine.worker.ts) is a shell around it;
 * tests drive it directly. Messages are plain data (structured clone), so the same host runs in a worker,
 * in this thread, or in node.
 *
 *   load   { code, env, locked, anchor } compile and plan the piece (as the app does: code shifts, offs); its `from` lines
 *                                        read through the host's resolver (a function: given when the host is made) and
 *                                        the lockfile's hashes (`locked`, plain data), decision 054. With `anchor`, a
 *                                        second of the piece loaded before (as windows are asked: the first the new
 *                                        piece will be asked for), the new piece goes on from where the old one was
 *                                        there, its beat kept (#56, `keepbeat.ts`): every second asked after is that
 *                                        far into the new piece; without, the new piece is asked from its own start
 *   window { id, from, length, begins }  → { type: 'window', id, window }   (engine/schedule.ts; begins: where play began)
 *   grab   { cell, t, speed }            a hand on a physical cell at transport second t (null lets go)
 *   reset                                every hand forgotten (Reset)
 *
 * Replies come in the order asked; a window asked after a load is of the piece loaded.
 */
import { compileSource } from './compile';
import { codeShifts, type CompileOptions, type Env, type Locked, type Resolve } from './program';
import { grab, resetPhysics } from './physics';
import { physicsOf } from './clocking';
import { plan, type Plan } from './realize';
import { retime, windowAt, type Window } from './schedule';
import { keepBeat } from './keepbeat';

export type ToEngine =
  | { type: 'load'; code: string; env?: Env; locked?: readonly Locked[]; anchor?: number }
  | { type: 'window'; id: number; from: number; length: number; begins?: number }
  | { type: 'grab'; cell: string; t: number; speed: number | null }
  | { type: 'reset' };

export type FromEngine = { type: 'window'; id: number; window: Window; ms: number } | { type: 'loaded'; ms: number; ok: boolean };

/** The plan the app plays for a compiled piece: its shifts and switches as written; its `from` lines read through `options`. */
export function planOf(code: string, env?: Env, options?: CompileOptions): Plan {
  const r = compileSource(code, env, options);
  return plan(r, codeShifts(r), r.off);
}

/** A hand on a physical cell of a plan, at transport second t (null lets go). */
export function grabIn(p: Plan, cell: string, t: number, speed: number | null): void {
  const w = physicsOf(p.result, p.statics, cell);
  if (w) grab(p.result, w, t, speed);
}

export const emptyWindow = (from: number, length: number): Window => ({ from, to: from + length, events: [], tapes: [] });

/** A window of a plan asked `offset` seconds before its own: worked out there, its times put back on the seconds asked. */
function shiftedWindow(p: Plan, from: number, length: number, begins: number | undefined, offset: number): Window {
  if (offset === 0) return windowAt(p, from, length, { begins });
  const w = windowAt(p, from + offset, length, { begins: (begins ?? 0) + offset });
  return { from, to: from + length, ...retime(w, from, 1) };
}

/** What a host is made with: the resolver its pieces' `from` lines read through (it can't cross `postMessage`, so isn't in `load`). */
export interface HostOptions {
  readonly resolve?: Resolve;
}

export function createHost(now: () => number = () => performance.now(), { resolve }: HostOptions = {}) {
  let p: Plan | null = null;
  // (the piece's own second at each second asked, less that: 0 unless a load was anchored, #56)
  let offset = 0;
  return (m: ToEngine): FromEngine | null => {
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
        if (p) grabIn(p, m.cell, m.t + offset, m.speed);
        return null;
      case 'reset':
        if (p) resetPhysics(p.result);
        return null;
    }
  };
}
