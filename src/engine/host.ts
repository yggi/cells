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
 *                                        far into the new piece; without, the new piece is asked from its own start.
 *                                        A load that places the bar otherwise (a swing's share or a bend's depth
 *                                        moved) waits for the bar line (#701, `keepBar`): the old piece answers up
 *                                        to the next one, the new piece from there, anchored at it
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
import { keepBar, keepBeat } from './keepbeat';

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

/** Two windows that meet, one after the other, as one: their notes, each tape's speeds and the MIDI clock's ticks in turn. */
function joined(a: Window, b: Window): Window {
  const tapes = [...a.tapes];
  for (const t of b.tapes) {
    const i = tapes.findIndex((u) => u.tape === t.tape);
    if (i < 0) tapes.push(t);
    else tapes[i] = { tape: t.tape, points: [...tapes[i]!.points.filter((x) => x.at < b.from), ...t.points] };
  }
  const x = a.clock;
  const y = b.clock;
  const clock = x && y ? (x.at.length ? { first: x.first, at: [...x.at, ...y.at], before: x.before } : y) : (x ?? y ?? null);
  return { from: a.from, to: b.to, events: [...a.events, ...b.events], tapes, clock };
}

/** What a host is made with: the resolver its pieces' `from` lines read through (it can't cross `postMessage`, so isn't in `load`). */
export interface HostOptions {
  readonly resolve?: Resolve;
}

export function createHost(now: () => number = () => performance.now(), { resolve }: HostOptions = {}) {
  let p: Plan | null = null;
  // (the piece's own second at each second asked, less that: 0 unless a load was anchored, #56)
  let offset = 0;
  // (the piece loaded before, while it keeps its bar: it answers every second asked before `until`, #701)
  let kept: { plan: Plan; offset: number; until: number } | null = null;
  return (m: ToEngine): FromEngine | null => {
    switch (m.type) {
      case 'load': {
        const t0 = now();
        const anchored = m.anchor !== undefined && Number.isFinite(m.anchor) ? m.anchor : null;
        // (the piece heard at the anchor: the one still keeping its bar there, else the last loaded)
        const heard = kept && anchored !== null && anchored < kept.until ? kept : p ? { plan: p, offset } : null;
        kept = null;
        p = planOf(m.code, m.env, { ...(resolve ? { resolve } : {}), ...(m.locked ? { locked: m.locked } : {}) });
        if (!heard || anchored === null) offset = 0;
        else {
          const bar = keepBar(heard.plan, p, anchored + heard.offset);
          if (bar) {
            const until = bar.line - heard.offset;
            kept = { plan: heard.plan, offset: heard.offset, until };
            offset = bar.at - until;
          } else offset = keepBeat(heard.plan, p, anchored + heard.offset) - anchored;
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
        if (kept && m.t < kept.until) grabIn(kept.plan, m.cell, m.t + kept.offset, m.speed);
        else if (p) grabIn(p, m.cell, m.t + offset, m.speed);
        return null;
      case 'reset':
        if (kept) resetPhysics(kept.plan.result);
        if (p) resetPhysics(p.result);
        return null;
    }
  };
}
