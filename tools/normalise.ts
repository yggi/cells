// npm run normalise -- <files>: each file in the canonical spelling (src/engine/normalise, decision 049), in place. A .cells
// file is a text; a Markdown file (a piece, a fragment) is normalised in its cells block, the rest kept byte for byte. A
// text that doesn't compile is left as it is, since every rewrite is checked to play the same.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalise } from '../src/engine/normalise/index.ts';

const BLOCK = /(```cells\n)([\s\S]*?)(```)/;

/** A file's text in the canonical spelling, and what each rewrite did. */
export function normaliseFile(path: string, text: string): { text: string; steps: string[] } {
  if (!path.endsWith('.md')) {
    const { source, steps } = normalise(text);
    return { text: source, steps };
  }
  const block = BLOCK.exec(text);
  if (!block) return { text, steps: [] };
  const { source, steps } = normalise(block[2]!);
  return { text: text.replace(BLOCK, (_, open: string, __: string, close: string) => open + source + close), steps };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const path of process.argv.slice(2)) {
    const before = readFileSync(path, 'utf8');
    const { text, steps } = normaliseFile(path, before);
    if (text !== before) writeFileSync(path, text);
    console.log(`${path}: ${steps.length ? steps.join('; ') : 'normal'}`);
  }
}
