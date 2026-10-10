/**
 * Library-agnostic graph of a program: exactly the cells written in the code
 * (the implicit default grid stays hidden), with exactly the links written:
 * over=, &refs, step= and a mix's entries. Voice cells are drawn as voices; a product in a mix
 * (`&theme * &flute * .4`) is a junction, an unnamed node of its own (docs/notes/nets.md, decision 2).
 * Depth grows outward from the roots: a cell sits one ring beyond the table
 * it reads through and the cells it splices in; voices sit beyond what they play.
 */
import { effectiveShow, pluginOf } from '../layout/show';
import { trackRoom } from '../layout/track';
import type { CompileResult, ResolvedCell } from './program';
import type { Pick, ValueMap } from './ast';
import { cellId, clockTapId, edgeId, junctionId, stepEdgeId } from './ids';
import type { Transform } from './transform';

export type GraphNode =
  | {
      readonly id: string;
      readonly kind: 'cell';
      readonly depth: number;
      readonly cell: ResolvedCell;
      readonly isMeter: boolean;
      readonly petalOf?: string;
      /**
       * A braid's bulbs (#221), at its size in the graph: how far they reach past its wheel (px, the layout's room for
       * them), and below it (where its name goes).
       */
      readonly reach?: { readonly room: number; readonly below: number };
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
    }
  | {
      /**
       * A product in a mix (`&theme * &flute * .4`): an unnamed node, as `&( … )` is an unnamed cell (docs/notes/nets.md,
       * decision 2). Its terms go in (the melody, levels, pitches, an envelope), the voice is its definition (an `is`
       * wire, dotted), and its sound goes out into the mix. Not a cell: nothing to open, turn or switch off.
       */
      readonly id: string;
      readonly kind: 'junction';
      readonly depth: number;
      /** The mix whose line writes it, and its place among that mix's entries (first = 0). */
      readonly mix: string;
      readonly entry: number;
      /** The sound it is: the voice (or an instrument, a kit's pattern) written in the product. */
      readonly voice: string;
      /** Its mix's tags (else its voice's): the cluster it is laid out in. */
      readonly tags: readonly string[];
      readonly cell?: undefined;
      readonly petalOf?: undefined;
      readonly pan?: undefined;
      readonly order?: undefined;
    };

/** A cell's node (not a product's junction). */
type CellNode = Exclude<GraphNode, { kind: 'junction' }>;
export const isCellNode = (n: GraphNode): n is CellNode => n.kind !== 'junction';

/**
 * What a wire carries (docs/notes/nets.md): ticks (a clock, a gate), values (pitch, level, a table) or sound.
 * A note's link (about=) carries nothing.
 */
type Band = 'sync' | 'cv' | 'audio' | 'none';

/** What an edge is as a wire, read from the code: from the cell whose values travel, into a port of the cell that takes them. */
interface Wire {
  /**
   * Where the code reads it: `over`, `step`, `braid` (a ref), `voice` (a melody playing it), `env`, `level`, `pitch`, `mix`,
   * `is` (a product's voice, its definition), `about`, or the attribute (`lpf`, `fm`, `write`, `play` …).
   */
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
  /** How many slots of the source play the target (refs). */
  readonly count: number;
  /**
   * What the tap does to what it carries (engine/transform.ts), for each place the name is written on the reader's line,
   * in order: a ref written three times has three (`&tune &up &up^$7`: none, none, ^$7), most wires one. A product's
   * terms carry theirs into its junction, its gain is on the wire out of it.
   */
  readonly transforms: readonly Transform[];
  /** At a product's junction: the voice whose sound it carries or makes (what its pulse and colour follow). */
  readonly sound?: string;
  /**
   * A wire at a product's junction stands for written pairs the routing knows (engine/routing.ts: the melody into its
   * voice, the voice into the mix): it is routed (and live) when, of each group, one of these is (`drawn`).
   */
  readonly routes?: readonly (readonly string[])[];
}

