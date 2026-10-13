/**
 * The live view: what plays at a moment, for drawing. Per cell, where its playhead is and which
 * table entries are looked up (the glyphs); per node and edge, what sounds now — the routing of
 * the outputs that play now (routing.ts), so it is always within what the graph draws as routed.
 * The gates are the scheduler's: an output plays until its end (laps=), and while every selector
 * it goes through picks it.
 */
import { ROOT, pickedUnits, type CompileResult, type Output, type ResolvedCell, type Shifts } from './program';
import { resolveIn } from './helix';
import { clocking, playedCells, selects, shiftsAt } from './clocking';
import { stepsOf, unitsFor } from './flatten';
import { slots, type Slot } from './subseq';
import type { Atom } from './ast';
import { cellId, edgeId } from './ids';
import { droneEnd, endOf, eventsBetween, kitPickAt, outputPlays, picksNow, plan, voiceFor, type Plan } from './realize';
import { liveRouting, type NotesOf, type RouteAcc } from './routing';
import { mod } from '../theory/modes';

const EPS = 1e-9;

// (a oneshot drum rings past its step: what sounds now is asked of the plan, made once a piece)
const plans = new WeakMap<CompileResult, WeakMap<Shifts, WeakMap<ReadonlySet<string>, Plan>>>();
function planOf(result: CompileResult, statics: Shifts, muted: ReadonlySet<string>): Plan {
  let a = plans.get(result);
  if (!a) plans.set(result, (a = new WeakMap()));
  let b = a.get(statics);
  if (!b) a.set(statics, (b = new WeakMap()));
  let p = b.get(muted);
  if (!p) b.set(muted, (p = plan(result, statics, muted)));
  return p;
}
/** The longest a oneshot voice played through a kit rings (its envelope's attack and decay), 0: none. */
function oneshotRing(result: CompileResult): number {
  let ring = 0;
  for (const o of result.outputs)
    if (o.kit)
      for (const u of result.cells.get(o.voice)?.units ?? []) {
        const v = u.atom.kind === 'ref' ? result.cells.get(u.atom.name) : undefined;
        const env = v?.oneshot && v.env ? result.cells.get(v.env) : undefined;
        const n = env?.units.map((x) => (x.atom.kind === 'note' ? x.atom.value : 0)) ?? [];
        if (n.length >= 2) ring = Math.max(ring, n[0] + n[1]);
      }
  return ring;
}

interface LiveCell {
  /** Playhead inside the instance being played, in this cell's steps (braids). */
  local: number | null;
  /** Table entries being looked up right now. */
  entries: Set<number>;
}

export interface LiveState {
  readonly seconds: number;
  /** Shifts as they stand now (stepped tables turned). */
  readonly shifts: Shifts;
  /** Playheads and lit entries, per cell name. */
  readonly cells: ReadonlyMap<string, LiveCell>;
  /** What sounds now: node ids and (written) edge ids, within routing(). */
  readonly nodes: ReadonlySet<string>;
  readonly edges: ReadonlySet<string>;
  /** Voices played now (node ids). */
  readonly voices: ReadonlySet<string>;
  /** Bar count per clocked meter (0-based). */
  readonly bars: ReadonlyMap<string, number>;
  /** Where each clock is in its cycle, in beats (0 … beats, fractional): a meter's wheel turns by it. */
  readonly beatAt: ReadonlyMap<string, number>;
  /** How far each clock has come, in its steps (from the start): a cell it steps at a rate is that many times as far. */
  readonly stepAt: ReadonlyMap<string, number>;
  /** How far each clocked cell is through its current step, 0…1 (drives the pulses on edges). */
  readonly phases: ReadonlyMap<string, number>;
}

/**
 * The way down a braid to the step under the playhead: by name, the cells it splices (ref edges)
 * and the tables its note resolves through (over edges; from: null, a table inherited, no edge).
 */
type Descent = { from: string | null; to: string; table?: boolean }[];

