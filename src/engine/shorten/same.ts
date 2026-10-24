/**
 * The same: two cells written exactly alike — one is enough, used by both names' users. Two voices alike too (decision
 * 057), where the merge sounds as the two did (S1, which reads a voice by its sound) and a MIDI export of it is the
 * same, its names aside: each part kept on its channel, so a piece's parts stay apart (the voices Convert to cells
 * writes one a part, alike, are its parts).
 */
import { compileSource } from '../compile';
import { declLine, deleteCell, spansLines } from '../edit';
import { pieceMidi } from '../midiexport';
import { codeShifts, type CompileOptions } from '../program';
import { soundsIdentical } from '../sameness';
import { saves, type Result, type ShortenRewrite } from './harness';

/** A text's MIDI export, its tracks' names left out (they name the voices), as a key; null where it doesn't compile. */
function exported(text: string, options: CompileOptions): string | null {
  const r = compileSource(text, undefined, options);
  if (!r.ok) return null;
  const smf = pieceMidi(r, codeShifts(r)).smf;
  return JSON.stringify({ ...smf, tracks: smf.tracks.map((t) => ({ ...t, name: undefined })) });
}

/** Does a merge of voices sound as the two did, and export to the same MIDI? */
const keepsVoices = (source: string, next: string, options: CompileOptions) =>
  soundsIdentical(source, next, undefined, options) && exported(next, options) === exported(source, options);

/** Cells written exactly alike: one is enough — its users read the other. A merge of voices is checked (`keepsVoices`). */
export function sameCells(source: string, result: Result, options: CompileOptions = {}): ShortenRewrite[] {
  const out: ShortenRewrite[] = [];
  const byText = new Map<string, string[]>();
  for (const c of result.cells.values()) {
    if (c.lambda || c.implicit || c.note || c.sink || spansLines(source, c.name)) continue;
    // (what a mix plays directly stays itself: merged, two outputs would become one at double gain)
    if (result.outputs.some((o) => o.cell === c.name)) continue;
    const line = source.split('\n')[declLine(source, c.name)] ?? '';
    const body = line
      .replace(/^&[A-Za-z_][A-Za-z0-9_]*\s*/, '')
      .replace(/\s+#.*$/, '')
      .trim();
    if (!body || /[?|]/.test(body)) continue; // (chance keys on names: merging would throw differently)
    byText.set(body, [...(byText.get(body) ?? []), c.name]);
  }
  for (const [body, names] of byText) {
    if (names.length < 2) continue;
    const [keep, ...gone] = names;
    const apply = (src: string) => {
      let next = src;
      for (const g of gone) {
        next = deleteCell(next, g);
        next = next.replace(new RegExp(`&${g}(?![A-Za-z0-9_])`, 'g'), `&${keep}`);
      }
      return next;
    };
    const s: ShortenRewrite = {
      id: `same:${names.join(',')}`,
      tool: 'shorten',
      rule: 'same',
      title: `${names.map((n) => `&${n}`).join(' and ')} are written exactly alike: keep &${keep}, and use it for ${names.length === 2 ? 'both' : 'all'}`,
      before: `${gone.map((g) => `&${g}`).join(' ')} ${body.length > 40 ? body.slice(0, 39) + '…' : body}`,
      after: `&${keep}`,
      apply,
    };
    if ((saves(source, s) ?? 0) <= 0) continue;
    if (names.some((n) => result.cells.get(n)?.voice) && !keepsVoices(source, apply(source), options)) continue;
    out.push(s);
  }
  return out;
}