/** The ports that make the graph's structure rather than feed what plays: a table read, a ref, a step, a mix's entry, a product's voice, a note's link. */
const STRUCTURE = new Set(['over', 'braid', 'step', 'mix', 'is', 'about']);
/**
 * A wire into what plays it: a melody into its voice, its envelope, levels, pitch, parameters, FM, what excites, couples,
 * writes or plays it. Not ticks: a parameter's clock (`delaytime=&bar*3/4`) is timing, as a step is.
 */
export const feeds = (e: { readonly port: string; readonly band: string }) => !STRUCTURE.has(e.port) && e.band !== 'sync';

/** Nothing written: a wire that carries its source as it is. */
const AS_IS: readonly Transform[] = [[]];

/** What a reference does, as written: a pick or a shift (a delay, in steps), its values' operations, a transposition. */
function refTransform(r: { readonly pick: Pick | null; readonly shift: number; readonly transpose?: number; readonly values?: ValueMap; readonly sign?: 1 | -1 }): Transform {
  return [
    ...(r.pick ? [{ kind: 'pick', pick: r.pick } as const] : []),
    ...(r.shift ? [{ kind: 'delay', by: -r.shift, unit: 'step' } as const] : []),
    ...(r.values && r.values.mul < 0 ? [{ kind: 'inverse' } as const] : []),
    ...(r.values?.add ? [{ kind: 'degree', by: r.values.add } as const] : []),
    ...(r.transpose ? [{ kind: 'transpose', by: r.transpose, unit: 'grid' } as const] : []),
    ...(r.sign === -1 ? [{ kind: 'negate' } as const] : []),
  ];
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
  /**
   * Its taps read it at a delay (docs/decisions/010-canon-copies.md): a canon's copies (`&john[<<1]`), a tape's heads
   * (`at=`). Each delay counts from the owner, so each tap leaves the owner (a star, as a tape's heads leave the tape),
   * never from another reader, where its label would read as a delay from there.
   */
  readonly delayed: boolean;
}

export interface GraphModel {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly nets: readonly GraphNet[];
  /**
   * An edge drawn under another id (through a petal: to its parent), by its own id; undefined: not drawn (hidden, or a
   * written pair drawn through a product's junction: its wires say so, `routes`).
   */
  readonly alias: ReadonlyMap<string, string | undefined>;
  /**
   * The cells drawn as bulbs on another's track, by name: each to the cell that splices it (#221). A cell spliced into
   * one braid only, and read nowhere else, has no node of its own; its edges are drawn from that braid.
   */
  readonly bulbs: ReadonlyMap<string, string>;
}

/** A cell drawn as a turntable: a motor, a belted cell, a tape, a resonator's body. */
export const isTurntable = (c: ResolvedCell) =>
  typeof c.params.motor === 'number' || typeof c.params.belt === 'number' || typeof c.params.write === 'string' || typeof c.params.body === 'string';

