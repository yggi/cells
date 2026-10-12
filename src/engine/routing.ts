/**
 * What takes part in the sound, as the nodes and edges of the graph (graph.ts ids): one model
 * for the graph's states, so a node and its edges can't disagree (#11).
 *
 * An output's route is what its notes need and where its sound goes:
 *  - notes: its braid and the tables it reads through, the step= chain and clock that move it, what
 *    moves its voice (pitch and volume streams, the envelope, parameter cells, FM modulators), a kit's
 *    members, a note tape's write and play;
 *  - sound: voice → instruments → mix → part → table of parts → selector → sound card, exactly the
 *    mixes the output goes through (compile's `via`, `through`), so a voice in two mixes lights only
 *    the one its notes take.
 * Sound tapes and resonators keep sound (a tape's loop, a body's ring): fed by what reaches them,
 * they pass it on wherever their heads and mixes go. Only what reaches a sound card or a MIDI card
 * (its notes, sent: flows.ts `midi`) counts.
 *
 * `routing` is everything that can play (the same test the plan uses, `outputPlays`); `live/
 * liveAt` is what does now (the same gates the scheduler uses: laps, what a selector picks), within
 * the routing. `stateOf` turns both into what the graph draws.
 */
import { leaves } from './subseq';
import { isMidiCard, ROOT, type CompileResult, type Output, type ResolvedCell } from './program';
import { tableChain } from './helix';
import { cellId, clockTapId, edgeId, isJunction, stepEdgeId } from './ids';
import { chainMuted, outputPlays } from './realize';
import type { GraphModel } from './graph';
import { flows } from './flows';

export interface Routing {
  /** Node ids (`cell:name`). */
  readonly nodes: ReadonlySet<string>;
  /** Edge ids, as written (graph.ts: before petals redraw them; see `drawn`). */
  readonly edges: ReadonlySet<string>;
}

/** A node's or an edge's state: switched off, not part of anything that sounds, part of it (stopped), not now (playing), now. */
export type State = 'off' | 'unrouted' | 'on' | 'idle' | 'live';

/** What keeps sound: a sound tape (its loop), a resonator (its ring). */
const keeps = (result: CompileResult, name: string) => result.tapes.some((t) => t.name === name) || typeof result.cells.get(name)?.params.body === 'string';

/** What its mixes name: the voice, or a kit's stream (&drums, read through the kit); a gate names the kit it plays. */
const sourceOf = (result: CompileResult, o: Output) => (o.kit && result.cells.get(o.cell)?.over === o.voice ? o.cell : o.voice);

const playable = (c: ResolvedCell) => c.units.some((u) => leaves(u.atom).some((a) => a.kind === 'note' || a.kind === 'chord' || a.kind === 'choice'));

