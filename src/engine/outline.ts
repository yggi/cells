/**
 * A piece's outline (#695): its parts, each the fragment it is taken from or a line the piece writes itself, linked by
 * what reads what, as two trees of the same graph: from the ground (each part under the part it is taken on, the meter
 * and the key at the roots) and from the outputs (each part under what plays it, the cards at the roots). A frontend
 * shows a score so: Jambot's Cells view (yggi/jambot#642) and Cell studio's fragments (yggi/cell-studio#621).
 *
 * It folds what a compile already holds: the takes (`CompileResult.takes`), each given cell's origin (#639) and the
 * written graph's wires (`writtenGraph`, which already orders cells outward from the roots). A part is one line of the
 * piece; a take's cells that came through one of its fragment's own `from` lines are a part of their own inside it
 * (`within`), so `* from band` is the band, and in it each performer and instrument, by the fragment it takes. Deeper
 * takes stay with that part. The same fold, one level down: the law of recursion.
 *
 * A cell with no line of its own (an unnamed cell, `&( … )`, a lambda compile names) belongs to the part of the first
 * cell it is wired to. How a part was chosen (a query's distance, a weight in mind) is the frontend's, joined by id.
 * Pure.
 */
import { writtenGraph } from './graph';
import type { CompileResult, Origin, Take } from './program';

/** One part of a piece: a `from` line's take, a fragment line inside one, or a line the piece writes itself. */
export interface OutlinePart {
  /** Unique in the outline: the piece's line (`'4'`), or the piece's line and the fragment's line inside it (`'8/3'`). */
  readonly key: string;
  /** The piece's line it is on (1-based). */
  readonly line: number;
  /** The fragment it is taken from (`funk_bass`, `bass_performer`), or null for a line the piece writes itself. */
  readonly id: string | null;
  /** The part it is inside (a take's key), or null for a line of the piece. */
  readonly within: string | null;
  /** Its names as the piece reads them (`&bassline`): a take's heads, less the copies' private cells (`&bar_tempo`). */
  readonly heads: readonly string[];
  /** Every cell it holds, by its name as compiled. */
  readonly cells: readonly string[];
  /** The fragment's facets (`facetsOf`), or none. */
  readonly facets: readonly string[];
  /** A take's arguments as written (`{ harm: '&harm' }`), or none. */
  readonly args: Readonly<Record<string, string>> | null;
  /** The names a take asks for that the piece's own lines define instead: taken, with the piece's own changes. */
  readonly overrode: readonly string[];
  /** The parts it reads, by key, in the piece's order. */
  readonly reads: readonly string[];
  /** The parts whose voices it splices (`&beat &bd ~ &hh` plays on the kit), by key: what it plays on, in neither tree. */
  readonly on: readonly string[];
}

/** A part and the parts nested under it. */
export interface OutlineNode {
  readonly part: OutlinePart;
  readonly children: readonly OutlineNode[];
}

export interface Outline {
  /** Every part, in the piece's order (a take's inner parts after it). */
  readonly parts: readonly OutlinePart[];
  /** From the ground: the roots read no part; each part under a part it reads, the one its arguments name first. */
  readonly ground: readonly OutlineNode[];
  /** From the outputs: the roots are read by no part; each part under a part that reads it. */
  readonly outputs: readonly OutlineNode[];
}

export interface OutlineOptions {
  /** A fragment's facets by its id (a frontend's catalogue, `repository/catalogue`); none by default. */
  readonly facetsOf?: (id: string) => readonly string[];
}

/** Which wire decides a part's place first: a table it is over, what it splices or plays, then its clock last. */
const PORT_RANK: Readonly<Record<string, number>> = { over: 0, braid: 1, voice: 2, is: 2, mix: 3, midi: 3, play: 3 };
const rankOf = (port: string) => PORT_RANK[port] ?? (port === 'step' ? 6 : 4);

/** A cell's name from a graph node's id: a product's junction is its mix's. */
function cellOf(node: string): string | null {
  if (node.startsWith('cell:')) return node.slice(5);
  const junction = /^junction:(.+):\d+$/.exec(node);
  return junction ? junction[1]! : null;
}

/**
 * A take's heads: the names it asks for, or for `*` every name it gave less a copy's private ones, which cells names
 * `<head>_<name>` (decision 065), so a name that starts with another given name and `_` is private.
 */