/** `bulbs: false`: every cell its own node, splices used once too (the layout's tests of parts beside their players). */
export function buildGraph(result: CompileResult, opts: { readonly bulbs?: boolean } = {}): GraphModel {
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
  // (the tables of taps whose bus is drawn already)
  const buses = new Set<string>();
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
        count: 1,
        transforms: [c.overShift ? [{ kind: 'delay', by: -c.overShift, unit: 'step' }] : []],
        ...wire('over', 'cv', id, cellId(c.over), entries(result, c.over), true, true),
      });
    // a stepped braid of voices reads an unnamed kit of them: its voices are written on its own line
    const voiceKit = c.over ? result.cells.get(c.over) : undefined;
    if (voiceKit?.implicit && voiceKit.kit) {
      const members = voiceKit.units.map((u) => (u.atom.kind === 'ref' ? u.atom.name : ''));
      const written = new Map<string, number>();
      for (const u of c.units)
        for (const i of u.atom.kind === 'note' ? [u.atom.value] : u.atom.kind === 'chord' ? u.atom.notes : []) written.set(members[i], (written.get(members[i]) ?? 0) + 1);
      for (const [child, count] of written)
        link({
          id: edgeId(id, cellId(child)),
          source: id,
          target: cellId(child),
          count,
          transforms: Array.from({ length: count }, () => []),
          ...wire('braid', 'cv', id, cellId(child), 1, true, true),
        });
    }
    // resonators: coupled through the table (couple=), and what excites them
    if (typeof c.params.couple === 'string' && result.cells.has(c.params.couple))
      link({
        id: edgeId(id, cellId(c.params.couple)),
        source: id,
        target: cellId(c.params.couple),
        count: 1,
        transforms: AS_IS,
        ...wire('couple', 'audio', id, cellId(c.params.couple), 1, true),
      });
    if (typeof c.params.excite === 'string' && result.cells.has(c.params.excite))
      link({
        id: edgeId(cellId(c.params.excite), id),
        source: cellId(c.params.excite),
        target: id,
        count: 1,
        transforms: AS_IS,
        ...wire('excite', 'audio', cellId(c.params.excite), id),
      });
    // tapes: the source into the tape (written), the tape into each read head (played)
    if (typeof c.params.write === 'string' && result.cells.has(c.params.write))
      link({
        id: edgeId(cellId(c.params.write), id),
        source: cellId(c.params.write),
        target: id,
        count: 1,
        transforms: AS_IS,
        ...wire('write', sounds(c.params.write) ? 'audio' : 'cv', cellId(c.params.write), id, chord(c.params.write)),
      });
    if (typeof c.params.play === 'string' && result.cells.has(c.params.play))
      link({
        id: edgeId(cellId(c.params.play), id),
        source: cellId(c.params.play),
        target: id,
        count: 1,
        transforms: typeof c.params.at === 'number' ? [[{ kind: 'delay', by: c.params.at, unit: 'second' }]] : AS_IS,
        ...wire('play', sounds(c.params.play) ? 'audio' : 'cv', cellId(c.params.play), id, chord(c.params.play)),
      });
    // a voice's own envelope and pitch (env=, pitch=: on every note it plays)
    for (const [port, own] of [
      ['env', c.env],
      ['pitch', c.pitch],
    ] as const)
      if (own && result.cells.has(own))
        link({ id: edgeId(cellId(own), id), source: cellId(own), target: id, count: 1, transforms: AS_IS, ...wire(port, 'cv', cellId(own), id, chord(own)) });
    // its own wave's table (map=&curve: each value looked up in it, wave.ts): the cell indexes it, as over= is read, so a
    // bus as wide as the table; and it shapes every cycle the cell turns, as env= shapes every note: into it, as its own
    // (its own id: the same table may also be this cell's env=, pitch=, level= …, and one id is one edge)
    if (c.map?.kind === 'table' && result.cells.has(c.map.table)) {
      const table = cellId(c.map.table);
      link({
        id: clockTapId(table, id, 'map'),
        source: table,
        target: id,
        count: 1,
        transforms: AS_IS,
        ...wire('map', 'cv', table, id, entries(result, c.map.table), false, true),
      });
    }
    // FM: the modulator feeds its carrier
    if (typeof c.params.fm === 'string' && result.cells.has(c.params.fm))
      link({ id: edgeId(cellId(c.params.fm), id), source: cellId(c.params.fm), target: id, count: 1, transforms: AS_IS, ...wire('fm', 'audio', cellId(c.params.fm), id) });
    // a voice's moving parameters: their cells feed it (lpf, lpq …)
    for (const [key, pc] of Object.entries(c.paramCells ?? {}))
      for (const f of pc.factors)
        if (result.cells.has(f)) link({ id: edgeId(cellId(f), id), source: cellId(f), target: id, count: 1, transforms: AS_IS, ...wire(key, 'cv', cellId(f), id) });
    for (const [child, count] of c.children) {
      link({
        id: edgeId(id, cellId(child)),
        source: id,
        target: cellId(child),
        count,
        // (each place it is written in this cell's steps: its pick or shift, operations, transposition)
        transforms: c.units.flatMap((u) => (u.atom.kind === 'ref' && u.atom.name === child ? [refTransform(u.atom)] : [])),
        ...wire('braid', 'cv', id, cellId(child), chord(child), true, true),
      });
    }
    // a note's links: what it explains
    for (const target of c.about)
      if (result.cells.has(target))
        link({ id: edgeId(id, cellId(target)), source: id, target: cellId(target), count: 1, transforms: AS_IS, ...wire('about', 'none', id, cellId(target)) });
    // a tap's clock is written once, on its table's line (`&parts step=&bar`): one wire, the meter's bus into the table
    // (decision 016); the taps are the table's
    const table = result.taps?.get(c.name);
    if (c.step && table && !buses.has(table)) {
      buses.add(table);
      link({
        id: stepEdgeId(cellId(table), cellId(c.step.driver)),
        source: cellId(table),
        target: cellId(c.step.driver),
        count: 1,
        transforms: [rateOf(c)],
        ...wire('step', 'sync', cellId(table), cellId(c.step.driver), 1, true),
      });
    } else if (c.step && !table)
      // (a belt says so: the cell follows through a spring, not rigidly)
      link({
        id: stepEdgeId(id, cellId(c.step.driver)),
        source: id,
        target: cellId(c.step.driver),
        count: 1,
        transforms: [rateOf(c)],
        ...beltOf(c, result.cells.get(c.step.driver)),
        ...wire('step', 'sync', id, cellId(c.step.driver), 1, true),
      });
    // a parameter given as a clock (delaytime=&bar*3/4, length=, at=): a tap of the clock's ticks, at its rate as written;
    // into a meter, a tap of its net (ground), as a step is
    for (const [key, k] of Object.entries(c.paramClocks))
      if (result.cells.has(k.driver))
        link({
          id: clockTapId(id, cellId(k.driver), key),
          source: id,
          target: cellId(k.driver),
          count: 1,
          transforms: [rateTransform(k)],
          ...wire(key, 'sync', id, cellId(k.driver), 1, true),
        });
  }
  // a mix's entries (docs/notes/nets.md, decision 2). A sound alone goes in as it is (labelled with its gain when it isn't
  // 1); a product is a junction, an unnamed node as `&( … )` is an unnamed cell: each term written in it goes in (the
  // melody that plays it, levels, pitches, an envelope, with what is written on it), the voice is its definition (`is`),
  // and its sound goes out into the mix. Into a sound card of two channels, a pair (L R).
  const junctions: GraphNode[] = [];
  /** Written pairs the routing knows that are drawn through a junction (its wires' `routes`). */
  const through = new Set<string>();
  for (const c of result.cells.values())
    (c.mix ?? []).forEach((b, entry) => {
      if (!result.cells.has(b.voice.name)) return;
      const voice = cellId(b.voice.name);
      const into = cellId(c.name);
      const width = c.sink && c.units.length === 2 ? 2 : 1;
      const gain: readonly Transform[] = [b.gain !== 1 ? [{ kind: 'gain', by: b.gain }] : []];
      // (the routing's flow from the sound into the mix: flows.ts)
      const flow = edgeId(voice, into);
      const terms = b.pitches.filter((t) => result.cells.has(t.ref.name));
      if (!terms.length) {
        link({ id: flow, source: voice, target: into, count: 1, transforms: gain, ...wire('mix', 'audio', voice, into, width) });
        return;
      }
      const j = junctionId(c.name, entry);
      const tags = c.tags.length ? c.tags : (result.cells.get(b.voice.name)?.tags ?? []);
      junctions.push({ id: j, kind: 'junction', depth: depthOf(b.voice.name), mix: c.name, entry, voice: b.voice.name, tags });
      through.add(flow);
      const sound = b.voice.name;
      // (the voices the routing plays it on: an instrument's own, a kit for a pattern read through one)
      const voices = soundsOf(result, b.voice.name);
      const byTerm = new Map<string, typeof terms>();
      for (const t of terms) byTerm.set(t.ref.name, [...(byTerm.get(t.ref.name) ?? []), t]);
      // the term that starts notes: an output's, where it is written (a product written again, in another mix, is the
      // same output: its term by name)
      const startsAt = (t: (typeof terms)[number]) =>
        result.outputs.some((o) => {
          const at = `${o.voice}:${o.cell}:${t.ref.span.line}:${t.ref.span.col}`;
          return o.id === at || o.id.startsWith(at + '@');
        });
      const starter = terms.find(startsAt) ?? terms.find((t) => result.outputs.some((o) => voices.includes(o.voice) && (o.tape?.head ?? o.cell) === t.ref.name && !o.gate));
      for (const [name, ts] of byTerm) {
        const t = ts[0];
        const c0 = result.cells.get(name)!;
        // what the term is in the product: the one that starts notes, an envelope, a level, a pitch
        const lead = !!starter && starter.ref.name === name;
        const port = lead ? 'voice' : c0.map?.kind === 'adsr' ? 'env' : isLevel(c0, !!t.inSum) ? 'level' : 'pitch';
        const pairs = voices.map((v) => edgeId(cellId(name), cellId(v)));
        for (const id of pairs) through.add(id);
        link({
          id: edgeId(cellId(name), j),
          source: cellId(name),
          target: j,
          count: ts.length,
          transforms: ts.map((x) => [
            ...refTransform({ ...x.ref, sign: port === 'level' || port === 'env' ? 1 : x.sign }),
            ...(lead && x === t && b.offset ? [{ kind: 'transpose', by: b.offset, unit: 'semitone' } as const] : []),
          ]),
          sound,
          routes: [pairs, [flow]],
          ...wire(
            port,
            port === 'pitch' && isWave(result, name) ? 'audio' : 'cv',
            cellId(name),
            j,
            lead ? tines(result, b.voice.name) || chord(name) : port === 'env' ? 1 : chord(name),
          ),
        });
      }
      link({ id: edgeId(voice, j), source: voice, target: j, count: 1, transforms: AS_IS, sound, routes: [[flow]], ...wire('is', 'none', voice, j, 1, false, true) });
      // (a product goes into one channel: one wire)
      link({ id: edgeId(j, into), source: j, target: into, count: 1, transforms: gain, sound, routes: [[flow]], ...wire('mix', 'audio', j, into) });
    });
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
    if (!n.cell || !pans.has(n.cell.name)) return n;
    const [l, r] = pans.get(n.cell.name)!;
    return { ...n, pan: l + r > 0 ? (r - l) / (l + r) : 0, order: Math.max(0, order.indexOf(n.cell.name)) } as GraphNode;
  });
  return petals(result, [...placed, ...junctions], edges, through, opts.bulbs ?? true);
}

