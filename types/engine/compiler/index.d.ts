/**
 * compile(): a parsed piece as cells over grids, clocks and outputs, in phases run in this order
 * (the order of the diagnostics too). Each takes what it reads and returns what it makes; the cells
 * pass from phase to phase, each refining phase handing on a new map. They share only the
 * diagnostics and the environment (context.ts).
 */
import type { ParseResult } from '../ast';
import { type CompileResult, type Env } from '../program';
/** A parsed piece, compiled; `used` names the cells a `use` line gave it (decision 054), which the built-in card doesn't hear. */
export declare function compile(parsed: ParseResult, env: Env, used?: ReadonlySet<string>): CompileResult;
