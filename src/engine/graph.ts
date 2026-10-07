/**
 * Library-agnostic graph of a program: exactly the cells written in the code
 * (the implicit default grid stays hidden), with exactly the links written:
 * over=, &refs, step= and out(…). Voice cells are drawn as voices.
 * Depth grows outward from the roots: a cell sits one ring beyond the table
 * it reads through and the cells it splices in; voices sit beyond what they play.
 */
import { effectiveShow } from '../layout/show';
import type { CompileResult, ResolvedCell } from './program';
import { refLabel, shiftLabel } from './ast';
import { cellId, edgeId, stepEdgeId } from './ids';

export type GraphNode =
  | {
      readonly id: string;
      readonly kind: 'cell';
      readonly depth: number;
      readonly cell: ResolvedCell;
      readonly isMeter: boolean;
      readonly petalOf?: string;
      /** An instrument's place in stereo and in the mix (as for voices). */
      readonly pan?: number;
      readonly order?: number;
    }
  | {
      readonly id: string;
      readonly kind: 'voice';
      readonly depth: number;
      readonly cell: ResolvedCell;
      readonly petalOf?: string;
      /** Where it sits in stereo: −1 left … 1 right (from its levels in each channel). */
      readonly pan?: number;
      /** Its place in the mix, as written (first = 0). */
      readonly order?: number;
    };

/**
 * What a wire carries (docs/notes/nets.md): ticks (a clock, a gate), values (pitch, level, a table) or sound.
 * A note's link (about=) carries nothing.
 */
type Band = 'sync' | 'cv' | 'audio' | 'none';

/** What an edge is as a wire, read from the code: from the cell whose values travel, into a port of the cell that takes them. */
interface Wire {
  /** Where the code reads it: `over`, `step`, `braid` (a ref), `voice` (a melody playing it), `env`, `level`, `pitch`, `mix`, `about`, or the attribute (`lpf`, `fm`, `write`, `play` …). */
  readonly port: string;
  readonly band: Band;
  /** The reader indexes or splices the cell itself (over=, a ref), rather than taking its signal. */
  readonly pointer: boolean;
  /** How many values at once: a chord's notes, a table's entries. */
  readonly width: number;
  /** Along the flow (source and target point either way, as the layout reads them): what travels, and where to. */
  readonly from: string;
  readonly to: string;
}

export interface GraphEdge extends Wire {
  readonly id: string;
  /**
   * A step drawn as a belt between two turntables: `spring` when the driven cell says `belt=` (it lags and swings),
   * `rigid` when both are turntables anyway (a tape on its motor's capstan).
   */
  readonly belt?: 'spring' | 'rigid';
  readonly source: string;
  readonly target: string;
  readonly kind: 'over' | 'ref' | 'step' | 'out' | 'mix' | 'about';
  /** How many slots of the source play the target (refs). */
  readonly count: number;
  /** Pick written on the reference, if any (`[-1:]`). */
  readonly pick: string;
  /** step= ratio label: ⟳ per cycle, ×n / ÷n. */
  readonly label?: string;
}

/**
 * A net (docs/notes/nets.md): a cell read through one port by several, or a meter by whatever it steps. A table's
 * (over=), a melody's (voice) and a voice's (mix) leave it once and go on from reader to reader; a meter's (step=, sync) is its ground: no edge of
 * its own is drawn, its traces join it and its cells through each other. The layout lays each as a tree (a ratsnest).
 */
interface GraphNet {
  readonly id: string;
  /** The cell it leaves (its node id), and the port its readers read it through. */
  readonly owner: string;
  readonly port: string;
  readonly band: Band;
  /** Its edges, one a reader (the layout lays them as a ratsnest: ForceLayout.taps). */
  readonly taps: readonly string[];
}

export interface GraphModel {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly nets: readonly GraphNet[];
  /** An edge drawn under another id (through a petal: to its parent), by its own id; undefined: not drawn. */
  readonly alias: ReadonlyMap<string, string | undefined>;
}

/** A cell drawn as a turntable: a motor, a belted cell, a tape, a resonator's body. */
export const isTurntable = (c: ResolvedCell) =>
  typeof c.params.motor === 'number' || typeof c.params.belt === 'number' || typeof c.params.write === 'string' || typeof c.params.body === 'string';

