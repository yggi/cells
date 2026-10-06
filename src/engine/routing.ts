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
 * they pass it on wherever their heads and mixes go. Only what reaches a sound card counts.
 *
 * `routing` is everything that can sound (the same test the plan uses, `outputSounds`); `live/
 * liveAt` is what does now (the same gates the scheduler uses: laps, what a selector picks), within
 * the routing. `stateOf` turns both into what the graph draws.
 */
import { ROOT, tableChain, type CompileResult, type Output, type ResolvedCell } from './compile';
import { selects } from './clocking';
import { cellId, edgeId, stepEdgeId } from './ids';
import { chainMuted, outputSounds } from './realize';
import type { GraphModel } from './graph';

export interface Routing {
  /** Node ids (`cell:name`). */
  readonly nodes: ReadonlySet<string>;
  /** Edge ids, as written (graph.ts: before petals redraw them; see `drawn`). */
  readonly edges: ReadonlySet<string>;
}

/** A node's or an edge's state: switched off, not part of anything that sounds, part of it (stopped), not now (playing), now. */
export type State = 'off' | 'unrouted' | 'on' | 'idle' | 'live';

/** A way sound goes: from a voice (a mix, a tape head, a body) into what hears it. */
interface Flow {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}

const flowCache = new WeakMap<CompileResult, Map<string, Flow[]>>();

/** Every way sound can go, by where it comes from. */
function flowsOf(result: CompileResult): Map<string, Flow[]> {
  let hit = flowCache.get(result);
  if (hit) return hit;
  const out = new Map<string, Flow[]>();
  const add = (from: string, to: string, id = edgeId(cellId(from), cellId(to))) => {
    if (!result.cells.has(from) || !result.cells.has(to)) return;
    (out.get(from) ?? out.set(from, []).get(from)!).push({ id, from, to });
  };
  const soundTapes = new Set(result.tapes.map((t) => t.name));
  for (const c of result.cells.values()) {
    // into a mix (a voice, an instrument, a head, a body, a mix)
    for (const b of c.mix ?? []) add(b.voice.name, c.name);
    // a sound card's channels, named (&out &left &right, &out &song)
    if (c.sink) for (const k of c.children.keys()) add(k, c.name, edgeId(cellId(c.name), cellId(k)));
    // a selector: its parts into its table of parts, the table into it
    if (selects(result, c.name)) {
      add(c.over!, c.name, edgeId(cellId(c.name), cellId(c.over!)));
      for (const k of result.cells.get(c.over!)!.children.keys()) add(k, c.over!, edgeId(cellId(c.over!), cellId(k)));
    }
    // a sound tape: a mix onto it, the tape under each read head
    const p = c.params;
    if (typeof p.write === 'string' && soundTapes.has(c.name)) add(p.write, c.name);
    if (typeof p.play === 'string' && soundTapes.has(p.play)) add(p.play, c.name);
    // a body: a mix's sound drives it; coupled bodies ring into each other
    if (typeof p.excite === 'string') add(p.excite, c.name);
    if (typeof p.couple === 'string' && result.cells.has(p.couple)) {
      add(c.name, p.couple);
      add(p.couple, c.name, edgeId(cellId(c.name), cellId(p.couple)));
    }
  }
  flowCache.set(result, (hit = out));
  return hit;
}

/** What keeps sound: a sound tape (its loop), a resonator (its ring). */
const keeps = (result: CompileResult, name: string) => result.tapes.some((t) => t.name === name) || typeof result.cells.get(name)?.params.body === 'string';

/** What its mixes name: the voice, or a kit's stream (&drums, read through the kit). */
export const sourceOf = (o: Output) => (o.kit ? o.cell : o.voice);

const playable = (c: ResolvedCell) => c.units.some((u) => u.atom.kind === 'note' || u.atom.kind === 'chord' || u.atom.kind === 'choice');

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
      this.edge(at, st.driver, stepEdgeId(cellId(at), cellId(st.driver)));
      at = st.driver;
    }
    const clock = this.result.cells.get(name)?.clock;
    if (clock && !this.off(clock)) this.tables(clock);
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
  const on = new Set([sourceOf(o), ...o.through, ...o.via, ...o.select.flatMap((x) => [x.cell, acc.result.cells.get(x.cell)!.over!, x.part])]);
  const flows = flowsOf(acc.result);
  for (const n of on) {
    acc.node(n);
    for (const f of flows.get(n) ?? []) if (on.has(f.to)) acc.edge(f.from, f.to, f.id);
  }
}

