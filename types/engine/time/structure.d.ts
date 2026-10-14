import type { Plan } from '../realize';
/** A cell where it plays: from `at` to `to` (seconds), how deep in the splice tree (0: the line), in which output. */
export interface StructureNode {
    readonly cell: string;
    readonly at: number;
    readonly to: number;
    readonly depth: number;
    readonly output: string;
    /** The cell it is a copy of (`base=`), if it is one. */
    readonly base?: string;
}
/** Every node from 0 to `until` seconds: each line's splice tree, lap after lap, through its clock (a line that splices
 * nothing: none). */
export declare function structure(p: Plan, until: number): StructureNode[];
