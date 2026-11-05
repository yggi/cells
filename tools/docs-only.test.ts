// tools/docs-only.sh: which branches the docs check stands in for verify on, in the pre-push hook and in CI.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('docs-only.sh', import.meta.url));
// (no GIT_ variables a hook hands down, and no global config: a session's signed commits are slow under load, #275)
const env: NodeJS.ProcessEnv = {
  ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^GIT_/.test(name))),
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_AUTHOR_NAME: 'docs',
  GIT_AUTHOR_EMAIL: 'docs@test',
  GIT_COMMITTER_NAME: 'docs',
  GIT_COMMITTER_EMAIL: 'docs@test',
};

const repos: string[] = [];
afterEach(() => {
  for (const dir of repos.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function git(dir: string, ...args: string[]) {
  const run = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', env });
  if (run.status !== 0) throw new Error(run.stderr);
  return run.stdout.trim();
}

/** What the script says of a branch that adds `files` on top of an `origin/main` holding a README and a source file. */
function verdict(files: string[], base?: string) {
  const dir = mkdtempSync(join(tmpdir(), 'cells-docs-only-'));
  repos.push(dir);
  git(dir, 'init', '-q');
  writeFileSync(join(dir, 'README.md'), 'a\n');
  writeFileSync(join(dir, 'a.ts'), 'a\n');
  git(dir, 'add', '.');
  git(dir, 'commit', '-qm', 'base');
  git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  for (const file of files) {
    mkdirSync(join(dir, dirname(file)), { recursive: true });
    writeFileSync(join(dir, file), 'b\n');
  }
  if (files.length > 0) {
    git(dir, 'add', '.');
    git(dir, 'commit', '-qm', 'change');
  }
  const run = spawnSync('sh', [script, ...(base ? [base] : [])], { cwd: dir, env, encoding: 'utf8' });
  expect(run.status, run.stderr).toBe(0);
  return run.stdout.trim();
}

describe('docs-only.sh', () => {
  it.each([[['CHANGELOG.md']], [['changes/12.md']], [['docs/MEMORY.md', 'docs/decisions/070-x.md', 'docs/notes/1.md']], [['AGENTS.md']]])(
    'says docs for prose alone: %j',
    (files) => {
      expect(verdict(files)).toBe('docs');
    },
  );

  it.each([
    [['a.ts']],
    [['CHANGELOG.md', 'src/b.ts']],
    [['CHANGELOG.md', 'package.json']],
    [['examples/x.md']],
    [['fragments/drums/x.md']],
    [['midi/set/README.md']],
    [['docs/language/reference.md']],
    [['README.md']],
  ])('says code for anything else, markdown that is code included: %j', (files) => {
    expect(verdict(files)).toBe('code');
  });

  it('says code, the fail-safe, when nothing differs or the base is unknown', () => {
    expect(verdict([])).toBe('code');
    expect(verdict(['CHANGELOG.md'], 'origin/nowhere')).toBe('code');
  });
});
