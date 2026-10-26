/** Phase 1: the declarations — one per name, the default grid and scale() tables added, over= chains known and acyclic. */
import { type CellDecl, type Ref, type Token } from '../ast';
import type { Ctx } from './context';
/** The declarations, as declare() hands them on. */
export interface Declared {
    /** Every cell's declaration by name, the implicit ones (the default grid, scale() tables) included. */
    readonly decls: ReadonlyMap<string, CellDecl>;
    /** Cells added for a scale(tonic, phase) shorthand, or the kit of a stepped braid of voices: not drawn. */
    readonly implicit: ReadonlySet<string>;
    /** The default grid wasn't declared, so it was added. */
    readonly implicitRoot: boolean;
    /** Which cells' over= chains are sound (known, acyclic). */
    readonly overOk: ReadonlyMap<string, boolean>;
    /**
     * Sections of an arrangement (decisions 016 and 044), each to its table: a stepped table of names
     * (`&sections step=&bar &keys &drums`) declares the names it doesn't find as its sections, each stepped as the table
     * was; the table is then a table.
     */
    readonly sections: ReadonlyMap<string, string>;
    /** The stacks a gate plays (#287: `&drums play=&drumlines &kit`): parts, each line played, not mixes of their own. */
    readonly stacks: ReadonlySet<string>;
    /** The piece's main key, which a bare `over=key` reads (#124): the first cell in the text whose braid is `scale(…)`. */
    readonly mainKey?: string;
}
export declare function declare(ctx: Ctx): Declared;
/** The kit that grooves and their motifs read: every voice they name. */
export declare const VOICE_KIT = "kit:voices";
/**
 * Grooves: stepped cells whose steps are voices, rests, chords of voices and drum motifs; drum motifs:
 * unstepped cells of the same, spliced by a groove (and read through nothing: a braid of voices read
 * with over= is a kit, by number). Their voices in the order first written, and each one's steps as
 * numbers into them — or null when the piece has none.
 */
export declare function voiceGrooves(decls: ReadonlyMap<string, CellDecl>): {
    voices: Ref[];
    cells: Map<string, Token[]>;
} | null;
