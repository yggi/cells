/**
 * Library-agnostic graph of a program: exactly the cells written in the code
 * (the implicit default grid stays hidden), with exactly the links written:
 * over=, &refs, step= and a mix's entries. Voice cells are drawn as voices; a product in a mix
 * (`&theme * &flute * .4`) is a junction, an unnamed node of its own (docs/notes/nets.md, decision 2).
 * Depth grows outward from the roots: a cell sits one ring beyond the table
 * it reads through and the cells it splices in; voices sit beyond what they play.
 */
import { type CompileResult, type ResolvedCell } from './program';
import type { Transform } from './transform';
export type GraphNode = {
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
    readonly reach?: {
        readonly room: number;
        readonly below: number;
    };
    /** An instrument's place in stereo and in the mix (as for voices). */
    readonly pan?: number;
    readonly order?: number;
} | {
    readonly id: string;
    readonly kind: 'voice';
    readonly depth: number;
    readonly cell: ResolvedCell;
    readonly petalOf?: string;
    /** Where it sits in stereo: −1 left … 1 right (from its levels in each channel). */
    readonly pan?: number;
    /** Its place in the mix, as written (first = 0). */
    readonly order?: number;
} | {
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
type CellNode = Exclude<GraphNode, {
    kind: 'junction';
}>;
export declare const isCellNode: (n: GraphNode) => n is CellNode;
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
     * What the reader does to what it carries (engine/transform.ts), for each place the name is written on the reader's line,
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
     * The bulb on its source's wheel it leaves from (a cell's name): a section drawn on its table (decision 016), what it
     * steps a sub-net from there.
     */
    readonly bulb?: string;
    /** Where that bulb's hub is from its wheel's centre (px, the wheel at its size in the graph), and its disc's radius. */
    readonly bulbAt?: {
        readonly x: number;
        readonly y: number;
        readonly r: number;
    };
}
/**
 * A wire into what plays it: a melody into its voice, its envelope, levels, pitch, parameters, FM, what excites, couples,
 * writes or plays it. Not ticks: a parameter's clock (`delaytime=&bar*4/3`) is timing, as a step is.
 */
export declare const feeds: (e: {
    readonly port: string;
    readonly band: string;
}) => boolean;
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
    /** Its readers, an edge each (the layout lays them as a ratsnest). */
    readonly readers: readonly string[];
    /**
     * Its readers read it at a delay (docs/decisions/010-canon-copies.md): a canon's copies (`&john[<<1]`), a tape's heads
     * (`at=`). Each delay counts from the owner, so each reader leaves the owner (a star, as a tape's heads leave the tape),
     * never from another reader, where its label would read as a delay from there.
     */
    readonly delayed: boolean;
    /** The bulb on the owner's wheel it leaves from (GraphEdge.bulb): a section's sub-net, from its place on its table. */
    readonly bulb?: string;
    /** Where that bulb's hub is from the owner's centre, and its disc's radius (GraphEdge.bulbAt). */
    readonly bulbAt?: {
        readonly x: number;
        readonly y: number;
        readonly r: number;
    };
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
export declare const isTurntable: (c: ResolvedCell) => boolean;
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
export declare function writtenGraph(result: CompileResult): WrittenGraph;
/**
 * The nets among the edges: a table read by two or more (over=), a melody or a voice by two or more, a cell read at
 * delays (a canon's copies, a tape's heads: docs/decisions/010-canon-copies.md), and each meter's ticks to every cell
 * it steps or that takes a time from it (a step or a parameter's clock into a meter, `delaytime=&bar*4/3`; not through
 * a belt: a belt is a body, drawn). A meter's net is its `step` net, whichever port each reader reads it through.
 */
export declare function netsOf(nodes: readonly GraphNode[], edges: readonly GraphEdge[]): GraphNet[];
/** Changes only when the set of nodes or edges changes — not when contents do. */
export declare function structureKey(model: GraphModel): string;
export {};