/** An output's notes: what they need. */
function notesOf(acc: RouteAcc, o: Output, how: NotesOf) {
  how.braid(acc, o);
  acc.clock(o.cell);
  // played off a tape: its source onto the tape, the tape under the head, the head into the voice (and what moves the tape)
  if (o.tape) {
    acc.edge(o.cell, o.tape.tape);
    acc.edge(o.tape.tape, o.tape.head);
    acc.edge(o.tape.head, o.voice);
    acc.clock(o.tape.tape);
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
  const flows = flowsOf(result);
  for (const o of outs) soundOf(acc, o);
  // what keeps sound (tapes, bodies): fed by a mix the outputs reach, struck by one, or holding its own;
  // from there, wherever it goes
  const queue: string[] = [];
  for (const c of result.cells.values())
    if (keeps(result, c.name) && !acc.off(c.name) && (keeping(c.name) || acc.nodes.has(cellId(c.name)))) queue.push(c.name);
  for (const n of [...acc.nodes])
    for (const f of flows.get(n.slice('cell:'.length)) ?? [])
      if (keeps(result, f.to) && !acc.off(f.to)) {
        acc.edge(f.from, f.to, f.id);
        queue.push(f.to);
      }
  for (const done = new Set<string>(); queue.length; ) {
    const n = queue.pop()!;
    if (done.has(n)) continue;
    done.add(n);
    for (const f of flows.get(n) ?? [])
      if (!acc.off(f.to)) {
        acc.edge(f.from, f.to, f.id);
        queue.push(f.to);
      }
  }
  // only what reaches a sound card
  const heard = new Set<string>();
  for (const c of result.cells.values()) if (c.sink && acc.nodes.has(cellId(c.name))) heard.add(c.name);
  for (let grew = true; grew; ) {
    grew = false;
    for (const [from, fs] of flows)
      if (!heard.has(from) && acc.nodes.has(cellId(from)) && fs.some((f) => heard.has(f.to) && acc.edges.has(f.id))) {
        heard.add(from);
        grew = true;
      }
  }
  const sound = new RouteAcc(result, muted);
  for (const n of heard) sound.node(n);
  for (const [from, fs] of flows) for (const f of fs) if (heard.has(from) && heard.has(f.to) && acc.edges.has(f.id)) sound.edges.add(f.id);
  // the notes of what's heard, and what moves the tapes that are
  for (const o of outs) if (heard.has(sourceOf(o))) notesOf(sound, o, how);
  for (const n of heard) if (keeps(result, n)) sound.clock(n);
  // an oscilloscope watches: on when what it watches is
  for (const c of result.cells.values())
    if (typeof c.params.scope === 'string' && !sound.off(c.name))
      for (const k of c.children.keys())
        if (sound.nodes.has(cellId(k))) sound.edge(c.name, k);
  return sound;
}

/** Does it play at all (anything in its braid, through tables that are on)? */
function plays(result: CompileResult, muted: ReadonlySet<string>, o: Output): boolean {
  return new RouteAcc(result, muted).braid(o.cell, ROOT);
}

const routingCache = new WeakMap<CompileResult, Map<string, Routing>>();

/** Everything that can sound, with what's switched off left out. */
export function routing(result: CompileResult, muted: ReadonlySet<string>): Routing {
  const key = [...muted].sort().join(' ');
  let byMuted = routingCache.get(result);
  if (!byMuted) routingCache.set(result, (byMuted = new Map()));
  const hit = byMuted.get(key);
  if (hit) return hit;
  const outs = result.outputs.filter((o) => outputSounds(result, o, muted) && plays(result, muted, o));
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

/** A routing in the graph as drawn: an edge a petal redraws is the edge it's drawn as; one that isn't drawn, left out. */
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
    byModel.set(model, (hit = { nodes: r.nodes, edges }));
  }
  return hit;
}

/** What a node (by id) is drawn as. `live`: null while stopped. */
export function nodeStateOf(id: string, muted: ReadonlySet<string>, routed: Routing, live: Routing | null): State {
  if (muted.has(id)) return 'off';
  if (!routed.nodes.has(id)) return 'unrouted';
  if (!live) return 'on';
  return live.nodes.has(id) ? 'live' : 'idle';
}

/** What an edge is drawn as: off with either end; otherwise as the routing says (drawn ids: see `drawn`). */
export function edgeStateOf(e: { readonly id: string; readonly source: string; readonly target: string }, muted: ReadonlySet<string>, routed: Routing, live: Routing | null): State {
  if (muted.has(e.source) || muted.has(e.target)) return 'off';
  if (!routed.edges.has(e.id)) return 'unrouted';
  if (!live) return 'on';
  return live.edges.has(e.id) ? 'live' : 'idle';
}
