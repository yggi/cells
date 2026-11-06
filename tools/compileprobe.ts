/**
 * The compile tool's probe (#441): the sugar of decision 068 rewritten into the core over every example, family by family,
 * each rewrite checked by S1 against the text it starts from and measured by structure (decision 049's measure, as written).
 * It answers the scoping note's questions with numbers (`docs/notes/441-compile.md`); it is no tool a frontend reads.
 *
 *   node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/compileprobe.ts [--fold] [<key>...]
 *
 * A family is one sugar row, or a few that rewrite alike, written as a function of the text alone (mechanical): it
 * rewrites every place it finds or none. A row that needs what the text means to rewrite (the meter a tap reads, the
 * products a voice is in, a line's step=) is counted where it is written, not rewritten: `LEFT` says why. The families,
 * minify and the core fold live in `src/engine/core/` since the tool was built from them (#482).
 * `--fold` also runs Shorten over the de-sugared text, to see whether compile is "de-sugar, then Shorten" (question 3).
 */
import { pathToFileURL } from 'node:url';
import { PRESETS } from '../src/engine/presets';
import { soundsIdentical } from '../src/engine/sameness';
import { structureOf } from '../src/engine/measure';
import { shortenAll } from '../src/engine/shorten';
import { coreFold, FAMILIES, LEFT, minify } from '../src/engine/core';
import { resolveSeed } from '../src/repository/library';

const OPTIONS = { resolve: resolveSeed };
/** How long S1 listens: the first minute (`SAMENESS_SECONDS`), so the longest pieces stay a probe. */
const LISTEN = 60;

export interface Row {
  readonly key: string;
  readonly before: number;
  readonly families: Readonly<Record<string, { after: number; same: boolean } | null>>;
  readonly core: { after: number; same: boolean; idempotent: boolean };
  readonly context: readonly string[];
  readonly minified: { chars: [number, number]; same: boolean };
  readonly folded?: { after: number; same: boolean; steps: number; said: readonly string[] };
  readonly coreFolded?: { after: number; same: boolean; steps: number };
}

const measure = (text: string) => structureOf(text, { asWritten: true, ...OPTIONS }).total;
const same = (a: string, b: string) => soundsIdentical(a, b, LISTEN, OPTIONS);

/** One example through every family alone, then all of them in order (the core as far as the letters reach). */
export function probe(key: string, source: string, fold = false): Row {
  const families: Record<string, { after: number; same: boolean } | null> = {};
  let core = source;
  for (const f of FAMILIES) {
    const alone = f.rewrite(source, OPTIONS);
    families[f.key] = alone === source ? null : { after: measure(alone), same: same(source, alone) };
    core = f.rewrite(core, OPTIONS);
  }
  const again = FAMILIES.reduce((t, f) => f.rewrite(t, OPTIONS), core);
  const min = minify(core);
  const folded = fold ? shortenAll(core, 60, {}) : null;
  const cf = fold ? coreFold(core, OPTIONS) : null;
  return {
    key,
    before: measure(source),
    families,
    core: { after: measure(core), same: same(source, core), idempotent: again === core },
    context: LEFT.filter((c) => c.test.test(core)).map((c) => c.key),
    minified: { chars: [core.length, min.length], same: same(core, min) },
    ...(cf ? { coreFolded: { after: measure(cf.source), same: same(source, cf.source), steps: cf.steps.length } } : {}),
    ...(folded ? { folded: { after: measure(folded.source), same: same(core, folded.source), steps: folded.steps.length, said: folded.steps } } : {}),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const fold = args.includes('--fold');
  const keys = args.filter((a) => !a.startsWith('--'));
  const rows = Object.entries(PRESETS)
    .filter(([k]) => !keys.length || keys.includes(k))
    .map(([k, p]) => probe(k, p.source, fold));
  console.log(JSON.stringify(rows));
}
