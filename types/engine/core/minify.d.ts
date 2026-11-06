/**
 * The names that mean something besides themselves, which minify keeps: a drum's (its MIDI note), and a cell that draws
 * (`x?`, `[a|b]`, `chance=`, `seed=`), or splices one that does, since a draw is keyed on the name of the cell that plays
 * it (`realize.ts`, decision 031).
 */
export declare function meaningfulNames(text: string): Set<string>;
/** Minify (question 2): every own name renamed to a short one; the interface names, the names it uses but doesn't define, and `meaningfulNames` kept. */
export declare function minify(text: string): string;
