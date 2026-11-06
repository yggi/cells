/**
 * The seed ids that became words (#387, decision 065 followed through): each id that wasn't a word, and the word it is
 * now; and the seven diatonic modes, each the one `diatonic` fragment taken with its mode (`aeolian` is
 * `diatonic(mode=aeolian)`, how a `from` line takes it and a query answers). The rule: lower case; spaces, `-` and `/` as `_`; parentheses dropped; an id that would start with a digit (each
 * is a meter) after `meter_`. So a `from` line names every seed bare (`&bar from meter_4_4_swung_on_8n &tempo`).
 *
 * An old id still reads for one minor version: the seed library resolves it to the same text as its word, so a piece's
 * notes and its lockfile's hashes don't move. A `use` or `from` line that names one warns, and Migrate rewrites it
 * (`migrate/renamed.ts`), each only where the host's resolver gives the old id and the new the same text, so a host's
 * own library that happens to hold such an id is left alone. Pure data.
 */
export const RENAMED_IDS: ReadonlyMap<string, string> = new Map([
  ['creeping bass', 'creeping_bass'],
  ['walking bass', 'walking_bass'],
  ['eighths bass', 'eighths_bass'],
  ['funk bass', 'funk_bass'],
  ['pumping bass', 'pumping_bass'],
  ['root bass', 'root_bass'],
  ['tiptoe bass', 'tiptoe_bass'],
  ['lead performer', 'lead_performer'],
  ['stab performer', 'stab_performer'],
  ['pad performer', 'pad_performer'],
  ['drums performer', 'drums_performer'],
  ['bass performer', 'bass_performer'],
  ['Charleston stabs', 'charleston_stabs'],
  ['Synth-pop drums', 'synth_pop_drums'],
  ['Funk drums', 'funk_drums'],
  ['Spooky drums', 'spooky_drums'],
  ['Lo-fi hip hop drums', 'lo_fi_hip_hop_drums'],
  ['Ghost drums', 'ghost_drums'],
  ['rumba clave 3-2', 'rumba_clave_3_2'],
  ['bossa nova clave', 'bossa_nova_clave'],
  ['Techno drums', 'techno_drums'],
  ['Kinderlied drums', 'kinderlied_drums'],
  ['Bossa nova drums', 'bossa_nova_drums'],
  ['Deep house drums', 'deep_house_drums'],
  ['son clave 3-2', 'son_clave_3_2'],
  ['Swing jazz drums', 'swing_jazz_drums'],
  ['son clave 2-3', 'son_clave_2_3'],
  ['bossa nova clave (one bar)', 'bossa_nova_clave_one_bar'],
  ['Ambient drums', 'ambient_drums'],
  ['Electro swing drums', 'electro_swing_drums'],
  ['7/8', 'meter(grouping=meter("7/8"))'],
  ['4/4 leaning lightly on 16n', 'meter(swing=16n:.6)'],
  ['4/4 leaning faintly on 16n', 'meter(swing=16n:31/60)'],
  ['3/4', 'meter(grouping=meter("3/4"))'],
  ['6/8', 'meter(grouping=meter("6/8"))'],
  ['4/4 alla breve', 'meter(grouping=meter("2/2", 2))'],
  ['4/4 swung on 8n', 'meter(swing=8n:2/3)'],
  ['10/8', 'meter(grouping=meter("10/8"))'],
  ['2/4', 'meter(grouping=meter("2/4"))'],
  ['4/4', 'meter'],
  ['12/8', 'meter(grouping=meter("12/8"))'],
  ['5/4', 'meter(grouping=meter("5/4"))'],
  ['4/4 leaning on 16n', 'meter(swing=16n:.65)'],
  ['vamp to the seventh', 'vamp_to_the_seventh'],
  ['vamp to the fifth', 'vamp_to_the_fifth'],
  ['vamp to the sixth', 'vamp_to_the_sixth'],
  ['tonic vamp', 'tonic_vamp'],
  ['vamp to the fourth', 'vamp_to_the_fourth'],
  ['haunted progression', 'haunted_progression'],
  ['dark cadence', 'dark_cadence'],
  ['muted trumpet', 'muted_trumpet'],
  ['round bass', 'round_bass'],
  ['haunted pad', 'haunted_pad'],
  ['brass stab', 'brass_stab'],
  ['upright bass', 'upright_bass'],
  ['bell and scale', 'bell_and_scale'],
  ['harmonic minor', 'harmonic_minor'],
  ['rounded binary', 'rounded_binary'],
  ['call and answer', 'call_and_answer'],
  // (the thirteen meters, each now the one meter fragment with its grouping or its swing: #507, decision 072)
  ['meter_7_8', 'meter(grouping=meter("7/8"))'],
  ['meter_4_4_leaning_lightly_on_16n', 'meter(swing=16n:.6)'],
  ['meter_4_4_leaning_faintly_on_16n', 'meter(swing=16n:31/60)'],
  ['meter_3_4', 'meter(grouping=meter("3/4"))'],
  ['meter_6_8', 'meter(grouping=meter("6/8"))'],
  ['meter_4_4_alla_breve', 'meter(grouping=meter("2/2", 2))'],
  ['meter_4_4_swung_on_8n', 'meter(swing=8n:2/3)'],
  ['meter_10_8', 'meter(grouping=meter("10/8"))'],
  ['meter_2_4', 'meter(grouping=meter("2/4"))'],
  ['meter_4_4', 'meter'],
  ['meter_12_8', 'meter(grouping=meter("12/8"))'],
  ['meter_5_4', 'meter(grouping=meter("5/4"))'],
  ['meter_4_4_leaning_on_16n', 'meter(swing=16n:.65)'],
  // (the seven diatonic modes, each now the one diatonic fragment with its mode: a query answers so, #387 B1)
  ['aeolian', 'diatonic(mode=aeolian)'],
  ['dorian', 'diatonic(mode=dorian)'],
  ['ionian', 'diatonic(mode=ionian)'],
  ['mixolydian', 'diatonic(mode=mixolydian)'],
  ['phrygian', 'diatonic(mode=phrygian)'],
  ['lydian', 'diatonic(mode=lydian)'],
  ['locrian', 'diatonic(mode=locrian)'],
]);

/** An id as a word, by the rule above: `Techno drums` is `techno_drums`, `4/4 swung on 8n` is `meter_4_4_swung_on_8n`; a word stays as it is. */
export function wordOf(id: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(id)) return id;
  const word = id
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[\s/-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return /^\d/.test(word) ? `meter_${word}` : word;
}
