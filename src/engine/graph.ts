/**
 * Library-agnostic graph of a program: exactly the cells written in the code
 * (the implicit default grid stays hidden), with exactly the links written:
 * over=, &refs, step= and a mix's entries. Voice cells are drawn as voices; a product in a mix
 * (`&theme * &flute * .4`) is a junction, an unnamed node of its own (docs/notes/nets.md, decision 2).
 * Depth grows outward from the roots: a cell sits one ring beyond the table
 * it reads through and the cells it splices in; voices sit beyond what they play.
 */
import { isMidiCard, type CompileResult, type ResolvedCell } from './program';
import type { Atom, Binding, Pick, ValueMap } from './ast';
import { leaves } from './subseq';
import { cellId, clockTapId, edgeId, junctionId, stepEdgeId } from './ids';
import { VOICE_KIT } from './compiler/declare';
import { refsOf } from './readers';
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
       * decision 2), drawn as an unnamed gate (#234): its terms go in (the melody, levels, pitches, an envelope), its
       * notes go out to its voice (an `is` wire), and the voice's sound goes on into the mix from the voice. Not a cell:
       * nothing to open, turn or switch off.
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
      /** What it plays, as a gate's meter draws it (#234): the term that starts its notes, its levels, its gain. */
      readonly notes: string | null;
      readonly levels: readonly string[];
      readonly gain: number;
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
   * `midi` (a MIDI card's entry: notes, a bus of gate and pitch),
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
  /**
   * At a product's junction: the voice whose sound it carries or makes (what its pulse and colour follow). On a pattern
   * of voices spliced into another (a braid wire of sound): the first voice it splices in.
   */
  readonly sound?: string;
  /** A note wire out of a gate or a product's junction (#234): the cell whose notes it carries (its steps pulse along it). */
  readonly notes?: string;
  /**
   * A wire at a product's junction stands for written pairs the routing knows (engine/routing.ts: the melody into its
   * voice, the voice into the mix): it is routed (and live) when, of each group, one of these is (`drawn`).
   */
  readonly routes?: readonly (readonly string[])[];
  /**
   * The bulb on its source's wheel it leaves from (a cell's name): a tap of a meter's bus drawn on its table (decision 016),
   * what it steps a sub-net from there.
   */
  readonly bulb?: string;
  /** Where that bulb's hub is from its wheel's centre (px, the wheel at its size in the graph), and its disc's radius. */
  readonly bulbAt?: { readonly x: number; readonly y: number; readonly r: number };
}

/** The ports that make the graph's structure rather than feed what plays: a table read, a ref, a step, a mix's or a MIDI card's entry, a product's voice, a note's link, a copy's base. */
const STRUCTURE = new Set(['over', 'braid', 'step', 'mix', 'midi', 'is', 'about', 'base']);
/**
 * A wire into what plays it: a melody into its voice, its envelope, levels, pitch, parameters, FM, what excites, couples,
 * writes or plays it. Not ticks: a parameter's clock (`delaytime=&bar*4/3`) is timing, as a step is.
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
  /** The bulb on the owner's wheel it leaves from (GraphEdge.bulb): a tap's sub-net, from its place on its table. */
  readonly bulb?: string;
  /** Where that bulb's hub is from the owner's centre, and its disc's radius (GraphEdge.bulbAt). */
  readonly bulbAt?: { readonly x: number; readonly y: number; readonly r: number };
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

/**
 * The graph of what is written, before it is drawn (layout/drawn.ts `buildGraph` makes the graph as drawn from it: petals,
 * bulbs, show=off): every cell its own node, every written link its wire. `through`: the written pairs drawn through a
 * product's junction (not drawn themselves: their wires at the junction stand for them).
 */
export interface WrittenGraph {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly through: ReadonlySet<string>;
}

/** The graph of what is written (WrittenGraph). */
export function writtenGraph(result: CompileResult): WrittenGraph {
  const edges: GraphEdge[] = [];
  const depth = new Map<string, number>();
  // meters: clocks whose entries place beats in a bar (agogic, even) — not a vibrato looping at a rate
  const meters = new Set([...result.clocks.values()].filter((c) => c.positional).map((c) => c.cell));
  const playedBy = new Map<string, string[]>();
  // (an output played off a tape comes from its read head, not the tape's source)
  const from = (o: (typeof result.outputs)[number]) => (o.tape ? o.tape.head : o.cell);
  // (a drone plays its voice alone: nothing plays it)
  for (const o of result.outputs) if (!o.drone) playedBy.set(o.voice, [...(playedBy.get(o.voice) ?? []), from(o)]);

  const depthOf = (name: string, guard = 0): number => {
    const hit = depth.get(name);
    if (hit !== undefined) return hit;
    const c = result.cells.get(name);
    let d = 1;
    if (c && guard < 64) {
      if (c.root) d = 0;
      else if (c.mix) {
        for (const b of c.mix) d = Math.max(d, depthOf(b.voice.name, guard + 1) + 1);
      } else if (c.chords) {
        // (a MIDI card: past what it sends, as a sound card is past what it hears)
        for (const b of c.chords.flatMap((x) => x ?? [])) d = Math.max(d, depthOf(b.voice.name, guard + 1) + 1);
        for (const k of c.children.keys()) d = Math.max(d, depthOf(k, guard + 1) + 1);
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

  // (the implicit cells stay hidden, but for the kit the grooves read: drawn as the piece's drum kit, the voices only
  // grooves play its pieces, each name a groove writes a wire into its piece; decision 021; docs/ui/graph.md)
  const shown = (name: string) => !result.cells.get(name)?.implicit || name === VOICE_KIT;
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
  /** Written pairs the routing knows that are drawn through a junction (its wires' `routes`). */
  const through = new Set<string>();
  // What sounds: a wire out of it carries sound — into a tape, a read head, or spliced into a reader: a mix into the
  // sound card or a scope, a voice into a pattern of voices, and so on up (#238): a cell whose braid splices in
  // something that sounds sounds too (a pattern of voices spliced into another, &break &pat &pat[::-1])
  const soundsItself = (c: ResolvedCell) => c.voice || !!c.mix || c.kit || result.tapes.some((t) => t.name === c.name) || result.returns.some((r) => r.head === c.name);
  // (what a cell's braid splices in: its refs, and the voices of an unnamed kit it reads, `over=&(&bd &sd)`)
  const spliced = (c: ResolvedCell): string[] => {
    const kit = c.over ? result.cells.get(c.over) : undefined;
    return [...c.children.keys(), ...(kit?.implicit && kit.kit ? refsOf(kit) : [])];
  };
  const heard = new Set([...result.cells.values()].filter(soundsItself).map((c) => c.name));
  for (let grew = true; grew;) {
    grew = false;
    for (const c of result.cells.values())
      if (!heard.has(c.name) && spliced(c).some((k) => heard.has(k))) {
        heard.add(c.name);
        grew = true;
      }
  }
  const sounds = (name: string) => heard.has(name);
  // (the sound a wire out of a pattern carries, for its colour: the first voice, mix or tape it splices in, however deep)
  const soundOf = (name: string, seen = new Set<string>()): string | undefined => {
    const c = result.cells.get(name);
    if (!c || seen.has(name)) return undefined;
    if (soundsItself(c)) return name;
    seen.add(name);
    for (const k of spliced(c)) if (heard.has(k)) return soundOf(k, seen);
    return undefined;
  };
  // (a braid wire's band, and the sound it carries when that isn't its source's own: a pattern's first voice)
  const spliceBand = (child: string): Band => (sounds(child) ? 'audio' : 'cv');
  const spliceSound = (child: string) => {
    const sound = sounds(child) ? soundOf(child) : undefined;
    return sound && sound !== child ? { sound } : {};
  };
  for (const c of result.cells.values()) {
    if (!shown(c.name)) continue;
    const id = cellId(c.name);
    if (c.voice) nodes.push({ id, kind: 'voice', depth: depthOf(c.name), cell: c });
    else nodes.push({ id, kind: 'cell', depth: depthOf(c.name), cell: c, isMeter: meters.has(c.name) });
    // (a groove reads the drums' kit, but writes no over=: its wires are the names it writes, below)
    if (c.over && c.over !== VOICE_KIT)
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
      for (const a of c.units.flatMap((u) => leaves(u.atom)))
        for (const i of a.kind === 'note' ? [a.value] : a.kind === 'chord' ? a.notes : []) written.set(members[i], (written.get(members[i]) ?? 0) + 1);
      for (const [child, count] of written)
        link({
          id: edgeId(id, cellId(child)),
          source: id,
          target: cellId(child),
          count,
          transforms: Array.from({ length: count }, () => []),
          ...spliceSound(child),
          ...wire('braid', spliceBand(child), id, cellId(child), 1, true, true),
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
      // a cell named as a MIDI card's entry: its notes go out there, a note bus into the card (along the flow, as a mix's entry)
      if (isMidiCard(c)) {
        link({ id: edgeId(id, cellId(child)), source: id, target: cellId(child), count, transforms: AS_IS, ...wire('midi', 'cv', id, cellId(child), 1, true) });
        continue;
      }
      // a gate spliced in (`&out map=sample &drums`): its sound is the voices it plays, each in from its own wheel (#234)
      const gate = result.cells.get(child);
      if (gate?.gate && spliceBand(child) === 'audio') {
        through.add(edgeId(id, cellId(child)));
        for (const r of gateVoices(result, gate)) {
          const v = cellId(r.name);
          link({
            id: edgeId(id, v),
            source: id,
            target: v,
            count,
            transforms: AS_IS,
            sound: r.name,
            routes: [[edgeId(cellId(r.via), cellId(child))], [edgeId(id, cellId(child))]],
            ...wire('braid', 'audio', id, v, 1, true),
          });
        }
        continue;
      }
      link({
        id: edgeId(id, cellId(child)),
        source: id,
        target: cellId(child),
        count,
        // (each place it is written in this cell's steps: its pick or shift, operations, transposition)
        transforms: c.units.flatMap((u) => leaves(u.atom).flatMap((a) => (a.kind === 'ref' && a.name === child ? [refTransform(a)] : []))),
        ...spliceSound(child),
        ...wire('braid', spliceBand(child), id, cellId(child), chord(child), true, true),
      });
    }
    // a note's links: what it explains
    for (const target of c.about)
      if (result.cells.has(target))
        link({ id: edgeId(id, cellId(target)), source: id, target: cellId(target), count: 1, transforms: AS_IS, ...wire('about', 'none', id, cellId(target)) });
    // a copy's base (base=, decision 026): the cell it copies, into it, with the transposition written on it
    if (c.base && result.cells.has(c.base.name)) {
      const from = cellId(c.base.name);
      const ref = {
        pick: null,
        shift: 0,
        ...(c.base.transpose ? { transpose: c.base.transpose } : {}),
        ...(c.base.degree ? { values: { mul: 1 as const, add: c.base.degree } } : {}),
      };
      link({ id: edgeId(from, id), source: from, target: id, count: 1, transforms: [refTransform(ref)], ...wire('base', 'none', from, id, 1, false, true) });
    }
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
    // a parameter given as a clock (delaytime=&bar*4/3, length=, at=): a tap of the clock's ticks, at its rate as written;
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
  // a gate (play=, #234, decision 022): a named junction, drawn as a node of its own — its notes and levels in on ports
  // of their own, its notes out to the voices it plays; no junction for each of its products
  for (const c of result.cells.values()) {
    const g = c.gate;
    if (!g) continue;
    const into = cellId(c.name);
    const receivers = gateVoices(result, c);
    // (the written pairs the routing knows: each term into each voice it plays, each voice into the gate)
    const flows = [...new Set(receivers.map((r) => edgeId(cellId(r.via), into)))];
    for (const f of flows) through.add(f);
    for (const { name, port } of [{ name: g.notes, port: g.port as string }, ...g.levels]) {
      if (!result.cells.has(name)) continue;
      const pairs = receivers.flatMap((r) => soundsOf(result, r.via).map((v) => edgeId(cellId(name), cellId(v))));
      for (const id of pairs) through.add(id);
      link({
        id: edgeId(cellId(name), into),
        source: cellId(name),
        target: into,
        count: 1,
        transforms: AS_IS,
        ...(receivers[0] ? { sound: receivers[0].name } : {}),
        routes: [pairs, flows],
        ...wire(port, 'cv', cellId(name), into, name === g.notes ? chord(name) : 1),
      });
    }
    // its one output: a note bus to the voices it plays (a strand per note at once, its notes' chords), each voice
    // reading its notes there; their sound leaves from the voices themselves (below, `product`), not from the gate
    const notes = result.cells.has(g.notes) ? g.notes : null;
    for (const r of receivers) {
      const v = cellId(r.name);
      const pairs = notes ? soundsOf(result, r.via).map((x) => edgeId(cellId(notes), cellId(x))) : [];
      link({
        id: edgeId(into, v),
        source: into,
        target: v,
        count: 1,
        transforms: AS_IS,
        sound: r.name,
        ...(notes ? { notes } : {}),
        routes: pairs.length ? [pairs, [edgeId(cellId(r.via), into)]] : [[edgeId(cellId(r.via), into)]],
        ...wire('voice', 'cv', into, v, notes ? chord(notes) : 1),
      });
    }
  }
  // A MIDI card's entries are drawn the same way, into a port of their own (`midi`): a note bus, gate and pitch (the
  // sync and CV bands at once, the way MIDI to CV does: docs/notes/nets.md), not sound.
  const product = (c: ResolvedCell, b: Binding, entry: number, port: 'mix' | 'midi') => {
    if (!result.cells.has(b.voice.name)) return;
    const voice = cellId(b.voice.name);
    const into = cellId(c.name);
    const width = c.sink && c.units.length === 2 ? 2 : 1;
    const band: Band = port === 'midi' ? 'cv' : 'audio';
    const gain: readonly Transform[] = [b.gain !== 1 ? [{ kind: 'gain', by: b.gain }] : []];
    // (the routing's flow from the sound into the mix: flows.ts)
    const flow = edgeId(voice, into);
    const terms = b.pitches.filter((t) => result.cells.has(t.ref.name));
    // a gate into a mix: its sound is the voices it plays, so each of them goes in, from its own wheel (the gate sends
    // them notes, above); the written pairs are the voice into the gate and the gate into the mix
    const gate = result.cells.get(b.voice.name)!;
    if (!terms.length && port === 'mix' && gate.gate) {
      through.add(flow);
      for (const r of gateVoices(result, gate)) {
        const v = cellId(r.name);
        link({
          id: edgeId(v, into),
          source: v,
          target: into,
          count: 1,
          transforms: gain,
          sound: r.name,
          routes: [[edgeId(cellId(r.via), voice)], [flow]],
          ...wire(port, band, v, into, width),
        });
      }
      return;
    }
    if (!terms.length) {
      link({ id: flow, source: voice, target: into, count: 1, transforms: gain, ...wire(port, band, voice, into, width) });
      return;
    }
    const j = junctionId(c.name, entry);
    const tags = c.tags.length ? c.tags : (result.cells.get(b.voice.name)?.tags ?? []);
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
    // what each term is in the product: the one that starts notes, an envelope, a level, a pitch
    const portOf = (name: string, inSum: boolean) => {
      const c0 = result.cells.get(name)!;
      return starter?.ref.name === name ? 'voice' : c0.map?.kind === 'adsr' ? 'env' : isLevel(c0, inSum) ? 'level' : 'pitch';
    };
    const levels = [...byTerm].flatMap(([name, ts]) => (portOf(name, !!ts[0].inSum) === 'level' ? [name] : []));
    junctions.push({
      id: j,
      kind: 'junction',
      depth: depthOf(b.voice.name),
      mix: c.name,
      entry,
      voice: b.voice.name,
      tags,
      notes: starter?.ref.name ?? null,
      levels,
      gain: b.gain,
    });
    for (const [name, ts] of byTerm) {
      const t = ts[0];
      const lead = !!starter && starter.ref.name === name;
      const port = portOf(name, !!t.inSum);
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
    // its notes out to its voice (the junction is the voice played: `is`), as wide as its notes at once; the voice's sound
    // goes on into the mix from the voice's own wheel
    const notesWidth = starter ? tines(result, b.voice.name) || chord(starter.ref.name) : 1;
    link({
      id: edgeId(j, voice),
      source: j,
      target: voice,
      count: 1,
      transforms: AS_IS,
      sound,
      ...(starter ? { notes: starter.ref.name } : {}),
      routes: [[flow]],
      ...wire('is', 'cv', j, voice, notesWidth),
    });
    // (one wire from a voice into a mix, however many of its products go in: its gain on it only when it is one)
    const twins = (port === 'midi' ? (c.chords ?? []).flatMap((bs) => bs ?? []) : (c.mix ?? [])).filter((x) => x.voice.name === b.voice.name).length;
    through.delete(flow);
    link({ id: flow, source: voice, target: into, count: 1, transforms: twins > 1 ? AS_IS : gain, sound, routes: [[flow]], ...wire(port, band, voice, into) });
  };
  for (const c of result.cells.values()) {
    if (!c.gate) (c.mix ?? []).forEach((b, entry) => product(c, b, entry, 'mix'));
    // (a MIDI card's products, numbered on from its own: their junctions are its entries)
    (c.chords ?? []).flatMap((bs) => bs ?? []).forEach((b, entry) => product(c, b, entry, 'midi'));
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
    if (!n.cell || !pans.has(n.cell.name)) return n;
    const [l, r] = pans.get(n.cell.name)!;
    return { ...n, pan: l + r > 0 ? (r - l) / (l + r) : 0, order: Math.max(0, order.indexOf(n.cell.name)) } as GraphNode;
  });
  return { nodes: [...placed, ...junctions], edges, through };
}

/** In a product, a volume rather than a pitch: map=amp or db, or map=lin as a bare factor (algebra.ts). */
const isLevel = (c: ResolvedCell, inSum: boolean) => c.map?.kind === 'amp' || c.map?.kind === 'db' || (c.map?.kind === 'lin' && !inSum);

/** The voices a mix's entry plays on (as compile expands it): an instrument's own, the kit a pattern is read through. */
/**
 * The voices a gate plays, as drawn (decision 022): each receiver it names, with the voice its product plays (`via`):
 * the receiver itself, or the kit it made of several bare voices (declare.ts: gates).
 */
function gateVoices(result: CompileResult, c: ResolvedCell): { name: string; via: string }[] {
  const vias = new Set((c.mix ?? []).map((b) => b.voice.name));
  const kit = `${c.name}:kit`;
  return (c.gate?.receivers ?? []).filter((r) => result.cells.has(r)).map((name) => ({ name, via: vias.has(name) ? name : vias.has(kit) ? kit : name }));
}

function soundsOf(result: CompileResult, name: string, guard = 0): string[] {
  const c = result.cells.get(name);
  if (c?.mix && !c.sink && guard < 16) return c.mix.flatMap((b) => soundsOf(result, b.voice.name, guard + 1));
  const kit = c?.over ? result.cells.get(c.over) : undefined;
  return [kit?.kit ? kit.name : name];
}

/** A step's rate as written (step=&x*3/2, cycle(&x), loop=, belt=); nothing when it is the driver's own. */
const rateOf = (c: ResolvedCell): Transform => rateTransform(c.step!, typeof c.params.belt === 'number' ? c.params.belt : undefined);

/** A clock's rate as written (`&x*3/2`, `cycle(&x)`, the whole braid, through a belt); nothing when it is the clock's own. */
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
    // (a stack, [0 2, 4], as wide as its layers side by side; a subsequence as its widest step)
    const width = (a: Atom): number =>
      a.kind === 'chord'
        ? a.notes.length
        : a.kind === 'ref' && guard < 64
          ? of(a.name, guard + 1)
          : a.kind === 'seq'
            ? a.layers.reduce((n, l) => n + Math.max(1, ...l.map((t) => width(t.atom))), 0)
            : 1;
    let w = 1;
    for (const u of result.cells.get(name)?.units ?? []) w = Math.max(w, width(u.atom));
    memo.set(name, w);
    return w;
  };
  return (name) => of(name);
}

/** A table's entries: its cycle, or (a kit, a table of taps) the entries written. */
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
 * it steps or that takes a time from it (a step or a parameter's clock into a meter, `delaytime=&bar*4/3`; not through
 * a belt: a belt is a body, drawn). A meter's net is its `step` net, whichever port each tap reads it through.
 */
export function netsOf(nodes: readonly GraphNode[], edges: readonly GraphEdge[]): GraphNet[] {
  const meters = new Set(nodes.flatMap((n) => (n.kind === 'cell' && n.isMeter ? [n.id] : [])));
  const groups = new Map<string, { port: string; taps: GraphEdge[] }>();
  for (const e of edges) {
    // (a tap's steps, from its bulb on its table: a sub-net of the meter's bus, decision 016)
    const port =
      BUS_PORTS.has(e.port) || DELAY_PORTS.has(e.port) ? e.port : e.band === 'sync' && !e.belt && (meters.has(e.target) || (e.bulb && e.port === 'step')) ? 'step' : null;
    if (!port) continue;
    const at = `${e.from}|${port}|${e.bulb ?? ''}`;
    const g = groups.get(at) ?? { port, taps: [] };
    g.taps.push(e);
    groups.set(at, g);
  }
  return [...groups.values()]
    .filter(({ port, taps }) => (taps.length > 1 || port === 'step') && (!DELAY_PORTS.has(port) || taps.some(isDelayed)))
    .map(({ port, taps }) => {
      const { bulb, bulbAt } = taps[0];
      return {
        id: `net:${taps[0].from}:${port}${bulb ? `:${bulb}` : ''}`,
        owner: taps[0].from,
        port,
        band: taps[0].band,
        taps: taps.map((e) => e.id),
        delayed: taps.some(isDelayed),
        ...(bulb ? { bulb } : {}),
        ...(bulbAt ? { bulbAt } : {}),
      };
    });
}

/** Changes only when the set of nodes or edges changes — not when contents do. */
export function structureKey(model: GraphModel): string {
  return [...model.nodes.map((n) => n.id).sort(), '|', ...model.edges.map((e) => e.id).sort()].join(' ');
}
