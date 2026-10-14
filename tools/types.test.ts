// types/ is what `npm run types` writes from src/ (tsconfig.types.json): a consumer typechecks against it, so it must not
// lag the source. Written into a scratch directory here and compared file by file.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { expect, it } from 'vitest';

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));

it('types/ is what npm run types writes from src/', () => {
  const out = mkdtempSync(join(tmpdir(), 'cells-types-'));
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.types.json', '--outDir', out]);
  const fresh = files(out)
    .map((f) => relative(out, f))
    .sort();
  expect(
    files('types')
      .map((f) => relative('types', f))
      .sort(),
    'the same files',
  ).toEqual(fresh);
  for (const f of fresh) expect(readFileSync(join('types', f), 'utf8'), f).toBe(readFileSync(join(out, f), 'utf8'));
}, 60_000);
