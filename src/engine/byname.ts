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
export const BOUND_BY_NAME: ReadonlyMap<string, readonly string[]> = new Map([
  ['bass', ['style']],
  ['keys', ['style']],
  ['pad', ['style']],
  ['lead', ['style']],
  ['bass_performer', ['bassV', 'style']],
  ['pad_performer', ['padV', 'style']],
  ['stab_performer', ['keysV', 'style']],
  ['lead_performer', ['leadV', 'style']],
  ['band', ['drumlines', 'bassline', 'padline', 'stabline', 'leadline', 'bassLevel', 'padLevel', 'stabLevel', 'leadLevel', 'style']],
  // (the rhythms read their drums, #637)
  ['synth_pop_drums', ['bd', 'sd', 'hh']],
  ['techno_drums', ['bd', 'sd', 'hh', 'oh']],
  ['deep_house_drums', ['bd', 'sd', 'hh']],
  ['ambient_drums', ['bd', 'sd', 'hh']],
  ['lo_fi_hip_hop_drums', ['bd', 'rim', 'sd', 'hh']],
  ['funk_drums', ['bd', 'rim', 'sd', 'hh', 'oh']],
  ['bossa_nova_drums', ['bd', 'rim', 'sd', 'hh']],
  ['swing_jazz_drums', ['bd', 'sd', 'ph', 'rd']],
  ['son_clave_3_2', ['claves']],
  ['son_clave_2_3', ['claves']],
  ['rumba_clave_3_2', ['claves']],
  ['bossa_nova_clave', ['claves']],
  ['bossa_nova_clave_one_bar', ['claves']],
  ['cinquillo', ['claves']],
  ['electro_swing_drums', ['bd', 'sd', 'cp', 'hh', 'oh']],
  ['spooky_drums', ['bd', 'rim', 'rd']],
  ['ghost_drums', ['bd', 'rim', 'rd']],
  ['kinderlied_drums', ['bd', 'sd', 'hh']],
  ['acid_drums', ['bd', 'cp', 'hh', 'oh']],
  ['happy_hardcore_drums', ['bd', 'cp', 'hh']],
  ['elektro_drums', ['bd', 'sd', 'hh']],
  ['industrial_drums', ['bd', 'hh']],
]);

/** What a line read the old way is told: `"bass_performer" reads &bassV by name no longer: …`. Its start is stable. */
export const byNameMessage = (id: string, parameters: readonly string[], line: string): string =>
  `${JSON.stringify(id)} reads ${parameters.map((p) => `&${p}`).join(', ')} by name no longer: pass ${parameters.length > 1 ? 'them' : 'it'}, ${line} (Migrate writes it, decision 075)`;
