/**
 * What the seed library read by name before it declared it (decision 075, #560's rung 3c–e; the owner on #556 §3c–e):
 * each fragment's id, and the optional parameters a piece's own cell of the same name filled. The instruments read the
 * section's style, `&style`; a performer its instrument's voice, which a piece gave by defining `&bassV`; the band the score's parts, its levels and its style (`* from band` over a score's `&bassline`); a rhythm its drums (`funk_drums` over a piece's own `&bd`). Now each
 * fragment reads only what it defines or declares, and a piece passes its own (`bass_performer(bassV=&bassV)`).
 *
 * Read the old way (`CompileOptions.old`), a `from` line of one of these that doesn't pass such a parameter, in a piece
 * that defines a cell of its name, passes it, with a warning naming Migrate; Migrate's `arguments` rule writes it
 * (`migrate/arguments.ts`). So every piece plays what it played. Pure data.
 */
export declare const BOUND_BY_NAME: ReadonlyMap<string, readonly string[]>;
/** What a line read the old way is told: `"bass_performer" reads &bassV by name no longer: …`. Its start is stable. */
export declare const byNameMessage: (id: string, parameters: readonly string[], line: string) => string;
