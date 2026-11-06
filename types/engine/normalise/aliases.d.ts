import type { CompileResult } from '../program';
import type { Rewrite } from '../rewrite';
/** Each parameter written with an alias, as ours; `only` keeps the ones a tool offers (ours shorter, for Shorten). */
export declare function aliases(source: string, result: CompileResult, only?: (alias: string, ours: string) => boolean): Rewrite<'alias'>[];
/** `ftype=` written as superdough's number for a model, as its word (decision 074): `ftype=2` is `ftype=24db`. */
export declare function filterModels(source: string, result: CompileResult): Rewrite<'alias'>[];
