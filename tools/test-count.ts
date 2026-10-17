// A vitest reporter that `npm run verify` adds beside the default one (`npm test -- --reporter=default --reporter=…`):
// when the run passes, it writes the number of tests that passed to the git directory (`cells-tests-passed`), where
// `postverify` (tools/verified.sh `end`) reads it into the stamp of the tree that passed, so the pre-push hook can say
// the count for a tree it doesn't verify again; a run that fails removes it. Outside a git checkout it does nothing.
// Lifted from yggi/cell-studio tools/test-count.mjs @ 55d8d4e (adapted: TypeScript, a module's tests as an iterable).
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Reporter, TestModule, TestRunEndReason } from 'vitest/node';

/** The file the count is kept in, or null outside a git checkout. */
export function countFile(cwd = process.cwd()): string | null {
  try {
    const gitdir = execFileSync('git', ['rev-parse', '--absolute-git-dir'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return join(gitdir, 'cells-tests-passed');
  } catch {
    return null;
  }
}

/** What the count needs of a test module: the tests in it that passed. */
interface Counted {
  children: { allTests(state: 'passed'): Iterable<unknown> };
}

/** Keeps in `file` the count of a run that ended for `reason`, or removes it when the run failed. */
export function keepCount(file: string, modules: ReadonlyArray<Counted>, errors: ReadonlyArray<unknown>, reason: TestRunEndReason) {
  if (reason !== 'passed' || errors.length > 0) {
    rmSync(file, { force: true });
    return;
  }
  let passed = 0;
  for (const module of modules) for (const _ of module.children.allTests('passed')) passed++;
  writeFileSync(file, `${passed}\n`);
}

export default class TestCount implements Reporter {
  onTestRunEnd(modules: ReadonlyArray<TestModule>, errors: ReadonlyArray<unknown>, reason: TestRunEndReason) {
    const file = countFile();
    if (file) keepCount(file, modules, errors, reason);
  }
}