/** A routing being gathered: nodes and edges by name, nothing switched off. */
export class RouteAcc {
  readonly nodes = new Set<string>();
  readonly edges = new Set<string>();
  constructor(
    readonly result: CompileResult,
    readonly muted: ReadonlySet<string>,
  ) {}
  off(name: string) {
    return this.muted.has(cellId(name));
  }
  node(name: string) {
    if (!this.off(name)) this.nodes.add(cellId(name));
  }
  /** An edge (and its ends), unless an end is switched off. */
  edge(from: string, to: string, id = edgeId(cellId(from), cellId(to))) {
    if (this.off(from) || this.off(to) || !this.result.cells.has(from) || !this.result.cells.has(to)) return;
    this.nodes.add(cellId(from)).add(cellId(to));
    this.edges.add(id);
  }
  /** A table and every table below it; `from` reads it through over= (drawn as an edge). */
  tables(table: string, from?: string) {
    const chain = tableChain(this.result, table);
    if (from && this.result.cells.get(from)?.over === table && !this.off(table)) this.edge(from, table);
    chain.forEach((t, i) => {
      this.node(t);
      const next = chain[i + 1];
      if (next && this.result.cells.get(t)?.over === next) this.edge(t, next);
      // (a table that turns: what turns it)
      if (this.result.cells.get(t)?.step) this.clock(t);
    });
  }
  private clocked = new Set<string>();
  /** What moves a cell in time: its step= chain, and its clock's tables. */
  clock(name: string) {
    if (this.clocked.has(name)) return;
    this.clocked.add(name);
    let at: string | null = name;
    for (let g = 0; at && g < 64; g++) {
      const st: ResolvedCell['step'] = this.result.cells.get(at)?.step ?? null;
      if (!st || this.off(st.driver)) break;
      // (a tap's clock is its table's bus, decision 016: the table reads the tap, the bus clocks the table)
      const table = this.result.taps?.get(at);
      if (table && !this.off(table)) {
        this.edge(table, at);
        this.edge(table, st.driver, stepEdgeId(cellId(table), cellId(st.driver)));
      } else if (!table) this.edge(at, st.driver, stepEdgeId(cellId(at), cellId(st.driver)));
      at = st.driver;
    }
    const clock = this.result.cells.get(name)?.clock;
    if (clock && !this.off(clock)) this.tables(clock);
    this.timed(name);
  }
  /** The clocks its parameters take their times from (delaytime=&bar*4/3, a tape's length=, a head's at=). */
  timed(name: string) {
    for (const [key, k] of Object.entries(this.result.cells.get(name)?.paramClocks ?? {}))
      if (!this.off(k.driver)) {
        this.edge(name, k.driver, clockTapId(cellId(name), cellId(k.driver), key));
        this.clock(k.driver);
      }
  }
  /**
   * A braid, all the way down: the cells it splices and the tables their notes resolve through
   * (as plan's flatten: a cell whose tables are switched off plays nothing). A table is credited to
   * the cell that lends it (`from`, its over=) when a note resolves through it. True if anything plays.
   */
  braid(name: string, ctx: string, from: string | null = null, seen = new Set<string>()): boolean {
    const cell = this.result.cells.get(name);
    if (!cell || this.off(name)) return false;
    const table = cell.root ? name : (cell.over ?? ctx);
    const lender = cell.root ? null : cell.over ? name : from;
    const key = `${name}|${table}`;
    if (seen.has(key)) return false;
    seen.add(key);
    let plays = false;
    if (playable(cell)) {
      if (chainMuted(this.result, table, this.muted)) return false;
      this.tables(table, lender ?? undefined);
      plays = true;
    }
    this.node(name);
    for (const child of cell.children.keys()) {
      if (this.off(child)) continue;
      this.edge(name, child);
      if (this.braid(child, table, lender, seen)) plays = true;
    }
    return plays;
  }
  /** A cell that moves something (a pitch or volume stream, a parameter): its braid and its clock. */
  stream(name: string) {
    const c = this.result.cells.get(name);
    if (!c || this.off(name)) return;
    this.braid(name, c.over ?? c.context);
    this.clock(name);
  }
  /** What moves a voice besides its notes: parameter cells, FM modulators (and theirs). */
  voice(name: string, seen = new Set<string>()) {
    const v = this.result.cells.get(name);
    if (!v || seen.has(name) || this.off(name)) return;
    seen.add(name);
    this.node(name);
    // its own volume and pitch (env=, pitch=: on every note it plays; drawn as its petals, no edge)
    for (const own of [v.env, v.pitch]) if (own && !this.off(own)) this.stream(own);
    // its wave's table (map=&curve: its values looked up in it, every cycle)
    if (v.map?.kind === 'table' && !this.off(v.map.table)) {
      this.edge(v.map.table, name, clockTapId(cellId(v.map.table), cellId(name), 'map'));
      this.stream(v.map.table);
    }
    this.timed(name);
    for (const pc of Object.values(v.paramCells ?? {}))
      for (const f of pc.factors)
        if (!this.off(f)) {
          this.edge(f, name);
          this.stream(f);
        }
    const fm = v.params.fm;
    if (typeof fm === 'string' && this.result.cells.has(fm) && !this.off(fm)) {
      this.edge(fm, name);
      this.stream(fm);
      this.voice(fm, seen);
    }
  }
}

/**
 * How an output's notes are drawn into the route: all of its braid (what can play), or only what
 * plays now (the live view's descent). For a kit, which of its members it reaches.
 */
export interface NotesOf {
  braid(acc: RouteAcc, o: Output): void;
  members(o: Output): readonly string[];
}

/** The way an output's sound goes: the mixes it goes through, and the edges between them. */
function soundOf(acc: RouteAcc, o: Output) {
  const on = new Set([sourceOf(acc.result, o), ...o.through, ...o.via, ...o.select.flatMap((x) => [x.cell, acc.result.cells.get(x.cell)!.over!, x.part])]);
  const from = flows(acc.result).from;
  for (const n of on) {
    acc.node(n);
    for (const f of from.get(n) ?? []) if (on.has(f.to)) acc.edge(f.from, f.to, f.id);
  }
}

