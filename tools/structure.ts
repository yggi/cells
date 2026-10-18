/**
 * A text's structure, as decision 049 rules Shorten's measure (`src/engine/measure.ts`), reported for a pull request that
 * claims a text more compact by structure (#177: BWV 847 by hand, 1,396 → 1,125).
 *
 *   node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/structure.ts \
 *     [--cells] [--as-written] <input>...
 *
 * An input is `example:<key>` (examples/<key>.md), a piece or fragment file (`.md`, its cells blocks joined) or a `.cells` text.
 * `--cells` adds a row per cell; `--as-written` measures the text as it is, not `normalise(text)`.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { structureByCell, structureOf, type Structure } from '../src/engine/measure';
import { readLiterate } from '../src/engine/literate';

/** An input's cells text: an example by key, a piece or fragment file's cells block, or a `.cells` text. */
export function textOf(input: string): string {
  const path = input.startsWith('example:') ? `examples/${input.slice('example:'.length)}.md` : input;
  const file = readFileSync(path, 'utf8');
  if (!path.endsWith('.md')) return file;
  const read = readLiterate(file);
  return 'text' in read ? read.text : '';
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const perCell = args.includes('--cells');
  const asWritten = args.includes('--as-written');
  const row = (name: string, s: Structure) =>
    `${name.padEnd(36)} ${String(s.cells).padStart(6)} ${String(s.leaves).padStart(7)} ${String(s.attributes).padStart(11)} ${String(s.total).padStart(7)}`;
  console.log(`${'input'.padEnd(36)} ${'cells'.padStart(6)} ${'leaves'.padStart(7)} ${'attributes'.padStart(11)} ${'total'.padStart(7)}`);
  for (const input of args.filter((a) => !a.startsWith('--'))) {
    const text = textOf(input);
    if (perCell) for (const c of structureByCell(text, { asWritten })) console.log(row(`  &${c.name}`, c));
    console.log(row(input, structureOf(text, { asWritten })));
  }
}
