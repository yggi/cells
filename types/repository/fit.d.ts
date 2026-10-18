/**
 * What fits the workbench (decision 047, points 2 and 3): the union of a fragment with the workbench's text, and whether
 * the fragment fits there. The workbench is a cells text; the fragment's holes are read off its text (`holes.ts`).
 *
 * **The union** is the workbench as written, then the fragment's lines: a line the fragment gives word for word as the
 * workbench does (its code, comments aside, whitespace collapsed) is the same line and kept once (owner, on #22); a name
 * both define by different lines is the fragment's own and renamed, `&kick` to `&kick2` (the first `&kick<n>`, n from 2,
 * that neither text names), with every use of it in the fragment, until no private name collides (a rename can make a
 * shared line differ, `[&kick, &sd]`, and so rename it too). The interface names (`INTERFACE_NAMES`: `&bar`, `key`,
 * `&harm`) are never renamed: one the fragment defines differently is defined twice, and the fragment doesn't fit.
 * Lines of the fragment that declare nothing (blank, a comment alone) aren't carried over.
 *
 * **The fit:** every name the fragment uses is defined on the workbench (`key`: the workbench has a main key), no name is
 * defined twice by different lines, every clock need is met by the meter the workbench gives it (its main meter, or the
 * one named), and the union compiles with no diagnostic the workbench alone doesn't have (its own warnings, or an error a
 * hole of its own makes, are no fault of the fragment's). The checks run cheapest first, and the union is compiled only
 * when the others pass; its compile may be cached by text (`cachedCompile`).
 */
import type { Diagnostic } from '../engine/ast';
import type { CompileResult } from '../engine/program';
import { type ClockNeed } from './holes';
/** A fragment added to a workbench: the text, and what became of the fragment's names there. */
export interface Union {
    /** The workbench as written, then the fragment's lines that aren't already on it. */
    readonly text: string;
    /** The fragment's private names that collided, each to its new name (`&kick` → `&kick2`). */
    readonly renamed: ReadonlyMap<string, string>;
    /** The fragment's names whose line the workbench already gives word for word: kept once. */
    readonly shared: readonly string[];
    /** Interface names both define by different lines: never renamed, so defined twice. */
    readonly twice: readonly string[];
    /** Every name the fragment defines, as it is named in the union (shared, renamed or as written). */
    readonly names: readonly string[];
}
/** Whether a fragment fits a workbench, and why not. */
export interface Fit {
    readonly fits: boolean;
    readonly union: Union;
    /** Names the fragment uses that the workbench doesn't define (`key`: it has no main key). */
    readonly missing: readonly string[];
    /** Its clock needs the workbench's meter doesn't meet (or a need with no meter there to meet it). */
    readonly unmet: readonly ClockNeed[];
    /** What the union's compile says that the workbench's alone doesn't; absent when a cheaper check failed first. */
    readonly diagnostics?: readonly Diagnostic[];
}
/** A declaration of a text: its cell's name (bare), its lines as written, and its code (comments aside, whitespace collapsed). */
export interface Line {
    readonly name: string;
    readonly written: string;
    readonly code: string;
}
/** A text's declarations, a line (and the lines it continues onto: one ending in `+`, `*`, `,` or `[`) each, as the parser reads them. */
export declare function declarations(text: string): Line[];
/** The union of a fragment with a workbench (see the module's comment). */
export declare function unionOf(fragment: string, workbench: string): Union;
/** Whether a fragment fits a workbench (see the module's comment); `compiled` compiles a text, and may cache it (`cachedCompile`). */
export declare function fitOf(fragment: string, workbench: string, compiled?: (text: string) => CompileResult): Fit;
/**
 * A compile cached by text: the last `limit` texts compiled. At 512, a library of 26 fragments, each alone and in its union
 * with a workbench, holds about ten workbenches' queries.
 */
export declare const cachedCompile: (limit?: number) => ((text: string) => CompileResult);
/**
 * The fit cached by its two texts, the last `limit` asked for, its compiles cached by text (`cachedCompile`): what a
 * repository asks with a workbench, so a query asked again with the same workbench compiles nothing and derives nothing.
 */
export declare function cachedFit(limit?: number): (fragment: string, workbench: string) => Fit;
