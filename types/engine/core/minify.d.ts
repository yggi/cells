/**
 * The names that mean something besides themselves, which minify keeps: a drum's, its MIDI note on a MIDI card (decision
 * 054). A cell that draws is renamed as freely as any other: a draw is keyed on its cell's content, not its name (#481).
 */
export declare function meaningfulNames(text: string): Set<string>;
/** Minify (question 2): every own name renamed to a short one; the names it uses but doesn't define, and `meaningfulNames`, kept. */
export declare function minify(text: string): string;
