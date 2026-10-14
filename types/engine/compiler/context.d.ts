/** What every phase of compile() shares: where diagnostics go, and the environment (rates read from it). Everything else a phase takes as arguments and returns. */
import type { CellDecl, Diagnostic, ParseResult, Span } from '../ast';
import { type Env, type ResolvedCell } from '../program';
export interface Ctx {
    readonly parsed: ParseResult;
    readonly env: Env;
    readonly diagnostics: Diagnostic[];
    readonly error: (message: string, span: Span) => void;
    readonly warn: (message: string, span: Span) => void;
    /**
     * Cells whose own line failed (the parser said why), and the cells that couldn't be resolved for using one: their
     * uses aren't reported again (no "Unknown cell", no "nothing to play" for them).
     */
    readonly broken: Set<string>;
    /** `Unknown cell &name` — unless its own line failed: that error has said it already. */
    readonly unknownCell: (name: string, span: Span) => void;
    /** A rate written as a number, or read from the environment (an unknown name is an error, once). */
    readonly rateOf: (st: CellDecl['step']) => number | null;
}
/** Cells, by name, as a phase hands them on. */
export type Cells = ReadonlyMap<string, ResolvedCell>;
export declare function context(parsed: ParseResult, env: Env): Ctx;
