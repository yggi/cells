// The reporter that counts the tests verify passed (tools/test-count.ts), on a run that passed and on one that didn't.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { countFile, keepCount } from './test-count.ts';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A file in a scratch directory, holding a count an earlier run left. */
function file() {
  const dir = mkdtempSync(join(tmpdir(), 'cells-count-'));
  dirs.push(dir);
  const path = join(dir, 'cells-tests-passed');
  writeFileSync(path, '99\n');
  return path;
}

/** A test module whose passed tests are `n` in number. */
const module = (n: number) => ({ children: { allTests: () => Array.from({ length: n }) } });

describe('the count of tests passed', () => {
  it('is the passed tests of every module, kept when the run passed', () => {
    const path = file();
    keepCount(path, [module(3), module(4)], [], 'passed');
    expect(readFileSync(path, 'utf8')).toBe('7\n');
  });

  it.each([
    ['failed', [], 'failed'],
    ['was interrupted', [], 'interrupted'],
    ['passed with an unhandled error', [new Error('stray')], 'passed'],
  ] as const)('is removed when the run %s', (_, errors, reason) => {
    const path = file();
    keepCount(path, [module(3)], errors, reason);
    expect(existsSync(path)).toBe(false);
  });

  it('lives in the git directory, and nowhere outside a checkout', () => {
    expect(countFile()).toMatch(/cells-tests-passed$/);
    const outside = mkdtempSync(join(tmpdir(), 'cells-no-git-'));
    dirs.push(outside);
    expect(countFile(outside)).toBeNull();
  });
});
