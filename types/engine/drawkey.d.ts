/**
 * What a draw is keyed on (decision 031, amended by #481): what its cell plays, not its name or its spelling. Chance
 * (`x?`, `[a|b]`, `[a b|c]`, `chance=`) is thrown per seed, cell, lap and step, and a noise starts each note at a grain
 * thrown the same way; keyed on a name, a text renamed drew differently (E2 wider than S1, decision 070), and keyed on its
 * text, a cell respelled would (Shorten's runs, a phrase made a cell). A cell's key is its flattened steps (where each
 * plays, how long, its value, its chance, its options, its laps and choices), its seed and chance, and its sound's
 * parameters, a cell one names read as that cell's key in turn, hashed: so a text renamed or respelled draws as it did,
 * and two cells that play alike draw alike. Pure.
 */
import type { CompileResult } from './program';
/** A number for a text, the same for the same text: cyrb53 written in base 36 (a key, not a chance). */
export declare function hashOf(text: string): string;
/**
 * The seed a cell's draws are thrown from (#779, decision 098): the one it writes, `seed=n`, alone: a cell that writes one
 * draws the same under any edit to what it carries (a `role=`, a `part=`, a label, its steps), and two that write one number
 * draw alike. A cell that writes none is thrown from what it plays (`drawKeyOf`), as before. A written seed `n` is read as
 * the key `n` in base 36 under the default seed 0, so the seed Normalise writes for a cell, its content key as a number, throws
 * the dice it threw.
 */
export declare function drawSeedOf(result: CompileResult): (cell: string) => string;
/** What a program's cells draw on, by name (see the module's comment); a name the program doesn't hold is its own key. */
export declare function drawKeyOf(result: CompileResult): (cell: string) => string;