/** In a product, a volume rather than a pitch: map=amp or db, or map=lin as a bare factor (algebra.ts). */
const isLevel = (c: ResolvedCell, inSum: boolean) => c.map?.kind === 'amp' || c.map?.kind === 'db' || (c.map?.kind === 'lin' && !inSum);

/** The voices a mix's entry plays on (as compile expands it): an instrument's own, the kit a pattern is read through. */
function soundsOf(result: CompileResult, name: string, guard = 0): string[] {
  const c = result.cells.get(name);
  if (c?.mix && !c.sink && guard < 16) return c.mix.flatMap((b) => soundsOf(result, b.voice.name, guard + 1));
  const kit = c?.over ? result.cells.get(c.over) : undefined;
  return [kit?.kit ? kit.name : name];
}

/** A step's rate as written (step=&x*2/3, cycle(&x), loop=, belt=); nothing when it is the driver's own. */
const rateOf = (c: ResolvedCell): Transform => rateTransform(c.step!, typeof c.params.belt === 'number' ? c.params.belt : undefined);

/** A clock's rate as written (`&x*2/3`, `cycle(&x)`, the whole braid, through a belt); nothing when it is the clock's own. */
function rateTransform(s: NonNullable<ResolvedCell['step']>, belt?: number): Transform {
  if (!s.chain.length && !s.cycle && !s.whole && belt === undefined) return [];
  return [{ kind: 'rate', by: s.chain, per: s.cycle ? 'cycle' : 'step', whole: s.whole, ...(belt !== undefined ? { belt } : {}) }];
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
 * parent or repeat an edge already there. `through`: the written pairs drawn through a product's junction (not drawn
 * themselves: their wires at the junction stand for them).
 */
