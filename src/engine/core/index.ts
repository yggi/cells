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
 * With no interface the core is what plays and nothing more: a gate is its products, a role and a performer go (decision
 * 077 §1). Cored up to an interface (`interface`, §2), each interface cell keeps its name, stays a cell and is a root of the
 * fold; a step that would lose one isn't taken.
 *
 * Idempotent: the core of a core is itself. It has no inverse: comments and names go. Built in rungs (#482): the rows
 * that read the compiled program (taps as `pulse*k`, a subsequence on its tap's chain, keys, meters, gates, `pitch=`)
 * are the next. Named `core`, not `compile`, beside `compile.ts` (decision 069 says `compile/`). Pure.
 */
import { normalise, type NormaliseOptions } from '../normalise';
import { soundsIdentical } from '../sameness';
import { parse } from '../parser';
import { declLine } from '../edit';
import { signatureOf } from '../use';
import { FAMILIES, LEFT, stillWritten } from './desugar';
import { coreFold } from './fold';
import { minify } from './minify';

export { FAMILIES, LEFT, stillWritten, type CoreContext, type Family } from './desugar';
export { meaningfulNames, minify } from './minify';
export { coreFold } from './fold';

/** A text's core: the text, the steps that made it, and the rows of the table still written in it (not yet rewritten, #482). */
export interface Core {
  readonly source: string;
  readonly steps: readonly string[];
  readonly left: readonly { readonly key: string; readonly rows: string; readonly why: string }[];
}

/**
 * What a text is cored up to (decision 077 §2): names (`&tempo`, or bare), or a preset. `signature`: its signature's heads
 * and parameters (a fragment cored and still usable by its `from` line, 065); `roles`: its role cells and the gates each
 * lists (a score cored up to its gates, for the band's performers to fill in). None: the core is what plays, and nothing else.
 */
export type Interface = readonly string[] | 'signature' | 'roles';

/** The options of `toCore`: Normalise's, and the interface the text is cored up to. */
export interface CoreOptions extends NormaliseOptions {
  readonly interface?: Interface;
}

/**
 * The names an interface keeps, bare: the ones it names that the text defines, and the gates a kept role lists (what reads
 * a gate by name keeps it a cell).
 */
export function interfaceOf(text: string, spec: Interface = []): Set<string> {
  const cells = parse(text).cells;
  const bare = (n: string) => n.replace(/^&/, '');
  let names: string[];
  if (spec === 'signature') {
    const sig = signatureOf(text);
    names = sig ? [...sig.names, ...sig.optional, ...(sig.main ? [sig.main] : [])].map(bare) : [];
  } else if (spec === 'roles') names = cells.filter((d) => d.map?.kind === 'role').map((d) => d.name);
  else names = spec.map(bare);
  const keep = new Set(names.filter((n) => cells.some((d) => d.name === n)));
  for (const d of cells)
    if (keep.has(d.name) && d.map?.kind === 'role' && d.braid.kind === 'list') for (const t of d.braid.tokens) if (t.atom.kind === 'ref') keep.add(t.atom.name);
  return keep;
}

/** How many times the passes run at most, until the text stops changing: a fragment's lines taken back by Normalise can come back in its order once. */
const ROUNDS = 4;

/** One round of the passes: Normalise, de-sugar, the core fold, minify, each step checked by S1. */
function round(source: string, options: NormaliseOptions, spec: Interface | undefined, keep: Set<string>): { source: string; steps: string[] } {
  const same = (a: string, b: string) => soundsIdentical(a, b, undefined, options);
  // (a step that loses an interface cell loses what is read from outside the text: never taken)
  const kept = (t: string) => [...keep].every((n) => declLine(t, n) >= 0);
  const normal = normalise(source, options);
  const steps: string[] = [];
  let now = source;
  // (what the interface names is read again after each step: a fragment written in brings its roles)
  const more = () => {
    for (const n of interfaceOf(now, spec)) keep.add(n);
  };
  if (kept(normal.source)) {
    now = normal.source;
    steps.push(...normal.steps);
    more();
  } else steps.push('left as written: Normalise would rename or remove an interface cell');
  for (const f of FAMILIES) {
    const next = f.rewrite(now, { ...options, keep });
    if (next === now) continue;
    if (!kept(next)) {
      steps.push(`left as written: ${f.key} (${f.rows}) would remove an interface cell`);
      continue;
    }
    // (each family was measured exact over every example; one that isn't here is left, and says so)
    if (same(now, next)) {
      now = next;
      more();
      steps.push(`de-sugared: ${f.key} (${f.rows})`);
    } else steps.push(`left as written: ${f.key} (${f.rows}) would not play the same here`);
  }
  const folded = coreFold(now, options, undefined, keep);
  now = folded.source;
  steps.push(...folded.steps);
  const short = minify(now, keep);
  if (short !== now && same(now, short)) {
    now = short;
    steps.push('minified: its own names short');
  }
  return { source: now, steps };
}

/** The core of a text (decision 069), up to its interface (077): the passes again until the text stops changing, so the core of a core is itself. */
export function toCore(source: string, options: CoreOptions = {}): Core {
  const { interface: spec, ...rest } = options;
  const keep = interfaceOf(source, spec);
  let now = source;
  const steps: string[] = [];
  for (let i = 0; i < ROUNDS; i++) {
    const r = round(now, rest, spec, keep);
    if (r.source === now) break;
    now = r.source;
    steps.push(...r.steps);
  }
  return { source: now, steps, left: LEFT.filter((l) => stillWritten(l, now)).map(({ key, rows, why }) => ({ key, rows, why })) };
}