function headsOf(take: Take): string[] {
  if (take.names) return take.names.map((n) => n.replace(/^&/, ''));
  const gave = take.gave.map((n) => n.replace(/^&/, ''));
  return gave.filter((n) => !gave.some((other) => other !== n && n.startsWith(`${other}_`)));
}

/** The outline of a compiled piece (see the module's comment). */
export function outlineOf(result: CompileResult, { facetsOf = () => [] }: OutlineOptions = {}): Outline {
  const takes = new Map((result.takes ?? []).map((t) => [t.span.line, t]));
  const unitOf = new Map<string, string>();
  const made = new Map<string, { line: number; id: string | null; within: string | null; cells: string[] }>();
  const make = (key: string, line: number, id: string | null, within: string | null) => {
    if (!made.has(key)) made.set(key, { line, id, within, cells: [] });
    return key;
  };
  for (const take of result.takes ?? []) make(String(take.span.line), take.span.line, take.id, null);

  const place = (cell: string, chain: readonly Origin[]) => {
    const line = chain[0]!.line;
    const take = takes.get(line);
    const outer = make(String(line), line, take?.id ?? chain[1]?.id ?? null, null);
    // (a cell that came through one of the fragment's own `from` lines: a part of its own inside the take)
    const key = chain.length >= 3 ? make(`${line}/${chain[1]!.line}`, line, chain[2]!.id, outer) : outer;
    unitOf.set(cell, key);
  };
  const loose: string[] = [];
  for (const cell of result.cells.values()) {
    const chain = result.origins?.get(cell.name);
    if (chain?.length) place(cell.name, chain);
    else if (cell.lambda !== null || cell.implicit) loose.push(cell.name);
    else unitOf.set(cell.name, make(String(cell.span.line), cell.span.line, null, null));
  }

  const graph = writtenGraph(result);
  const wires = graph.edges.flatMap((e) => {
    if (e.port === 'about') return [];
    const from = cellOf(e.from);
    const to = cellOf(e.to);
    if (!from || !to) return [];
    // (a product's voice is wired from its junction to the voice: the product reads it)
    return [e.port === 'is' ? { read: to, reader: from, port: e.port } : { read: from, reader: to, port: e.port }];
  });
  // (a line that splices voices plays on them, `&beat &bd ~ &hh`: an instrument it plays on, not a part it stands on)
  const voices = new Set(graph.nodes.flatMap((n) => (n.kind === 'voice' ? [n.cell.name] : [])));
  const playsOn = (w: { readonly read: string; readonly port: string }) => w.port === 'braid' && voices.has(w.read);
  // (a loose cell joins the one part of what it reads, as `&style[bite]` is the style's; else the one part of all
  // that reads it, as an envelope is its voice's, once those are placed; a cell several parts share belongs to none)
  for (let settled = true; loose.length && settled;) {
    settled = false;
    for (let i = loose.length - 1; i >= 0; i--) {
      const name = loose[i]!;
      const read = new Set(wires.flatMap((w) => (w.reader === name && unitOf.has(w.read) ? [unitOf.get(w.read)!] : [])));
      const readers = wires.filter((w) => w.read === name).map((w) => w.reader);
      const by = new Set(readers.flatMap((r) => (unitOf.has(r) ? [unitOf.get(r)!] : [])));
      const one = read.size === 1 ? [...read][0] : read.size === 0 && by.size === 1 && readers.every((r) => unitOf.has(r)) ? [...by][0] : undefined;
      if (one === undefined) continue;
      unitOf.set(name, one);
      loose.splice(i, 1);
      settled = true;
    }
  }
  for (const [cell, key] of unitOf) made.get(key)!.cells.push(cell);

  const order = [...made.keys()].sort((a, b) => {
    const [la, ia = 0] = a.split('/').map(Number);
    const [lb, ib = 0] = b.split('/').map(Number);
    return la! - lb! || ia - ib;
  });
  const rankBy = new Map(order.map((k, i) => [k, i]));
  const reads = new Map(order.map((k) => [k, new Map<string, number>()]));
  const on = new Map(order.map((k) => [k, new Set<string>()]));
  for (const w of wires) {
    const reader = unitOf.get(w.reader);
    const read = unitOf.get(w.read);
    if (!reader || !read || reader === read) continue;
    if (playsOn(w)) {
      on.get(reader)!.add(read);
      continue;
    }
    const ports = reads.get(reader)!;
    ports.set(read, Math.min(ports.get(read) ?? Infinity, rankOf(w.port)));
  }

  const parts: OutlinePart[] = order.map((key) => {
    const { line, id, within, cells } = made.get(key)!;
    const take = within === null ? takes.get(line) : undefined;
    const outer = within === null ? undefined : takes.get(line);
    // (a take's named heads are its own, given or not; `*`'s, and an inner part's, are those of its cells)
    const heads = take?.names ? headsOf(take) : take || outer ? headsOf((take ?? outer)!).filter((h) => cells.includes(h)) : cells.filter((c) => !result.cells.get(c)?.lambda);
    return {
      key,
      line,
      id,
      within,
      heads: heads.map((h) => `&${h}`),
      cells,
      facets: id === null ? [] : facetsOf(id),
      args: take?.args ?? null,
      overrode: take?.overrode ?? [],
      reads: [...reads.get(key)!.keys()].sort((a, b) => rankBy.get(a)! - rankBy.get(b)!),
      on: [...on.get(key)!].filter((k) => !reads.get(key)!.has(k)).sort((a, b) => rankBy.get(a)! - rankBy.get(b)!),
    };
  });
  const byKey = new Map(parts.map((p) => [p.key, p]));

  // The trees need the reads without a cycle. A part inside a take that reads the take's own helpers (a performer its
  // band's level) is plumbing, not where it stands: that read is left out first. A cycle still left (a feedback the
  // piece writes) loses the read that closes it, walking the parts in the piece's order.
  const acyclic = new Map(parts.map((p) => [p.key, p.reads.filter((r) => r !== p.within)]));
  const state = new Map<string, 'open' | 'done'>();
  const walk = (k: string) => {
    state.set(k, 'open');
    acyclic.set(
      k,
      acyclic.get(k)!.filter((r) => {
        if (state.get(r) === 'open') return false;
        if (!state.has(r)) walk(r);
        return true;
      }),
    );
    state.set(k, 'done');
  };
  for (const k of order) if (!state.has(k)) walk(k);
  const readers = new Map(order.map((k) => [k, [] as string[]]));
  for (const k of order) for (const r of acyclic.get(k)!) readers.get(r)!.push(k);

  // The longest path to a root, each way: a part sits one past the deepest part it reads (or is read by).
  const depthBy = (next: (key: string) => readonly string[]) => {
    const depth = new Map<string, number>();
    const of = (k: string): number => {
      if (!depth.has(k)) depth.set(k, Math.max(0, ...next(k).map((n) => of(n) + 1)));
      return depth.get(k)!;
    };
    for (const k of order) of(k);
    return depth;
  };
  const tree = (next: (key: string) => readonly string[], prefer: (key: string, candidate: string) => number) => {
    const depth = depthBy(next);
    const parent = new Map<string, string>();
    for (const k of order) {
      const candidates = next(k).filter((n) => depth.get(n) === depth.get(k)! - 1);
      candidates.sort((a, b) => prefer(k, a) - prefer(k, b) || rankBy.get(a)! - rankBy.get(b)!);
      if (candidates[0] !== undefined) parent.set(k, candidates[0]);
    }
    const nodeOf = (k: string): OutlineNode => ({
      part: byKey.get(k)!,
      children: order.filter((c) => parent.get(c) === k).map(nodeOf),
    });
    return order.filter((k) => !parent.has(k)).map(nodeOf);
  };

  // From the ground, a part sits under what its arguments name first (`&harm from … &key` under the key), then by
  // the wire it reads it through.
  const named = (k: string, candidate: string) => {
    const args = Object.values(byKey.get(k)!.args ?? {});
    return args.some((a) => byKey.get(candidate)!.heads.includes(a.trim())) ? -1 : reads.get(k)!.get(candidate)!;
  };
  const ground = tree((k) => acyclic.get(k)!, named);
  const outputs = tree(
    (k) => readers.get(k)!,
    (k, candidate) => reads.get(candidate)!.get(k)!,
  );
  return { parts, ground, outputs };
}
