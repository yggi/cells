/**
 * The plugins the app ships: a bundle of `show=` wheels any piece can name without carrying code (decision 011). Each is
 * a block as a piece would carry it (engine/plugins.ts: a JSON manifest, then `draw`), so a bundle from a file of
 * its own will be the same text. They are trusted: they are part of the app, and a piece can't take their names.
 *
 * The code lives here, in the engine, as plain data: compile has to know every plugin's manifest wherever it runs
 * (node, the worker, the build); only the UI runs the drawing (ui/plugin.ts).
 */
import { type ShowPlugin } from './plugins';
/** Every built-in plugin (the sun …), in the bundle's order. */
export declare const BUILTIN_PLUGINS: readonly ShowPlugin[];