export function buildGraph(result: CompileResult): GraphModel {
  const edges: GraphEdge[] = [];
  const depth = new Map<string, number>();
  // meters: clocks whose entries place beats in a bar (agogic, even) — not a vibrato looping at a rate
  const meters = new Set([...result.clocks.values()].filter((c) => c.positional).map((c) => c.cell));
  const playedBy = new Map<string, string[]>();
  // (an output played off a tape comes from its read head, not the tape's source)
  const from = (o: (typeof result.outputs)[number]) => (o.tape ? o.tape.head : o.cell);
  for (const o of result.outputs) playedBy.set(o.voice, [...(playedBy.get(o.voice) ?? []), from(o)]);

  const depthOf = (name: string, guard = 0): number => {
    const hit = depth.get(name);
    if (hit !== undefined) return hit;
    const c = result.cells.get(name);
    let d = 1;
    if (c && guard < 64) {
      if (c.root) d = 0;
      else if (c.mix) {
        for (const b of c.mix) d = Math.max(d, depthOf(b.voice.name, guard + 1) + 1);
      } else if (c.voice || c.kit) {
        for (const p of playedBy.get(name) ?? []) d = Math.max(d, depthOf(p, guard + 1) + 1);
        for (const o of result.outputs)
          if (o.voice === name) {
            for (const m of [...o.mods, ...o.levels]) d = Math.max(d, depthOf(m.cell, guard + 1) + 1);
            if (o.envelopeCell) d = Math.max(d, depthOf(o.envelopeCell, guard + 1) + 1);
          }
        for (const k of c.children.keys()) d = Math.max(d, depthOf(k, guard + 1) + 1);
      } else {
        d = depthOf(c.over ?? c.context, guard + 1) + 1;
        for (const k of c.children.keys()) d = Math.max(d, depthOf(k, guard + 1) + 1);
      }
    }
    depth.set(name, d);
    return d;
  };

  const shown = (name: string) => !result.cells.get(name)?.implicit;
  const nodes: GraphNode[] = [];
  const seen = new Set<string>();
  const link = (e: GraphEdge) => {
    if (seen.has(e.id) || !shown(e.target.slice('cell:'.length))) return;
    seen.add(e.id);
    edges.push(e);
  };
  // (a wire along the flow, source → target; `back`: the edge points from the reader to what it reads)
  const wire = (port: string, band: Band, source: string, target: string, width = 1, back = false, pointer = false): Wire => ({
    port,
    band,
    pointer,
    width,
    from: back ? target : source,
    to: back ? source : target,
  });
  const chord = chordWidth(result);
  const sounds = (name: string) => {
    const c = result.cells.get(name);
    return !!c && (c.voice || !!c.mix || c.kit || result.tapes.some((t) => t.name === name) || result.returns.some((r) => r.head === name));
  };
  for (const c of result.cells.values()) {
    if (!shown(c.name)) continue;
    const id = cellId(c.name);
    if (c.voice) nodes.push({ id, kind: 'voice', depth: depthOf(c.name), cell: c });
    else nodes.push({ id, kind: 'cell', depth: depthOf(c.name), cell: c, isMeter: meters.has(c.name) });
    if (c.over)
      link({
        id: edgeId(id, cellId(c.over)),
        source: id,
        target: cellId(c.over),
        kind: 'over',
        count: 1,
        pick: shiftLabel(c.overShift),
        ...wire('over', 'cv', id, cellId(c.over), entries(result, c.over), true, true),
      });
    // resonators: coupled through the table (couple=), and what excites them
    if (typeof c.params.couple === 'string' && result.cells.has(c.params.couple))
      link({
        id: edgeId(id, cellId(c.params.couple)),
        source: id,
        target: cellId(c.params.couple),
        kind: 'out',
        count: 1,
        pick: 'couple',
        ...wire('couple', 'audio', id, cellId(c.params.couple), 1, true),
      });
    if (typeof c.params.excite === 'string' && result.cells.has(c.params.excite))
      link({
        id: edgeId(cellId(c.params.excite), id),
        source: cellId(c.params.excite),
        target: id,
        kind: 'out',
        count: 1,
        pick: 'excite',
        ...wire('excite', 'audio', cellId(c.params.excite), id),
      });
    // tapes: the source into the tape (written), the tape into each read head (played)
    if (typeof c.params.write === 'string' && result.cells.has(c.params.write))
      link({
        id: edgeId(cellId(c.params.write), id),
        source: cellId(c.params.write),
        target: id,
        kind: 'out',
        count: 1,
        pick: 'write',
        ...wire('write', sounds(c.params.write) ? 'audio' : 'cv', cellId(c.params.write), id, chord(c.params.write)),
      });
    if (typeof c.params.play === 'string' && result.cells.has(c.params.play))
      link({
        id: edgeId(cellId(c.params.play), id),
        source: cellId(c.params.play),
        target: id,
        kind: 'out',
        count: 1,
        pick: 'play',
        ...wire('play', sounds(c.params.play) ? 'audio' : 'cv', cellId(c.params.play), id, chord(c.params.play)),
      });
    // FM: the modulator feeds its carrier
    if (typeof c.params.fm === 'string' && result.cells.has(c.params.fm))
      link({ id: edgeId(cellId(c.params.fm), id), source: cellId(c.params.fm), target: id, kind: 'out', count: 1, pick: 'fm', ...wire('fm', 'audio', cellId(c.params.fm), id) });
    // a voice's moving parameters: their cells feed it (lpf, lpq …)
    for (const [key, pc] of Object.entries(c.paramCells ?? {}))
      for (const f of pc.factors)
        if (result.cells.has(f)) link({ id: edgeId(cellId(f), id), source: cellId(f), target: id, kind: 'out', count: 1, pick: key, ...wire(key, 'cv', cellId(f), id) });
    for (const [child, count] of c.children) {
      // its transpositions (^n), as written in this cell's steps
      const ups = [...new Set(c.units.flatMap((u) => (u.atom.kind === 'ref' && u.atom.name === child && u.atom.transpose ? [u.atom.transpose] : [])))];
      link({
        id: edgeId(id, cellId(child)),
        source: id,
        target: cellId(child),
        kind: 'ref',
        count,
        pick: ups.map((n) => `^${n}`).join(' '),
        ...wire('braid', 'cv', id, cellId(child), chord(child), true, true),
      });
    }
    // a note's links: what it explains
    for (const target of c.about)
      if (result.cells.has(target))
        link({ id: edgeId(id, cellId(target)), source: id, target: cellId(target), kind: 'about', count: 1, pick: '', ...wire('about', 'none', id, cellId(target)) });
    if (c.step)
      // (a belt says so: the cell follows through a spring, not rigidly)
      link({
        id: stepEdgeId(id, cellId(c.step.driver)),
        source: id,
        target: cellId(c.step.driver),
        kind: 'step',
        count: 1,
        pick: '',
        label: typeof c.params.belt === 'number' ? `${c.step.label} · belt` : c.step.label,
        ...beltOf(c, result.cells.get(c.step.driver)),
        ...wire('step', 'sync', id, cellId(c.step.driver), 1, true),
      });
  }
  // voices into their mixes (labelled with the gain when it isn't 1)
  for (const c of result.cells.values())
    for (const b of c.mix ?? [])
      if (result.cells.has(b.voice.name))
        link({
          id: edgeId(cellId(b.voice.name), cellId(c.name)),
          source: cellId(b.voice.name),
          target: cellId(c.name),
          kind: 'mix',
          count: 1,
          pick: '',
          label: b.gain !== 1 ? `×${+b.gain.toFixed(3)}` : undefined,
          ...wire('mix', 'audio', cellId(b.voice.name), cellId(c.name)),
        });
  for (const o of result.outputs) {
    link({
      id: edgeId(cellId(from(o)), cellId(o.voice)),
      source: cellId(from(o)),
      target: cellId(o.voice),
      kind: 'out',
      count: 1,
      pick: refLabel(o),
      ...wire('voice', 'cv', cellId(from(o)), cellId(o.voice), tines(result, o.voice) || chord(from(o))),
    });
    if (o.envelopeCell)
      link({
        id: edgeId(cellId(o.envelopeCell), cellId(o.voice)),
        source: cellId(o.envelopeCell),
        target: cellId(o.voice),
        kind: 'out',
        count: 1,
        pick: '',
        label: '×',
        ...wire('env', 'cv', cellId(o.envelopeCell), cellId(o.voice)),
      });
    for (const m of o.levels)
      link({
        id: edgeId(cellId(m.cell), cellId(o.voice)),
        source: cellId(m.cell),
        target: cellId(o.voice),
        kind: 'out',
        count: 1,
        pick: refLabel(m),
        label: '×',
        ...wire('level', 'cv', cellId(m.cell), cellId(o.voice), chord(m.cell)),
      });
    for (const m of o.mods)
      link({
        id: edgeId(cellId(m.cell), cellId(o.voice)),
        source: cellId(m.cell),
        target: cellId(o.voice),
        kind: 'out',
        count: 1,
        pick: refLabel(m),
        label: m.sign > 0 ? '+' : '−',
        // (a wave in a pitch sum moves the pitch at audio rate: FM)
        ...wire('pitch', isWave(result, m.cell) ? 'audio' : 'cv', cellId(m.cell), cellId(o.voice), chord(m.cell)),
      });
  }
  // voices: where they sit in stereo, and in what order the mix names them
  // (an instrument — a mix used like a voice — is what sits in the stereo field, not the voices inside it)
  const sounding = (o: (typeof result.outputs)[number]) => o.through[0] ?? o.voice;
  const pans = new Map<string, [number, number]>();
  result.outputs.forEach((o) => {
    const g = pans.get(sounding(o)) ?? [0, 0];
    pans.set(sounding(o), [g[0] + o.gains[0], g[1] + o.gains[1]]);
  });
  const order = [...new Set(result.outputs.map(sounding))];
  const placed = nodes.map((n): GraphNode => {
    if (!pans.has(n.cell.name)) return n;
    const [l, r] = pans.get(n.cell.name)!;
    return { ...n, pan: l + r > 0 ? (r - l) / (l + r) : 0, order: Math.max(0, order.indexOf(n.cell.name)) } as GraphNode;
  });
  return petals(result, placed, edges);
}

