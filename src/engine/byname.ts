/**
 * What the seed library read by name before it declared it (decision 075, #560's rung 3c–e; the owner on #556 §3c–e):
 * each fragment's id, and the optional parameters a piece's own cell of the same name filled. The instruments read the
 * section's style, `&style`; a performer its instrument's voice, which a piece gave by defining `&bassV`. Now each
 * fragment reads only what it defines or declares, and a piece passes its own (`bass_performer(bassV=&bassV)`).
 *
 * Read the old way (`CompileOptions.old`), a `from` line of one of these that doesn't pass such a parameter, in a piece
 * that defines a cell of its name, passes it, with a warning naming Migrate; Migrate's `arguments` rule writes it
 * (`migrate/arguments.ts`). So every piece plays what it played. Pure data.
 */
export const BOUND_BY_NAME: ReadonlyMap<string, readonly string[]> = new Map([
  ['bass', ['style']],
  ['keys', ['style']],
  ['pad', ['style']],
  ['lead', ['style']],
  ['bass_performer', ['bassV', 'style']],
  ['pad_performer', ['padV', 'style']],
  ['stab_performer', ['keysV', 'style']],
  ['lead_performer', ['leadV', 'style']],
]);

/** What a line read the old way is told: `"bass_performer" reads &bassV by name no longer: …`. Its start is stable. */
export const byNameMessage = (id: string, parameter: string, line: string): string =>
  `${JSON.stringify(id)} reads &${parameter} by name no longer: pass it, ${line} (Migrate writes it, decision 075)`;
