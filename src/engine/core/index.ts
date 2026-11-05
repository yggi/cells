/**
 * The core of a text (decision 069, #482): what it plays, written in the core grammar of decision 068, for a machine
 * reader (a hash, the learned layer, a comparison of two pieces), never for a frontend's editor. Four passes, each step
 * checked by S1 (`soundsIdentical`) against the text it starts from:
 *
 *  1. Normalise: one spelling per sugar family, so the core is the same for every text Normalise makes alike
 *     (`toCore(normalise(x)) = toCore(x)`);
 *  2. de-sugar (`desugar.ts`): the rows the letters settle; the rest are reported (`left`), not guessed;
 *  3. the core fold (`fold.ts`): phrases, alike cells, defaults, and the lines nothing reads;
 *  4. minify (`minify.ts`): the names it may rename, short, the fold's among them.
 *
 * Idempotent: the core of a core is itself. It has no inverse: comments and names go. Built in rungs (#482): the rows
 * that read the compiled program (taps as `pulse*k`, a subsequence on its tap's chain, keys, meters, gates, `pitch=`)
 * are the next. Named `core`, not `compile`, beside `compile.ts` (decision 069 says `compile/`). Pure.
 */
import { normalise, type NormaliseOptions } from '../normalise';
import { soundsIdentical } from '../sameness';
import { FAMILIES, LEFT } from './desugar';
import { coreFold } from './fold';
import { minify } from './minify';

export { FAMILIES, LEFT, type Family } from './desugar';
export { meaningfulNames, minify } from './minify';
export { coreFold } from './fold';

/** A text's core: the text, the steps that made it, and the rows of the table still written in it (not yet rewritten, #482). */
export interface Core {
  readonly source: string;
  readonly steps: readonly string[];
  readonly left: readonly { readonly key: string; readonly rows: string; readonly why: string }[];
}

/** How many times the passes run at most, until the text stops changing: a fragment's lines taken back by Normalise can come back in its order once. */
const ROUNDS = 4;

/** One round of the passes: Normalise, de-sugar, the core fold, minify, each step checked by S1. */
function round(source: string, options: NormaliseOptions): { source: string; steps: string[] } {
  const same = (a: string, b: string) => soundsIdentical(a, b, undefined, options);
  const normal = normalise(source, options);
  let now = normal.source;
  const steps = [...normal.steps];
  for (const f of FAMILIES) {
    const next = f.rewrite(now, options);
    if (next === now) continue;
    // (each family was measured exact over every example; one that isn't here is left, and says so)
    if (same(now, next)) {
      now = next;
      steps.push(`de-sugared: ${f.key} (${f.rows})`);
    } else steps.push(`left as written: ${f.key} (${f.rows}) would not play the same here`);
  }
  const folded = coreFold(now, options);
  now = folded.source;
  steps.push(...folded.steps);
  const short = minify(now);
  if (short !== now && same(now, short)) {
    now = short;
    steps.push('minified: its own names short');
  }
  return { source: now, steps };
}

/** The core of a text (decision 069): the passes again until the text stops changing, so the core of a core is itself. */
export function toCore(source: string, options: NormaliseOptions = {}): Core {
  let now = source;
  const steps: string[] = [];
  for (let i = 0; i < ROUNDS; i++) {
    const r = round(now, options);
    if (r.source === now) break;
    now = r.source;
    steps.push(...r.steps);
  }
  return { source: now, steps, left: LEFT.filter((l) => l.test.test(now)).map(({ key, rows, why }) => ({ key, rows, why })) };
}
