// npm run normalise -- <files>: each file in the canonical spelling (src/engine/normalise, decision 049), in place. A .cells
// file is a text; a Markdown file (a piece, a fragment) is normalised in its cells blocks (joined, literate cells, decision
// 051; each changed line goes back into the block it came from), the rest kept byte for byte. A
// text that doesn't compile is left as it is, since every rewrite is checked to play the same. It reads the seed library: its
// `use` lines resolve, and a line that is a fragment's word for word is written as a `use` of it (#196).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readLiterate, renderFile, rewrite } from '../src/engine/literate.ts';
import { normalise } from '../src/engine/normalise/index.ts';
import { LIBRARY, resolveSeed } from '../src/repository/library.ts';

/** The seed library: what a `use` resolves to, and whose lines a piece takes by `use` (#196). */
const SEED = { resolve: resolveSeed, library: LIBRARY };

/** A file's text in the canonical spelling, and what each rewrite did. */
export function normaliseFile(path: string, text: string): { text: string; steps: string[] } {
  if (!path.endsWith('.md')) {
    const { source, steps } = normalise(text, SEED);
    return { text: source, steps };
  }
  const file = readLiterate(text);
  if ('problems' in file) return { text, steps: [] };
  const { source, steps } = normalise(file.text, SEED);
  if (file.raw) return { text: source, steps };
  if (!steps.length) return { text, steps };
  return { text: renderFile(file, rewrite(file.layout, source.trimEnd())), steps };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const path of process.argv.slice(2)) {
    const before = readFileSync(path, 'utf8');
    const { text, steps } = normaliseFile(path, before);
    if (text !== before) writeFileSync(path, text);
    console.log(`${path}: ${steps.length ? steps.join('; ') : 'normal'}`);
  }
}
