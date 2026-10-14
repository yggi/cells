/**
 * Plugins: `show=` wheels beyond the language's own (decision 011). The app ships some (builtinPlugins.ts: the sun …);
 * a piece can also carry the code of one of its own. A plugin is a block of the piece's
 * text, between two lines:
 *
 *   === plugin sun ===
 *   { "fits": ["meter"], "size": 220, … }       the manifest: plain data, read here (the layout needs it)
 *   function draw(view, h, g) { … }              the drawing: code, run by the UI only (ui/plugin.ts)
 *   === end ===
 *
 * This module is pure: it splits a piece's text into the cells' text and its plugins, and reads the manifest. The
 * block is blanked in the cells' text, so a cell's line numbers are the piece's. Running the code is not its job.
 */
import type { Diagnostic } from './ast';
/** A dial: the wheel is turned by hand while stopped, and moves where play starts. */
interface PluginDial {
    /** What a screen reader calls it. */
    readonly label: string;
    /** Seconds of the piece for a full turn. */
    readonly turn: number;
    /** Seconds for one press of an arrow key. */
    readonly key: number;
}
/** A `show=` a piece carries: its manifest, and the code that draws it. */
export interface ShowPlugin {
    /** The word after `show=`. */
    readonly name: string;
    /** The kinds of cell it can show (layout/show.ts: voice, meter, table …). */
    readonly fits: readonly string[];
    /** Its wheel's width and height in the graph. */
    readonly size: number;
    /** Do edges meet a rim segment on it (as on a cell's own wheel)? Off for a wheel with no segments. */
    readonly rim: boolean;
    readonly meaning: string;
    readonly dial: PluginDial | null;
    /** Colours (any CSS colour), by name: the drawing reads them as `view.tokens`. */
    readonly tokens: Readonly<Record<string, string>>;
    /** The drawing, as written. */
    readonly code: string;
    /** One of the app's own (builtinPlugins.ts): trusted, and a piece can't write another of the name. Else the piece's own: trusted only by the user (ui/pluginTrust.ts). */
    readonly builtin: boolean;
    /** The line its block starts on. */
    readonly line: number;
}
export interface PluginSplit {
    /** The piece's text with every plugin block blanked (same number of lines). */
    readonly text: string;
    readonly plugins: readonly ShowPlugin[];
    readonly diagnostics: readonly Diagnostic[];
}
/** What a plugin is trusted by: all of it, manifest and code (the manifest feeds the drawing too). */
export declare const pluginKey: (p: Pick<ShowPlugin, "fits" | "size" | "rim" | "meaning" | "dial" | "tokens" | "code">) => string;
export declare const PLUGIN_SYNTAX = "=== plugin name === \u2026 === end ===";
export declare function splitPlugins(source: string, reserved?: readonly string[], builtin?: boolean): PluginSplit;
export {};