/** A step's belt, if it is one (GraphEdge.belt). */
function beltOf(driven: ResolvedCell, driver: ResolvedCell | undefined): { belt?: 'spring' | 'rigid' } {
  if (typeof driven.params.belt === 'number') return { belt: 'spring' };
  return driver && isTurntable(driven) && isTurntable(driver) ? { belt: 'rigid' } : {};
}

/** A resonator's tines (its exciters, when it has more than one): a note into it picks one, so the edge is that wide. */
const tines = (result: CompileResult, name: string) => {
  const c = result.cells.get(name);
  return typeof c?.params.body === 'string' && (c.exciters?.length ?? 0) > 1 ? c.exciters!.length : 0;
};

/** How many values a cell holds at once: its widest chord, a ref counting as the cell it splices in. */
function chordWidth(result: CompileResult): (name: string) => number {
  const memo = new Map<string, number>();
  const of = (name: string, guard = 0): number => {
    const hit = memo.get(name);
    if (hit !== undefined) return hit;
    let w = 1;
    for (const u of result.cells.get(name)?.units ?? []) {
      if (u.atom.kind === 'chord') w = Math.max(w, u.atom.notes.length);
      else if (u.atom.kind === 'ref' && guard < 64) w = Math.max(w, of(u.atom.name, guard + 1));
    }
    memo.set(name, w);
    return w;
  };
  return (name) => of(name);
}

