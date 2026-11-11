import type { FromForm } from '../engine/parser/use';
import type { Meta } from './files';
import { type LearnedLayer, type WeightedPoint } from './fragments';
import { type Holes } from './holes';
/** One fragment file, as a frontend lists it. */
export interface CatalogueEntry {
    /** Its id, unique in the catalogue. */
    readonly id: string;
    /** Where it is in the seed library (`bass/01-root-bass`), its document for a part (`examples/kinderlied`), or null for one a layer filed. */
    readonly path: string | null;
    /** A part a document gives (decision 082): the document's key and the head it is taken by; absent for any other. */
    readonly part?: {
        readonly document: string;
        readonly head: string;
    };
    /** Who made it: its metadata's `source` (`seed`, a person's name, `muse`, `composer`), or null where it says none. */
    readonly source: string | null;
    /** The facets its points name, each once, in the order they first appear. */
    readonly facets: readonly string[];
    /** Its points: the file's own (a template's with their arguments), then those use added in the layer. */
    readonly association: readonly WeightedPoint[];
    /** The ids a query answers with: its own, or a template's sets of arguments taken (`diatonic(mode=aeolian)`). */
    readonly variants: readonly string[];
    /** Its cells text, as the file holds it. */
    readonly text: string;
    /** Its signature (decision 065): heads, optional parameters, main one; null for a collection. */
    readonly signature: Extract<FromForm, {
        kind: 'signature';
    }> | null;
    /** The ids it takes from (its own `from` lines, `references`), each once. */
    readonly takes: readonly string[];
    /** The Markdown after its cells, and its metadata: every frontmatter key but the entry's. */
    readonly prose: string;
    readonly meta: Meta;
    /** Its holes (`holesOf`): what it reads and doesn't define, what it defines, what its clock needs. Compiled on first read. */
    readonly holes: Holes;
}
/**
 * The library as a frontend lists it: the seed's files in path order, then the layer's filed ones, each an entry. The
 * same layer gives the same entries (kept, so their holes are compiled once); a layer is never changed.
 */
export declare function catalogue(layer?: LearnedLayer): readonly CatalogueEntry[];
