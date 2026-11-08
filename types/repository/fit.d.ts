/**
 * What fits the workbench (decision 047, points 2 and 3; decisions 065, 075): a fragment taken onto a workbench, and
 * whether it fits there. The workbench is a cells text; the fragment's holes are read off its text (`holes.ts`).
 *
 * **By signature** (`useOn`, `fitsAs`, #454): a template is taken by a `from` line, a copy whose inputs are its
 * arguments, and a collection by every name it defines (`* from id`). Nothing is bound by name: the main argument is the
 * one cell that meets the main parameter, or the one the host names.
 *
 * **By lines** (`cachedFit`, what the repository's queries ask until #587): the workbench as written, then the fragment's
 * lines. A line the fragment gives word for word as the workbench does (its code, comments aside, whitespace collapsed)
 * is the same line and kept once (owner, on #22); a name both define by different lines is the fragment's own and
 * renamed, `&kick` to `&kick2` (the first `&kick<n>`, n from 2, that neither text names), with every use of it in the
 * fragment, until no private name collides (a rename can make a shared line differ, `[&kick, &sd]`, and so rename it
 * too). The names a query's workbench gives a template the old way (`&bar`, `&tempo`, `&key`, `&tonic`, `&harm`,
 * `&style`) are never renamed: one the fragment defines differently is defined twice, and it doesn't fit; they go with
 * #587. The fragment's `from` lines are carried over unless the workbench has them, before its declarations. It fits
 * where every name it uses is defined on the workbench, no name is defined twice by different lines, every clock need is
 * met by the meter the workbench gives it (its main meter, or the one named), and the union compiles with no diagnostic
 * the workbench alone doesn't have. A hole read only as a sound (`Holes.sounds`: a groove's `&bd`) doesn't block the fit
 * (decision 054): it is `sounds`, the instrument to ask for next, and the union is judged with a stand-in voice for each
 * (`&bd s=white`), in no text the fit returns. `fitsAs` judges a collection so.
 */
import type { Diagnostic } from '../engine/ast';
import type { CompileResult, Resolve, Used } from '../engine/program';
import { type ClockNeed } from './holes';
/** A fragment's lines added to a workbench (`cachedFit`'s, until #587): the text, and what became of the fragment's names there. */
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
/** Whether a fragment's lines fit a workbench (`cachedFit`'s answer, until #587), and why not. */
export interface Fit {
    readonly fits: boolean;
    readonly union: Union;
    /** Names the fragment uses that the workbench doesn't define (`key`: it has no main key), but for its sounds. */
    readonly missing: readonly string[];
    /** Names the fragment reads only as a sound that the workbench doesn't define: they don't block the fit. */
    readonly sounds: readonly string[];
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
/**
 * A compile cached by text: the last `limit` texts compiled. At 512, a library of 31 fragments, each alone and in its union
 * with a workbench, holds about ten workbenches' queries.
 */
export declare const cachedCompile: (limit?: number) => ((text: string) => CompileResult);
/**
 * The fit cached by its two texts, the last `limit` asked for, its compiles cached by text (`cachedCompile`): what a
 * repository asks with a workbench, so a query asked again with the same workbench compiles nothing and derives nothing.
 */
export declare function cachedFit(limit?: number): (fragment: string, workbench: string) => Fit;
/**
 * A template taken onto a workbench by a `from` line (decision 065, #454): what `useOn` writes. The copy's names are its
 * own (`&bassline_bassNext`), its inputs the arguments the line gives, so a template can be taken twice and no name of
 * the workbench is bound to it by convention.
 */
export interface UseOn {
    /** The workbench as written, then the `from` line. */
    readonly text: string;
    /** The `from` line written (`&bassline from walking_bass &harm`). */
    readonly line: string;
    /** The names the line takes: the head as named (one), or a template's heads by their names (several). */
    readonly heads: readonly string[];
    /** The main argument as written (`&harm`, `D`), or null: the template has no main parameter, or the workbench no cell for it. */
    readonly main: string | null;
    /** What the copy gives, as the compile reads it (`CompileResult.uses`); null where the template didn't resolve. */
    readonly used: Used | null;
}
/** What `useOn` is told: the head's name, the main argument, the named arguments, and how to read the library. */
export interface UseOnOptions {
    readonly resolve: Resolve;
    /** The head's name; by default the template's own, numbered clear of the workbench's (`&bassline2`). */
    readonly head?: string;
    /** The main argument, as a `from` line writes it (`&harm`, `D`); by default the one cell of the workbench (or of what it offers) that meets the main parameter. */
    readonly main?: string;
    /** The named arguments (`{ swing: '8n:.64' }`). */
    readonly args?: Readonly<Record<string, string>>;
    /** Compiles a text (its `from` lines read through `resolve`), and may cache it (`cachedCompile`). */
    readonly compiled?: (text: string) => CompileResult;
}
/**
 * A template taken onto a workbench (decision 065, #454): the workbench with `&head from id(args) main` written on it, and
 * what the copy gives. Without `head`, the template's head numbered clear of the workbench's names; a template of several
 * heads is taken by their names. Without `main`, the one cell of the workbench that meets the main parameter (`mainOn`). A
 * fragment with no signature, a collection, is taken by every name it defines (`* from id`).
 */
export declare function useOn(bench: string, id: string, options: UseOnOptions): UseOn;
/** Whether a template fits a workbench taken by a `from` line, and why not: `fitsAs`'s answer. */
export interface FitAs {
    readonly fits: boolean;
    /** The `from` line on the workbench (`useOn`); for a collection, the workbench with its lines (the fit by lines). */
    readonly text: string;
    /** The copy, where a template was taken (`useOn`); null for a collection. */
    readonly use: UseOn | null;
    /** The parameters the workbench has no cell for (the main one, `&harm`); for a collection, the names it uses that the workbench lacks. */
    readonly missing: readonly string[];
    /** The names it reads only as a sound that the workbench doesn't define: they don't block the fit. */
    readonly sounds: readonly string[];
    /** Its clock needs the workbench's meter doesn't meet. */
    readonly unmet: readonly ClockNeed[];
    /** What the compile says that the workbench's alone doesn't; absent when a cheaper check failed first. */
    readonly diagnostics?: readonly Diagnostic[];
}
/**
 * Whether a fragment fits a workbench, read by its signature (decision 065, #454): a template fits where the workbench
 * gives its main argument (`useOn`: the cell that meets it, or `options.main`), the copy compiles with nothing said that
 * the workbench alone doesn't say (a sound hole stood in, as the fit by lines stands one), and its clock needs are met by the meter
 * it taps. Nothing is bound by name. A collection (no signature) is judged as the fit by lines judges it: its lines read only what
 * it defines, its sounds and its taps.
 */
export declare function fitsAs(id: string, bench: string, options: UseOnOptions): FitAs;
