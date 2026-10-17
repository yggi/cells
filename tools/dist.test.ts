// dist/ is what `npm run dist` writes from src/ (tools/dist.ts): Node runs it from a frontend's node_modules, so it must not
// lag the source. Compared with a fresh emit, then the packed package is installed into a scratch directory and imported by
// plain Node, with no flag (yggi/cells#11).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { expect, it } from 'vitest';
import { distFiles } from './dist.ts';

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));

it('dist/ is what npm run dist writes from src/', () => {
  const fresh = distFiles();
  expect(
    files('dist')
      .map((f) => relative('dist', f))
      .sort(),
    'the same files',
  ).toEqual([...fresh.keys()].sort());
  for (const [path, text] of fresh) expect(readFileSync(join('dist', path), 'utf8'), path).toBe(text);
});

it('the packed package compiles under plain Node, from node_modules', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'cells-pack-'));
  const [{ filename }] = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', scratch], { encoding: 'utf8' })) as { filename: string }[];
  const app = join(scratch, 'app');
  mkdirSync(join(app, 'node_modules/@yggi/cells'), { recursive: true });
  writeFileSync(join(app, 'package.json'), '{"type":"module"}');
  execFileSync('tar', ['-xzf', join(scratch, filename), '-C', join(app, 'node_modules/@yggi/cells'), '--strip-components=1']);
  expect(existsSync(join(app, 'node_modules/@yggi/cells/dist/index.js'))).toBe(true);
  const run = (code: string) => execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: app, encoding: 'utf8' });
  expect(run("import('@yggi/cells').then(m => console.log(m.compileSource('&a loop=A4').ok))").trim()).toBe('true');
  // a subpath, a folder's index, and a dynamic import inside the package
  expect(run("import('@yggi/cells/engine/compile').then(m => console.log(typeof m.compileSource))").trim()).toBe('function');
}, 60_000);