export function liveAt(result: CompileResult, statics: Shifts, muted: ReadonlySet<string>, seconds: number): LiveState {
  const cells = new Map<string, LiveCell>();
  const voices = new Set<string>();
  const bars = new Map<string, number>();
  const beatAt = new Map<string, number>();
  const stepAt = new Map<string, number>();
  const played = playedCells(result);
  const now = shiftsAt(result, statics, seconds, played);
  const clk = clocking(result, statics, seconds);
  const mark = (name: string): LiveCell => {
    let c = cells.get(name);
    if (!c) cells.set(name, (c = { local: null, entries: new Set() }));
    return c;
  };
  // a note looked up: every table it passes through lights the entry it used; `from` reads the
  // first table through over= (else it's inherited: no edge of its own)
  const markChain = (way: Descent, from: string | null, table: string, tableShift: number, value: number, alter: number) => {
    let prev = from;
    for (const p of resolveIn(result, table, tableShift, value, alter, now).path) {
      mark(p.cell).entries.add(p.index);
      way.push({ from: prev && result.cells.get(prev)?.over === p.cell ? prev : null, to: p.cell, table: true });
      prev = p.cell;
    }
  };

  // selectors: where in their sections the playhead is, and which parts they pick now (until they end)
  for (const c of result.cells.values()) {
    if (!c.clock || !selects(result, c.name)) continue;
    const period = Math.max(1, stepsOf(result, c.name, null));
    const at = clk.stepOf(c.clock) * c.rate;
    if (c.laps && at >= c.laps * period) continue;
    const live = mark(c.name);
    live.local = mod(at, period);
    for (const k of picksNow(result, statics, c.name, seconds)) live.entries.add(k);
  }

  // what oscillates (loop=, played by nothing, moving something): where in its cycle it is
  for (const c of result.cells.values()) {
    if (!c.loops || !c.clock || c.voice || c.mix || c.sink || played.has(c.name)) continue;
    const period = Math.max(1, stepsOf(result, c.name, null));
    const live = mark(c.name);
    if (live.local === null) live.local = mod(clk.stepOf(c.clock) * c.rate, period);
  }

  // clocks: the beat under the playhead, and the bar count
  for (const name of result.clocks.keys()) {
    const beat = Math.floor(clk.stepOf(name) + EPS);
    const k = clk.map(name).beats;
    mark(name).entries.add(mod(beat, k));
    bars.set(name, Math.floor(beat / k));
    beatAt.set(name, mod(clk.stepOf(name), k));
    stepAt.set(name, clk.stepOf(name));
  }

  const active: Output[] = [];
  const ways = new Map<Output, Descent>();
  const members = new Map<Output, string[]>();
  for (const o of result.outputs) {
    if (!outputPlays(result, o, muted)) continue;
    // after its end, nothing; picked by selectors, only while they pick it (a drone: until the piece ends)
    if (seconds >= (o.drone ? droneEnd(result, statics) : endOf(result, statics, o))) continue;
    if (o.select.length && !o.select.every((x) => picksNow(result, statics, x.cell, seconds).has(x.entry))) continue;
    active.push(o);
    const way: Descent = [];
    const hits: string[] = [];
    ways.set(o, way);
    members.set(o, hits);
    const top = result.cells.get(o.cell)!;
    voices.add(cellId(o.voice));
    mark(o.voice);
    for (const v of [...o.via, ...o.through]) if (!muted.has(cellId(v))) mark(v);
    for (const m of [...o.mods, ...o.levels]) {
      if (muted.has(cellId(m.cell))) continue;
      const mc = result.cells.get(m.cell)!;
      const live = mark(m.cell);
      if (mc.clock) live.local = mod(clk.stepOf(mc.clock) * mc.rate, Math.max(1, mc.steps));
    }
    // (a kit read held under a melody: the member it picks now, decision 029; the melody's braid is descended as any)
    const picked = o.kit && o.mods.some((m) => m.picks);
    if (picked) {
      const v = kitPickAt(planOf(result, statics, muted), o, seconds);
      if (v && !muted.has(cellId(v))) {
        mark(v);
        voices.add(cellId(v));
        hits.push(v);
      }
    }
    // (a drone, a voice alone: no braid of notes to descend, it holds its own pitch)
    if (o.drone) continue;

    // descend the braid to the step under the playhead
    let at = o.cell;
    let pick = o.pick;
    let extra = o.shift;
    let local = mod(clk.stepOf(top.clock!) * top.rate, Math.max(1, stepsOf(result, o.cell, o.pick)));
    let ctx = ROOT;
    let ctxShift = 0;
    let ctxFrom: string | null = null;
    for (let guard = 0; guard < 64; guard++) {
      if (muted.has(cellId(at))) break;
      const cell: ResolvedCell = result.cells.get(at)!;
      const table = cell.root ? at : (cell.over ?? ctx);
      const tShift = cell.root ? 0 : cell.over ? cell.overShift : ctxShift;
      const tFrom: string | null = cell.root ? null : cell.over ? at : ctxFrom;
      // a pick is drawn on the whole cell, as it is turned: offset the playhead to where the pick starts there
      const k = cell.units.length;
      const turn = statics(at);
      const first = pick ? (pickedUnits(k, pick, turn)?.[0] ?? 0) : 0;
      const offset = Array.from({ length: k ? mod(first - turn, k) : 0 }, (_, q) => cell.unitSteps[mod(q + turn, k)]).reduce((x, y) => x + y, 0);
      mark(at).local = pick ? offset + local : local;
      // what plays now: a step, or (inside a subsequence, a stack) each leaf of it sounding at this moment
      const unitOf = (x: Atom) => (x.kind === 'ref' ? stepsOf(result, x.name, x.pick) || 1 : 1);
      let base = 0;
      let now: Slot[] = [];
      for (const u of unitsFor(result, at, statics, pick, table, extra)) {
        const span = (u.atom.kind === 'seq' ? 1 : unitOf(u.atom)) * u.elongate * u.repeat;
        if (local >= base - EPS && local < base + span - EPS) {
          const from = base;
          now = slots([u], unitOf)
            .map((x) => ({ ...x, at: x.at + from }))
            .filter((x) => local >= x.at - EPS && local < x.at + x.dur - EPS);
          break;
        }
        base += span;
      }
      if (!now.length) break;
      for (const { atom: a } of now) {
        if (a.kind !== 'note' && a.kind !== 'chord') continue;
        if (o.kit && !picked) {
          // (a chord through a kit sounds each of its voices: [&bd, &hh] in a groove)
          for (const value of a.kind === 'note' ? [a.value] : a.notes) {
            const v = voiceFor(result, o, value);
            if (v) {
              mark(v.voice);
              voices.add(cellId(v.voice));
              hits.push(v.voice);
            }
          }
        } else {
          if (a.kind === 'note') markChain(way, tFrom, table, tShift, a.value, a.alter);
          else a.notes.forEach((v, j) => markChain(way, tFrom, table, tShift, v, a.alters[j]));
        }
      }
      // (a splice sounding now: followed down; one at a time)
      const hit = now.find((x) => x.atom.kind === 'ref');
      if (!hit) break;
      const a = hit.atom;
      if (a.kind !== 'ref') break;
      way.push({ from: at, to: a.name });
      const span = stepsOf(result, a.name, a.pick) || 1;
      local = Math.min(span - EPS, Math.max(0, ((local - hit.at) / hit.dur) * span));
      at = a.name;
      pick = a.pick;
      extra = a.shift;
      ctx = table;
      ctxShift = tShift;
      ctxFrom = tFrom;
    }
  }
  // a oneshot drum still ringing from an earlier step: live, and its output's member while it rings
  const ring = oneshotRing(result);
  if (ring > 0)
    for (const e of eventsBetween(planOf(result, statics, muted), Math.max(0, seconds - ring - EPS), seconds + EPS, true)) {
      if (!(e.at <= seconds && seconds < e.at + e.dur) || !result.cells.get(e.voice)?.oneshot) continue;
      const o = active.find((x) => x.id === e.output);
      if (!o) continue;
      mark(e.voice);
      voices.add(cellId(e.voice));
      const hits = members.get(o);
      if (hits && !hits.includes(e.voice)) hits.push(e.voice);
    }
  const phases = new Map<string, number>();
  for (const c of result.cells.values())
    if (c.clock && !c.voice) {
      const s = clk.stepOf(c.clock) * c.rate;
      phases.set(c.name, s - Math.floor(s));
    }
  const how: NotesOf = {
    braid: (acc: RouteAcc, o: Output) => {
      acc.node(o.cell);
      for (const e of ways.get(o) ?? []) {
        if (e.from) acc.edge(e.from, e.to, edgeId(cellId(e.from), cellId(e.to)));
        else acc.node(e.to);
        // (a table that turns: what turns it)
        if (e.table && result.cells.get(e.to)?.step) acc.clock(e.to);
      }
    },
    members: (o) => members.get(o) ?? [],
  };
  const { nodes, edges } = liveRouting(result, muted, active, how);
  return { seconds, shifts: now, cells, nodes, edges, voices, bars, beatAt, stepAt, phases };
}