function petals(result: CompileResult, allNodes: GraphNode[], allEdges: GraphEdge[], through: ReadonlySet<string>, withBulbs: boolean): GraphModel {
  // show=off: not in the graph at all (nor a product in a mix that isn't)
  const off = (n: GraphNode) => effectiveShow(result, n.kind === 'junction' ? n.mix : n.cell.name).show === 'off';
  const hidden = new Set(allNodes.filter(off).map((n) => n.id));
  const nodes = allNodes.filter((n) => !hidden.has(n.id));
  const edges = allEdges.filter((e) => !hidden.has(e.source) && !hidden.has(e.target));
  const parentOf = new Map<string, string>();
  // a splice used once: a bulb on its host's track (#221)
  const bulbs = withBulbs ? bulbsOf(result, nodes, edges) : new Map<string, string>();
  for (const [id, host] of bulbs) parentOf.set(id, host);
  for (const n of nodes) {
    if (n.kind === 'junction' || bulbs.has(n.id)) continue;
    if (n.cell.lambda) {
      const line = /^λ(\d+)_/.exec(n.cell.name)?.[1];
      const parent = [...result.cells.values()].find((c) => !c.lambda && !c.implicit && c.span.line === +(line ?? -1));
      if (parent) parentOf.set(n.id, cellId(parent.name));
    } else if (effectiveShow(result, n.cell.name).show === 'petal') {
      // show=petal: hung from the cell that uses it (a voice: the mix it's in, or the mix of a product it is)
      const product = nodes.find((j) => j.kind === 'junction' && edges.some((e) => e.source === n.id && e.target === j.id && e.port === 'is'));
      const user =
        edges.find((e) => e.target === n.id && (e.port === 'braid' || e.port === 'over'))?.source ??
        edges.find((e) => e.source === n.id && (e.port === 'mix' || feeds(e)))?.target ??
        (product?.kind === 'junction' ? cellId(product.mix) : undefined);
      if (user) parentOf.set(n.id, user);
    }
  }
  // (a bulb's host may be a bulb itself: up to the one drawn)
  const up = (id: string) => {
    for (let guard = 0; parentOf.has(id) && guard < 64; guard++) id = parentOf.get(id)!;
    return id;
  };
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
    out.push({ ...e, id: edgeId(source, target) + (e.port === 'step' ? '~' : ''), source, target, from: up(e.from), to: up(e.to) });
  }
  const byPair = new Map<string, string>();
  for (const e of out) if (!byPair.has(key(e.source, e.target))) byPair.set(key(e.source, e.target), e.id);
  const alias = new Map<string, string | undefined>();
  for (const r of redrawn) alias.set(r.id, r.pair === null ? undefined : byPair.get(r.pair));
  for (const e of allEdges) if (hidden.has(e.source) || hidden.has(e.target)) alias.set(e.id, undefined);
  const drawnIds = new Set(out.map((e) => e.id));
  for (const id of through) if (!drawnIds.has(id) && !alias.has(id)) alias.set(id, undefined);
  const drawn = nodes.filter((n) => !bulbs.has(n.id)).map((n) => (n.kind !== 'junction' && parentOf.has(n.id) ? { ...n, petalOf: up(n.id) } : n));
  const names = (id: string) => id.slice('cell:'.length);
  const byName = new Map([...bulbs].map(([id, host]) => [names(id), names(host)]));
  // (a braid's wheel is 128 px across, size= scaling it: ui/flownode.ts)
  const reached = drawn.map((n) => {
    if (n.kind !== 'cell' || n.petalOf || !isTrack(result, n)) return n;
    const reach = trackRoom(result, n.cell.name, byName, 128 * n.cell.size);
    return reach ? { ...n, reach } : n;
  });
  return { nodes: reached, edges: out, nets: netsOf(reached, out), alias, bulbs: byName };
}

