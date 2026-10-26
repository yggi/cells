/**
 * A pattern fragment heard alone (#291): the fragments carry no card, since where their notes go is the workbench's and
 * the performer's, so a test, a preview or a frontend that plays one by itself supplies one, here, once. It sends each
 * on the channel Jambot's band sends that part on: a drum bar's mix (`&groove`), a clave's (`&percussion`) and the
 * bell's (`&agogo`), and their copies (`&groove2`), on 10, General MIDI's drums; a bass line (`&bassline`) on 2, through the bass instrument's `&bassV`.
 * Pure.
 */

/** The mixes a pattern fragment may define, heard on General MIDI's drum channel; a copy's trailing number aside (`&groove2`, as a union renames one). */
const DRUMS = /^\s*&((?:groove|percussion|agogo)\d*)(?=\s|$)/gm;

/** The card lines that hear a text's patterns (none for a text with none), to write after it. */
export function heard(text: string): string {
  const defines = (name: string) => new RegExp(`^\\s*&${name}(?=\\s|$)`, 'm').test(text);
  const drums = [...text.matchAll(DRUMS)].map((m) => `&${m[1]}`);
  return [...(drums.length ? [`&drumCard map=midi(10) [${drums.join(', ')}]`] : []), ...(defines('bassline') ? ['&bassCard map=midi(2) [&bassline * &bassV]'] : [])].join('\n');
}