/** An output's notes: what they need. */
function notesOf(acc: RouteAcc, o: Output, how: NotesOf) {
  // a drone (a voice alone, decision 028): no notes to start, only what moves it
  if (o.drone) {
    for (const m of [...o.mods, ...o.levels])
      if (!acc.off(m.cell)) {
        acc.edge(m.cell, o.voice);
        acc.stream(m.cell);
      }
    if (o.envelopeCell) acc.edge(o.envelopeCell, o.voice);
    acc.voice(o.voice);
    return;
  }
  how.braid(acc, o);
  acc.clock(o.cell);
  // played off a tape: its source onto the tape, the tape under the head, the head into the voice (and what moves the tape)
  if (o.tape) {
    acc.edge(o.cell, o.tape.tape);
    acc.edge(o.tape.tape, o.tape.head);
    acc.edge(o.tape.head, o.voice);
    acc.clock(o.tape.tape);
    acc.timed(o.tape.head);
  } else acc.edge(o.cell, o.voice);
  for (const m of [...o.mods, ...o.levels])
    if (!acc.off(m.cell)) {
      acc.edge(m.cell, o.voice);
      acc.stream(m.cell);
    }
  if (o.envelopeCell) acc.edge(o.envelopeCell, o.voice);
  if (o.kit)
    for (const k of how.members(o))
      if (!acc.off(k)) {
        acc.edge(o.voice, k);
        acc.voice(k);
      }
  acc.voice(o.voice);
  // picked by a selector: the selector's own steps (and the score they're spliced from) and its clock
  for (const x of o.select) acc.stream(x.cell);
}

/**
 * The routing of some outputs: their sound and their notes, the tapes and bodies their sound
 * reaches (and where those go), and only what reaches a sound card. `keeping`: which tapes and
 * bodies hold sound of their own (a hand strikes a body; a tape plays what's on it).
 */
function route(result: CompileResult, muted: ReadonlySet<string>, outs: readonly Output[], how: NotesOf, keeping: (name: string) => boolean): Routing {
  const acc = new RouteAcc(result, muted);
  const flowsFrom = flows(result).from;
  for (const o of outs) soundOf(acc, o);
  // what keeps sound (tapes, bodies): fed by a mix the outputs reach, struck by one, or holding its own;
  // from there, wherever it goes
  const queue: string[] = [];
  for (const c of result.cells.values()) if (keeps(result, c.name) && !acc.off(c.name) && (keeping(c.name) || acc.nodes.has(cellId(c.name)))) queue.push(c.name);
  for (const n of [...acc.nodes])
    for (const f of flowsFrom.get(n.slice('cell:'.length)) ?? [])
      if (keeps(result, f.to) && !acc.off(f.to)) {
        acc.edge(f.from, f.to, f.id);
        queue.push(f.to);
      }
  for (const done = new Set<string>(); queue.length;) {
    const n = queue.pop()!;
    if (done.has(n)) continue;
    done.add(n);
    for (const f of flowsFrom.get(n) ?? [])
      if (!acc.off(f.to)) {
        acc.edge(f.from, f.to, f.id);
        queue.push(f.to);
      }
  }
  // only what reaches a sound card, or a MIDI card (sent)
  const heard = new Set<string>();
  for (const c of result.cells.values()) if ((c.sink || isMidiCard(c)) && acc.nodes.has(cellId(c.name))) heard.add(c.name);
  for (let grew = true; grew;) {
    grew = false;
    for (const [from, fs] of flowsFrom)
      if (!heard.has(from) && acc.nodes.has(cellId(from)) && fs.some((f) => heard.has(f.to) && acc.edges.has(f.id))) {
        heard.add(from);
        grew = true;
      }
  }
  const sound = new RouteAcc(result, muted);
  for (const n of heard) sound.node(n);
  for (const [from, fs] of flowsFrom) for (const f of fs) if (heard.has(from) && heard.has(f.to) && acc.edges.has(f.id)) sound.edges.add(f.id);
  // the notes of what's heard, and what moves the tapes that are
  for (const o of outs) if (heard.has(sourceOf(result, o))) notesOf(sound, o, how);
  for (const n of heard) if (keeps(result, n)) sound.clock(n);
  // a read head's at= clock, as a tape's length=: a tap of the clock (the head sounds, not a tape of notes: notesOf has no say)
  for (const n of heard) sound.timed(n);
  // an oscilloscope watches: on when what it watches is
  for (const c of result.cells.values())
    if (typeof c.params.scope === 'string' && !sound.off(c.name)) for (const k of c.children.keys()) if (sound.nodes.has(cellId(k))) sound.edge(c.name, k);
  return sound;
}