/** The shows that draw a cell as a track of steps in time (where a splice can be a bulb). */
const TRACKS: ReadonlySet<string> = new Set(['braid', 'pattern', 'notes', 'midi', 'do', 'degrees']);

/** A cell's node drawn as a track of steps (CellGlyph's braid): not a meter, a table, a mix, a scope, a plugin's wheel. */
const isTrack = (result: CompileResult, n: GraphNode) =>
  n.kind === 'cell' &&
  !n.isMeter &&
  !n.cell.root &&
  !n.cell.scan &&
  !n.cell.mix &&
  !n.cell.kit &&
  !n.cell.sink &&
  !n.cell.note &&
  typeof n.cell.params.scope !== 'string' &&
  !pluginOf(result, n.cell.name) &&
  TRACKS.has(effectiveShow(result, n.cell.name).show);

/**
 * The splices drawn as bulbs (#221), by node id, each to its host's: a cell read by one edge only, a ref without a pick
 * or a delay (a tap, a canon's copy: a net), both it and the braid that splices it drawn as tracks.
 */
function bulbsOf(result: CompileResult, nodes: readonly GraphNode[], edges: readonly GraphEdge[]): Map<string, string> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const reads = new Map<string, GraphEdge[]>();
  for (const e of edges) reads.set(e.from, [...(reads.get(e.from) ?? []), e]);
  const track = (n: GraphNode | undefined) => !!n && isTrack(result, n);
  const out = new Map<string, string>();
  for (const n of nodes) {
    const r = reads.get(n.id) ?? [];
    if (r.length !== 1 || r[0].port !== 'braid' || r[0].transforms.some((t) => t.some((x) => x.kind === 'pick' || x.kind === 'delay'))) continue;
    if (track(n) && track(byId.get(r[0].to))) out.set(n.id, r[0].to);
  }
  return out;
}

