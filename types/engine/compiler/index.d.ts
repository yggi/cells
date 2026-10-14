/**
 * compile(): a parsed piece as cells over grids, clocks and outputs, in phases run in this order
 * (the order of the diagnostics too). Each takes what it reads and returns what it makes; the cells
 * pass from phase to phase, each refining phase handing on a new map. They share only the
 * diagnostics and the environment (context.ts).
 */
import type { ParseResult } from '../ast';
import type { CompileResult, Env } from '../program';
export declare function compile(parsed: ParseResult, env: Env): CompileResult;