/** Does it play at all (anything in its braid, through tables that are on)? */
function plays(result: CompileResult, muted: ReadonlySet<string>, o: Output): boolean {
  return !!o.drone || new RouteAcc(result, muted).braid(o.cell, ROOT);
}

const routingCache = new WeakMap<CompileResult, Map<string, Routing>>();

/** Everything that can sound, with what's switched off left out. */
export function routing(result: CompileResult, muted: ReadonlySet<string>): Routing {
  const key = [...muted].sort().join(' ');
  let byMuted = routingCache.get(result);
  if (!byMuted) routingCache.set(result, (byMuted = new Map()));
  const hit = byMuted.get(key);
  if (hit) return hit;
  const outs = result.outputs.filter((o) => outputPlays(result, o, muted) && plays(result, muted, o));
  const all: NotesOf = {
    braid: (acc, o) => void acc.braid(o.cell, ROOT),
    members: (o) => [...(result.cells.get(o.voice)?.children.keys() ?? [])],
  };
  // (a body can always be struck by hand; a tape plays what's on it)
  const r = route(result, muted, outs, all, (n) => typeof result.cells.get(n)?.params.body === 'string');
  byMuted.set(key, r);
  return r;
}

/**
 * What sounds now, given the outputs that play now and how each one's notes go now. Within the
 * routing: what the routing leaves out is never live.
 */
export function liveRouting(result: CompileResult, muted: ReadonlySet<string>, outs: readonly Output[], how: NotesOf): Routing {
  const all = routing(result, muted);
  // (the tapes and bodies that are part of the sound go on sounding: what's on them, what rings)
  const r = route(result, muted, outs, how, (n) => all.nodes.has(cellId(n)));
  return { nodes: new Set([...r.nodes].filter((n) => all.nodes.has(n))), edges: new Set([...r.edges].filter((e) => all.edges.has(e))) };
}

const drawnCache = new WeakMap<Routing, WeakMap<GraphModel, Routing>>();

/**
 * A routing in the graph as drawn: an edge a petal redraws is the edge it's drawn as; one that isn't drawn, left out.
 * A wire at a product's junction is routed when the written pairs it stands for are (graph.ts: `routes`), and the
 * junction with it.
 */
export function drawn(model: GraphModel, r: Routing): Routing {
  let byModel = drawnCache.get(r);
  if (!byModel) drawnCache.set(r, (byModel = new WeakMap()));
  let hit = byModel.get(model);
  if (!hit) {
    const shown = new Set(model.edges.map((e) => e.id));
    const edges = new Set<string>();
    for (const id of r.edges) {
      const to = model.alias.has(id) ? model.alias.get(id) : id;
      // (an edge to a cell that isn't drawn — the implicit grid — isn't either)
      if (to && shown.has(to)) edges.add(to);
    }
    let nodes = r.nodes;
    for (const e of model.edges)
      if (e.routes?.every((any) => any.some((id) => r.edges.has(id)))) {
        edges.add(e.id);
        for (const end of [e.source, e.target])
          if (isJunction(end) && !nodes.has(end)) {
            if (nodes === r.nodes) nodes = new Set(r.nodes);
            (nodes as Set<string>).add(end);
          }
      }
    byModel.set(model, (hit = { nodes, edges }));
  }
  return hit;
}

/** What a node (by id) is drawn as. `live`: null at rest (stopped): nothing is dimmed, whatever sounds. */
export function nodeStateOf(id: string, muted: ReadonlySet<string>, routed: Routing, live: Routing | null): State {
  if (muted.has(id)) return 'off';
  if (!live) return 'on';
  if (!routed.nodes.has(id)) return 'unrouted';
  return live.nodes.has(id) ? 'live' : 'idle';
}

/** What an edge is drawn as: off with either end; otherwise as the routing says (drawn ids: see `drawn`). */
export function edgeStateOf(
  e: { readonly id: string; readonly source: string; readonly target: string },
  muted: ReadonlySet<string>,
  routed: Routing,
  live: Routing | null,
): State {
  if (muted.has(e.source) || muted.has(e.target)) return 'off';
  if (!live) return 'on';
  if (!routed.edges.has(e.id)) return 'unrouted';
  return live.edges.has(e.id) ? 'live' : 'idle';
}
