import { type Result, type Suggestion } from './harness';
/** Cells written exactly alike: one is enough — its users read the other. */
export declare function sameCells(source: string, result: Result): Suggestion[];
