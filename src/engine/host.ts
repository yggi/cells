/**
 * The engine as a message handler: the half of the engine protocol that holds the piece (compiled, planned,
 * its physics) and answers for windows of it. The worker (audio/engine.worker.ts) is a shell around it;
 * tests drive it directly. Messages are plain data (structured clone), so the same host runs in a worker,
 * in this thread, or in node.
 *
 *   load   { code, env }                 compile and plan the piece (as the app does: code shifts, offs)
 *   window { id, from, length }          → { type: 'window', id, window }   (engine/schedule.ts)
 *   grab   { cell, t, speed }            a hand on a physical cell at transport second t (null lets go)
 *   reset                                every hand forgotten (Reset)
 *
 * Replies come in the order asked; a window asked after a load is of the piece loaded.
 */
import { codeShifts, compileSource, type Env } from './compile';
import { grab, resetPhysics } from './physics';
import { physicsOf, plan, type Plan } from './realize';
import { windowAt, type Window } from './schedule';

export type ToEngine =
  | { type: 'load'; code: string; env?: Env }
  | { type: 'window'; id: number; from: number; length: number }
  | { type: 'grab'; cell: string; t: number; speed: number | null }
  | { type: 'reset' };

export type FromEngine = { type: 'window'; id: number; window: Window; ms: number } | { type: 'loaded'; ms: number; ok: boolean };

/** The plan the app plays for a compiled piece: its shifts and switches as written. */
export function planOf(code: string, env?: Env): Plan {
  const r = compileSource(code, env);
  return plan(r, codeShifts(r), r.off);
}

/** A hand on a physical cell of a plan, at transport second t (null lets go). */
export function grabIn(p: Plan, cell: string, t: number, speed: number | null): void {
  const w = physicsOf(p.result, p.statics, cell);
  if (w) grab(p.result, w, t, speed);
}

export const emptyWindow = (from: number, length: number): Window => ({ from, to: from + length, events: [], tapes: [] });

export function createHost(now: () => number = () => performance.now()) {
  let p: Plan | null = null;
  return (m: ToEngine): FromEngine | null => {
    switch (m.type) {
      case 'load': {
        const t0 = now();
        p = planOf(m.code, m.env);
        return { type: 'loaded', ms: now() - t0, ok: p.result.ok };
      }
      case 'window': {
        const t0 = now();
        const window = p ? windowAt(p, m.from, m.length) : emptyWindow(m.from, m.length);
        return { type: 'window', id: m.id, window, ms: now() - t0 };
      }
      case 'grab':
        if (p) grabIn(p, m.cell, m.t, m.speed);
        return null;
      case 'reset':
        if (p) resetPhysics(p.result);
        return null;
    }
  };
}
