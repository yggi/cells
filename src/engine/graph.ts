/**
 * Library-agnostic graph of a program: exactly the cells written in the code
 * (the implicit default grid stays hidden), with exactly the links written:
 * over=, &refs, step= and out(…). Voice cells are drawn as voices.
 * Depth grows outward from the roots: a cell sits one ring beyond the table
 * it reads through and the cells it splices in; voices sit beyond what they play.
 */
import { effectiveShow } from '../layout/show';
import type { CompileResult, ResolvedCell } from './compile';
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

export interface GraphEdge {
  readonly id: string;
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

export interface GraphModel {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  /** An edge drawn under another id (through a petal: to its parent), by its own id; undefined: not drawn. */
  readonly alias: ReadonlyMap<string, string | undefined>;
}

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
  for (const c of result.cells.values()) {
    if (!shown(c.name)) continue;
    const id = cellId(c.name);
    if (c.voice) nodes.push({ id, kind: 'voice', depth: depthOf(c.name), cell: c });
    else nodes.push({ id, kind: 'cell', depth: depthOf(c.name), cell: c, isMeter: meters.has(c.name) });
    if (c.over) link({ id: edgeId(id, cellId(c.over)), source: id, target: cellId(c.over), kind: 'over', count: 1, pick: shiftLabel(c.overShift) });
    // resonators: coupled through the table (couple=), and what excites them
    if (typeof c.params.couple === 'string' && result.cells.has(c.params.couple))
      link({ id: edgeId(id, cellId(c.params.couple)), source: id, target: cellId(c.params.couple), kind: 'out', count: 1, pick: 'couple' });
    if (typeof c.params.excite === 'string' && result.cells.has(c.params.excite))
      link({ id: edgeId(cellId(c.params.excite), id), source: cellId(c.params.excite), target: id, kind: 'out', count: 1, pick: 'excite' });
    // tapes: the source into the tape (written), the tape into each read head (played)
    if (typeof c.params.write === 'string' && result.cells.has(c.params.write))
      link({ id: edgeId(cellId(c.params.write), id), source: cellId(c.params.write), target: id, kind: 'out', count: 1, pick: 'write' });
    if (typeof c.params.play === 'string' && result.cells.has(c.params.play))
      link({ id: edgeId(cellId(c.params.play), id), source: cellId(c.params.play), target: id, kind: 'out', count: 1, pick: 'play' });
    // FM: the modulator feeds its carrier
    if (typeof c.params.fm === 'string' && result.cells.has(c.params.fm))
      link({ id: edgeId(cellId(c.params.fm), id), source: cellId(c.params.fm), target: id, kind: 'out', count: 1, pick: 'fm' });
    // a voice's moving parameters: their cells feed it (lpf, lpq …)
    for (const [key, pc] of Object.entries(c.paramCells ?? {}))
      for (const f of pc.factors)
        if (result.cells.has(f)) link({ id: edgeId(cellId(f), id), source: cellId(f), target: id, kind: 'out', count: 1, pick: key });
    for (const [child, count] of c.children) {
      // its transpositions (^n), as written in this cell's steps
      const ups = [...new Set(c.units.flatMap((u) => (u.atom.kind === 'ref' && u.atom.name === child && u.atom.transpose ? [u.atom.transpose] : [])))];
      link({ id: edgeId(id, cellId(child)), source: id, target: cellId(child), kind: 'ref', count, pick: ups.map((n) => `^${n}`).join(' ') });
    }
    // a note's links: what it explains
    for (const target of c.about) if (result.cells.has(target)) link({ id: edgeId(id, cellId(target)), source: id, target: cellId(target), kind: 'about', count: 1, pick: '' });
    if (c.step)
      // (a belt says so: the cell follows through a spring, not rigidly)
      link({ id: stepEdgeId(id, cellId(c.step.driver)), source: id, target: cellId(c.step.driver), kind: 'step', count: 1, pick: '', label: typeof c.params.belt === 'number' ? `${c.step.label} · belt` : c.step.label });
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
        });
  for (const o of result.outputs) {
    link({ id: edgeId(cellId(from(o)), cellId(o.voice)), source: cellId(from(o)), target: cellId(o.voice), kind: 'out', count: 1, pick: refLabel(o) });
    if (o.envelopeCell)
      link({
        id: edgeId(cellId(o.envelopeCell), cellId(o.voice)),
        source: cellId(o.envelopeCell),
        target: cellId(o.voice),
        kind: 'out',
        count: 1,
        pick: '',
        label: '×',
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
    out.push({ ...e, id: edgeId(source, target) + (e.kind === 'step' ? '~' : ''), source, target });
  }
  const byPair = new Map<string, string>();
  for (const e of out) if (!byPair.has(key(e.source, e.target))) byPair.set(key(e.source, e.target), e.id);
  const alias = new Map<string, string | undefined>();
  for (const r of redrawn) alias.set(r.id, r.pair === null ? undefined : byPair.get(r.pair));
  for (const e of allEdges) if (hidden.has(e.source) || hidden.has(e.target)) alias.set(e.id, undefined);
  return { nodes: nodes.map((n) => (parentOf.has(n.id) ? { ...n, petalOf: parentOf.get(n.id) } : n)), edges: out, alias };
}

/** Changes only when the set of nodes or edges changes — not when contents do. */
export function structureKey(model: GraphModel): string {
  return [...model.nodes.map((n) => n.id).sort(), '|', ...model.edges.map((e) => e.id).sort()].join(' ');
}