/** A table's entries: its cycle, or (a kit, a table of parts) the entries written. */
const entries = (result: CompileResult, name: string) => {
  const c = result.cells.get(name);
  return Math.max(1, c?.cycle || c?.units.length || 1);
};

/** A braid turning at an audio rate with no sound of its own (decision 006's wave). */
const isWave = (result: CompileResult, name: string) => {
  const c = result.cells.get(name);
  // (its own rate: a driven cell's freq is only the default)
  return !!c && !c.voice && !c.step && [...result.clocks.values()].some((k) => k.cell === name) && c.freq >= 20;
};

/**
 * Unnamed cells (&( … )) are drawn as petals of the named cell on their line:
 * small, hung from it, without edges of their own. An edge that went through a
 * petal is drawn to its parent instead — unless that would loop back to the
 * parent or repeat an edge already there.
 */
function petals(result: CompileResult, allNodes: GraphNode[], allEdges: GraphEdge[]): GraphModel {
  // show=off: not in the graph at all
  const hidden = new Set(allNodes.filter((n) => effectiveShow(result, n.cell.name).show === 'off').map((n) => n.id));
  const nodes = allNodes.filter((n) => !hidden.has(n.id));
  const edges = allEdges.filter((e) => !hidden.has(e.source) && !hidden.has(e.target));
  const parentOf = new Map<string, string>();
  for (const n of nodes) {
    if (n.cell.lambda) {
      const line = /^λ(\d+)_/.exec(n.cell.name)?.[1];
      const parent = [...result.cells.values()].find((c) => !c.lambda && !c.implicit && c.span.line === +(line ?? -1));
      if (parent) parentOf.set(n.id, cellId(parent.name));
    } else if (effectiveShow(result, n.cell.name).show === 'petal') {
      // show=petal: hung from the cell that uses it (a voice: the mix it's in)
      const user =
        edges.find((e) => e.target === n.id && (e.kind === 'ref' || e.kind === 'over'))?.source ??
        edges.find((e) => e.source === n.id && (e.kind === 'mix' || e.kind === 'out'))?.target;
      if (user) parentOf.set(n.id, user);
    }
  }
  const up = (id: string) => parentOf.get(id) ?? id;
  const out: GraphEdge[] = [];
  const pairs = new Set<string>();
  const key = (a: string, b: string) => [a, b].sort().join('|');
  for (const e of edges) if (!parentOf.has(e.source) && !parentOf.has(e.target)) pairs.add(key(e.source, e.target));
  // (an edge redrawn, or left out because one is drawn between the same two already: drawn as that one)
  const redrawn: { id: string; pair: string | null }[] = [];
  for (const e of edges) {
    const source = up(e.source);
    const target = up(e.target);
    if (source === e.source && target === e.target) {
      out.push(e);
      continue;
    }
    redrawn.push({ id: e.id, pair: source === target ? null : key(source, target) });
    if (source === target || pairs.has(key(source, target))) continue;
    pairs.add(key(source, target));
    out.push({ ...e, id: edgeId(source, target) + (e.kind === 'step' ? '~' : ''), source, target, from: up(e.from), to: up(e.to) });
  }
  const byPair = new Map<string, string>();
  for (const e of out) if (!byPair.has(key(e.source, e.target))) byPair.set(key(e.source, e.target), e.id);
  const alias = new Map<string, string | undefined>();
  for (const r of redrawn) alias.set(r.id, r.pair === null ? undefined : byPair.get(r.pair));
  for (const e of allEdges) if (hidden.has(e.source) || hidden.has(e.target)) alias.set(e.id, undefined);
  return { nodes: nodes.map((n) => (parentOf.has(n.id) ? { ...n, petalOf: parentOf.get(n.id) } : n)), edges: out, nets: netsOf(nodes, out), alias };
}

