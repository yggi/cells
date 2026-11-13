// The language's laws (decision 083, #632): `docs/language/laws.md` names each law's test, and each test says which law it
// checks (`// law L3`). The page and the tags agree both ways: every law on the page names a file that tags it, and every
// tag in a test is a law on the page that names that file; a conjecture is tagged nowhere.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const page = readFileSync(join(ROOT, 'docs/language/laws.md'), 'utf8');

/** The page's rows: each law (or conjecture) and the test files its row names in backticks. */
const rows = (prefix: 'L' | 'C') =>
  page.split('\n').flatMap((line) => {
    const m = new RegExp(`^\\| (${prefix}\\d+) \\|`).exec(line);
    return m ? [{ id: m[1]!, files: [...line.matchAll(/`(src\/[^`]+\.test\.ts)`/g)].map((f) => f[1]!) }] : [];
  });

/** Every test file under src/, relative to the repository. */
function testFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const path = join(dir, f);
    return statSync(path).isDirectory() ? testFiles(path) : f.endsWith('.test.ts') ? [relative(ROOT, path)] : [];
  });
}

/** The laws a file's `// law …` tags name. */
const tagsIn = (file: string) => [...readFileSync(join(ROOT, file), 'utf8').matchAll(/^\s*\/\/ law ((?:[LC]\d+(?:, )?)+)$/gm)].flatMap((m) => m[1]!.split(', '));

/** What disagrees between the page's rows and the tests' tags: each mismatch said. */
function mismatches(laws: readonly { id: string; files: readonly string[] }[], conjectures: ReadonlySet<string>, tagged: ReadonlyMap<string, readonly string[]>): string[] {
  const out: string[] = [];
  for (const l of laws) {
    if (!l.files.length) out.push(`${l.id} names no test`);
    for (const f of l.files) if (!(tagged.get(f) ?? []).includes(l.id)) out.push(`${l.id}: ${f} doesn't tag it`);
  }
  const byId = new Map(laws.map((l) => [l.id, l.files]));
  for (const [file, ids] of tagged)
    for (const id of ids) {
      if (conjectures.has(id)) out.push(`${file} tags conjecture ${id}`);
      else if (!(byId.get(id) ?? []).includes(file)) out.push(`${file} tags ${id}, which the page doesn't give it`);
    }
  return out;
}

describe('the language’s laws: the page and the tests’ tags agree (decision 083)', () => {
  const laws = rows('L');
  const conjectures = new Set(rows('C').map((c) => c.id));
  const tagged = new Map(testFiles(join(ROOT, 'src')).map((f) => [f, tagsIn(f)] as const));

  it('lists L1 to L11 in order, and its conjectures', () => {
    expect(laws.map((l) => l.id)).toEqual(Array.from({ length: laws.length }, (_, i) => `L${i + 1}`));
    expect(laws.length).toBeGreaterThanOrEqual(11);
    expect(conjectures.size).toBeGreaterThan(0);
  });

  it('every law names a test that tags it, and every tag is a law the page gives that file', () => {
    expect(mismatches(laws, conjectures, tagged)).toEqual([]);
  });

  it('is shown firing: a law with its tag gone, a tag the page doesn’t give, a conjecture tagged', () => {
    const broken = new Map(tagged);
    broken.set('src/engine/alpha.test.ts', []);
    broken.set('src/engine/edit.test.ts', ['L10', 'L1', 'C4']);
    expect(mismatches(laws, conjectures, broken)).toEqual([
      "L1: src/engine/alpha.test.ts doesn't tag it",
      "src/engine/edit.test.ts tags L1, which the page doesn't give it",
      'src/engine/edit.test.ts tags conjecture C4',
    ]);
  });
});