const bulbMemo = new WeakMap<CompileResult, ReadonlyMap<string, string>>();
/** The cells drawn as bulbs, by name, each to the cell that splices it (GraphModel.bulbs), for drawing a wheel. */
export function bulbHosts(result: CompileResult): ReadonlyMap<string, string> {
  let hit = bulbMemo.get(result);
  if (!hit) bulbMemo.set(result, (hit = buildGraph(result).bulbs));
  return hit;
}

/**
 * The ports whose edges from one cell to several make a net laid as a bus: a table read through over=, a melody
 * playing several voices, a voice into several mixes (the sound card's channels), a voice that several products are.
 */
const BUS_PORTS = new Set(['over', 'voice', 'mix']);
/**
 * The ports whose edges make a net only when a tap is delayed: a cell spliced into several, one of them a copy a step
 * later (`&john[<<1]`); a tape's heads (`play=` … `at=`). Refs without a delay stay edges of their own.
 */
const DELAY_PORTS = new Set(['braid', 'play']);

/** A tap that reads at a delay: a copy (`[<<n]`, steps) or a tape's head (`at=`, seconds). */
const isDelayed = (e: GraphEdge) => e.transforms.some((t) => t.some((s) => s.kind === 'delay'));

/**
 * The nets among the edges: a table read by two or more (over=), a melody or a voice by two or more, a cell read at
 * delays (a canon's copies, a tape's heads: docs/decisions/010-canon-copies.md), and each meter's ticks to every cell
 * it steps or that takes a time from it (a step or a parameter's clock into a meter, `delaytime=&bar*3/4`; not through
 * a belt: a belt is a body, drawn). A meter's net is its `step` net, whichever port each tap reads it through.
 */
export function netsOf(nodes: readonly GraphNode[], edges: readonly GraphEdge[]): GraphNet[] {
  const meters = new Set(nodes.flatMap((n) => (n.kind === 'cell' && n.isMeter ? [n.id] : [])));
  const groups = new Map<string, { port: string; taps: GraphEdge[] }>();
  for (const e of edges) {
    const port = BUS_PORTS.has(e.port) || DELAY_PORTS.has(e.port) ? e.port : e.band === 'sync' && !e.belt && meters.has(e.target) ? 'step' : null;
    if (!port) continue;
    const g = groups.get(`${e.from}|${port}`) ?? { port, taps: [] };
    g.taps.push(e);
    groups.set(`${e.from}|${port}`, g);
  }
  return [...groups.values()]
    .filter(({ port, taps }) => (taps.length > 1 || port === 'step') && (!DELAY_PORTS.has(port) || taps.some(isDelayed)))
    .map(({ port, taps }) => ({ id: `net:${taps[0].from}:${port}`, owner: taps[0].from, port, band: taps[0].band, taps: taps.map((e) => e.id), delayed: taps.some(isDelayed) }));
}

/** Changes only when the set of nodes or edges changes — not when contents do. */
export function structureKey(model: GraphModel): string {
  return [...model.nodes.map((n) => n.id).sort(), '|', ...model.edges.map((e) => e.id).sort()].join(' ');
}
