import { type CompileResult, type Output } from './program';
import type { GraphModel } from './graph';
export interface Routing {
    /** Node ids (`cell:name`). */
    readonly nodes: ReadonlySet<string>;
    /** Edge ids, as written (graph.ts: before petals redraw them; see `drawn`). */
    readonly edges: ReadonlySet<string>;
}
/** A node's or an edge's state: switched off, not part of anything that sounds, part of it (stopped), not now (playing), now. */
export type State = 'off' | 'unrouted' | 'on' | 'idle' | 'live';
/** A routing being gathered: nodes and edges by name, nothing switched off. */
export declare class RouteAcc {
    readonly result: CompileResult;
    readonly muted: ReadonlySet<string>;
    readonly nodes: Set<string>;
    readonly edges: Set<string>;
    constructor(result: CompileResult, muted: ReadonlySet<string>);
    off(name: string): boolean;
    node(name: string): void;
    /** An edge (and its ends), unless an end is switched off. */
    edge(from: string, to: string, id?: string): void;
    /** A table and every table below it; `from` reads it through over= (drawn as an edge). */
    tables(table: string, from?: string): void;
    private clocked;
    /** What moves a cell in time: its step= chain, and its clock's tables. */
    clock(name: string): void;
    /** The clocks its parameters take their times from (delaytime=&bar*4/3, a tape's length=, a head's at=). */
    timed(name: string): void;
    /**
     * A braid, all the way down: the cells it splices and the tables their notes resolve through
     * (as plan's flatten: a cell whose tables are switched off plays nothing). A table is credited to
     * the cell that lends it (`from`, its over=) when a note resolves through it. True if anything plays.
     */
    braid(name: string, ctx: string, from?: string | null, seen?: Set<string>): boolean;
    /** A cell that moves something (a pitch or volume stream, a parameter): its braid and its clock. */
    stream(name: string): void;
    /** What moves a voice besides its notes: parameter cells, FM modulators (and theirs). */
    voice(name: string, seen?: Set<string>): void;
}
/**
 * How an output's notes are drawn into the route: all of its braid (what can play), or only what
 * plays now (the live view's descent). For a kit, which of its members it reaches.
 */
export interface NotesOf {
    braid(acc: RouteAcc, o: Output): void;
    members(o: Output): readonly string[];
}
/** Everything that can sound, with what's switched off left out. */
export declare function routing(result: CompileResult, muted: ReadonlySet<string>): Routing;
/**
 * What sounds now, given the outputs that play now and how each one's notes go now. Within the
 * routing: what the routing leaves out is never live.
 */
export declare function liveRouting(result: CompileResult, muted: ReadonlySet<string>, outs: readonly Output[], how: NotesOf): Routing;
/**
 * A routing in the graph as drawn: an edge a petal redraws is the edge it's drawn as; one that isn't drawn, left out.
 * A wire at a product's junction is routed when the written pairs it stands for are (graph.ts: `routes`), and the
 * junction with it.
 */
export declare function drawn(model: GraphModel, r: Routing): Routing;
/** What a node (by id) is drawn as. `live`: null at rest (stopped): nothing is dimmed, whatever sounds. */
export declare function nodeStateOf(id: string, muted: ReadonlySet<string>, routed: Routing, live: Routing | null): State;
/** What an edge is drawn as: off with either end; otherwise as the routing says (drawn ids: see `drawn`). */
export declare function edgeStateOf(e: {
    readonly id: string;
    readonly source: string;
    readonly target: string;
}, muted: ReadonlySet<string>, routed: Routing, live: Routing | null): State;
