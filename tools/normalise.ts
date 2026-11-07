// npm run normalise -- [--blocks] [--rules a,b] <files>: each file in the canonical spelling (src/engine/normalise,
// decision 049), in place. A .cells file is a text; a Markdown file (a piece, a fragment) is normalised in its cells blocks
// (joined, literate cells, decision 051; each changed line goes back into the block it came from), the rest kept byte for
// byte. With --blocks, each cells block of a Markdown file is a piece of its own, normalised alone: a page of the docs, whose
// blocks are separate pieces (#196). With --rules, only the rewrites of those rules (a Rewrite's `rule`: `meter`, `tempo`,
// `bar`, `key`, …), for a pass that writes one row of the canonical table and nothing else. A text that doesn't compile is
// left as it is, since every rewrite is checked to play the same. It reads the seed library: its `use` lines resolve, and a
// line that is a fragment's word for word is written as a `use` of it (#196).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readLiterate, renderFile, rewrite } from '../src/engine/literate.ts';
import { normalisations, type NormaliseOptions } from '../src/engine/normalise/index.ts';
import { rewriteAll, ROUNDS } from '../src/engine/rewrite.ts';
import { LIBRARY, resolveSeed } from '../src/repository/library.ts';

/** The seed library: what a `use` resolves to, and whose lines a piece takes by `use` (#196). */
const SEED = { resolve: resolveSeed, library: LIBRARY };

/** How a file is normalised: its blocks as one piece or each alone, and every rule or only some. */
export interface FileOptions {
  readonly blocks?: boolean;
  readonly rules?: ReadonlySet<string>;
}

/** Normalise (src/engine/normalise's `normalise`), its rewrites kept to `rules` when given. */
function normaliseText(source: string, options: NormaliseOptions, rules?: ReadonlySet<string>): { source: string; steps: string[] } {
  // (it writes every migration before its own rules, for a minor version: a retired form is read the old way)
  const old = { ...options, old: true };
  const find = normalisations(old);
  return rewriteAll(source, rules ? (src, result) => find(src, result).filter((r) => rules.has(r.rule)) : find, ROUNDS, old);
}

/** A file's text in the canonical spelling, and what each rewrite did. */
export function normaliseFile(path: string, text: string, options: FileOptions = {}): { text: string; steps: string[] } {
  if (!path.endsWith('.md')) {
    const { source, steps } = normaliseText(text, SEED, options.rules);
    return { text: source, steps };
  }
  if (options.blocks) {
    const steps: string[] = [];
    const out = text.replace(/^(```cells\n)([\s\S]*?)^```$/gm, (whole, open: string, block: string) => {
      const done = normaliseText(block, SEED, options.rules);
      steps.push(...done.steps);
      return done.steps.length ? `${open}${done.source.trimEnd()}\n\`\`\`` : whole;
    });
    return { text: out, steps };
  }
  const file = readLiterate(text);
  if ('problems' in file) return { text, steps: [] };
  // (a fragment of the library is normalised against the others: its own lines are their own home)
  const own = /^---\n[\s\S]*?^id: *"?([^"\n]+?)"? *$/m.exec(text)?.[1];
  const { source, steps } = normaliseText(file.text, own ? { ...SEED, library: SEED.library.filter((f) => f.id !== own) } : SEED, options.rules);
  if (file.raw) return { text: source, steps };
  if (!steps.length) return { text, steps };
  return { text: renderFile(file, rewrite(file.layout, source.trimEnd())), steps };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const blocks = args.includes('--blocks');
  const at = args.indexOf('--rules');
  const rules = at < 0 ? undefined : new Set(args[at + 1]!.split(','));
  const paths = args.filter((a, i) => a !== '--blocks' && i !== at && i !== at + 1);
  for (const path of paths) {
    const before = readFileSync(path, 'utf8');
    const { text, steps } = normaliseFile(path, before, { blocks, rules });
    if (text !== before) writeFileSync(path, text);
    console.log(`${path}: ${steps.length ? steps.join('; ') : 'normal'}`);
  }
}
