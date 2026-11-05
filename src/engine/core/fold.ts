/**
 * The core fold (decision 069 §7, #482): the text made more compact without leaving the core. Two moves, the best each
 * round, each checked by S1 against the text it starts from:
 *  - Shorten's core kinds: `phrase` (a phrase as one cell used at its places, moved by `^$n`, `^n`, `[<<]` or backwards),
 *    `same` (alike cells as one), `default` (a stated default dropped); never its runs or respellings, which are sugar;
 *  - a line nothing reads and nothing plays (a fragment's line written in by `from` and not used), deleted.
 * Pure.
 */
import { compileSource } from '../compile';
import { deleteCell, splitComment } from '../edit';
import type { CompileOptions } from '../program';
import { soundsIdentical } from '../sameness';
import { shorten } from '../shorten';

/** Shorten's kinds whose rewrite stays in the core. */
const CORE_KINDS: ReadonlySet<string> = new Set(['phrase', 'same', 'default']);

const HEAD = /^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;

/** The cells no other line names and no card plays: a line that does nothing the piece hears, or sounds by itself. */
function unread(source: string, options: CompileOptions): string[] {
  const r = compileSource(source, undefined, options);
  if (!r.ok) return [];
  const played = new Set(r.outputs.map((o) => o.cell));
  const codes = source.split('\n').map((l) => splitComment(l)[0]);
  return codes.flatMap((c, i) => {
    const name = HEAD.exec(c)?.[1];
    if (!name || played.has(name)) return [];
    const named = new RegExp(`&${name}(?![A-Za-z0-9_])`);
    return codes.some((d, j) => j !== i && named.test(d)) ? [] : [name];
  });
}

/** The core fold: Shorten's core kinds and unread lines, the best each round, each checked by S1; the steps are what each did. */
export function coreFold(text: string, options: CompileOptions = {}, rounds = 60): { source: string; steps: string[] } {
  let now = text;
  const steps: string[] = [];
  const same = (a: string, b: string) => soundsIdentical(a, b, undefined, options);
  for (let i = 0; i < rounds; i++) {
    const gone = unread(now, options).find((name) => same(now, deleteCell(now, name)));
    if (gone) {
      now = deleteCell(now, gone);
      steps.push(`&${gone} is read by nothing and plays nothing: gone`);
      continue;
    }
    const best = shorten(now, options).find((s) => CORE_KINDS.has(s.kind) && same(now, s.apply(now)));
    if (!best) break;
    now = best.apply(now);
    steps.push(best.title);
  }
  return { source: now, steps };
}
