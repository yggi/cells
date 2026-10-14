/** Reading declarations as tables: which table a cell reads, how many entries it has, its braid as units. */
import type { CellDecl, Span } from '../ast';
import { type Unit } from '../program';
/** Where compile's own messages point when nothing was written (the default grid). */
export declare const IMPLICIT: Span;
export declare const isRootDecl: (d: CellDecl) => boolean;
/** Static table for lengths and defaults (no over= → the default grid). */
export declare const tableOf: (d: CellDecl) => string | null;
/** A grid's steps per period: cycle=, or — a ratios grid — its tones before the period. */
export declare const gridSteps: (d: CellDecl) => number;
export declare const lengthOf: (decls: ReadonlyMap<string, CellDecl>, name: string, guard?: number) => number;
/** A braid as units: what each step is, with its modifiers. */
export declare const unitsOf: (decls: ReadonlyMap<string, CellDecl>, d: CellDecl) => Unit[];