/**
 * The ports whose edges from one cell to several make a net laid as a bus: a table read through over=, a melody
 * playing several voices, a voice into several mixes (the sound card's channels). A tape's heads are not: each is
 * its own place on the tape, which is their junction already.
 */
const BUS_PORTS = new Set(['over', 'voice', 'mix']);

/**
 * The nets among the edges: a table read by two or more (over=), a melody or a voice by two or more, and each meter's ticks to every cell it steps (a
 * step into a meter, not through a belt: a belt is a body, drawn).
 */
function netsOf(nodes: readonly GraphNode[], edges: readonly GraphEdge[]): GraphNet[] {
  const meters = new Set(nodes.flatMap((n) => (n.kind === 'cell' && n.isMeter ? [n.id] : [])));
  const groups = new Map<string, GraphEdge[]>();
  for (const e of edges) {
    const port = BUS_PORTS.has(e.port) ? e.port : e.kind === 'step' && !e.belt && meters.has(e.target) ? 'step' : null;
    if (port) groups.set(`${e.from}|${port}`, [...(groups.get(`${e.from}|${port}`) ?? []), e]);
  }
  return [...groups.values()]
    .filter((g) => g.length > 1 || g[0].port === 'step')
    .map((g) => ({ id: `net:${g[0].from}:${g[0].port}`, owner: g[0].from, port: g[0].port, band: g[0].band, taps: g.map((e) => e.id) }));
}

/** Changes only when the set of nodes or edges changes — not when contents do. */
export function structureKey(model: GraphModel): string {
  return [...model.nodes.map((n) => n.id).sort(), '|', ...model.edges.map((e) => e.id).sort()].join(' ');
}
