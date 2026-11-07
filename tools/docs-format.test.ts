// tools/docs-format.sh: the docs check's Prettier, over the files a branch changes and no other (#529).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('docs-format.sh', import.meta.url));
const bin = fileURLToPath(new URL('../node_modules/.bin', import.meta.url));
// (no GIT_ variables a hook hands down, and no global config: a session's signed commits are slow under load, #275;
// the lockfile's Prettier on the PATH, as npm puts it there for `npm run verify:docs`)
const env: NodeJS.ProcessEnv = {
  ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^GIT_/.test(name))),
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_AUTHOR_NAME: 'docs',
  GIT_AUTHOR_EMAIL: 'docs@test',
  GIT_COMMITTER_NAME: 'docs',
  GIT_COMMITTER_EMAIL: 'docs@test',
  PATH: `${bin}${delimiter}${process.env.PATH ?? ''}`,
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

const ugly = 'a\n\n\n\nb\n';
const tidy = 'a\n\nb\n';

/** The script's exit status on a branch that writes `files` on top of an `origin/main` whose `old.md` Prettier fails. */
function status(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'cells-docs-format-'));
  repos.push(dir);
  git(dir, 'init', '-q');
  writeFileSync(join(dir, 'old.md'), ugly);
  git(dir, 'add', '.');
  git(dir, 'commit', '-qm', 'base');
  git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  git(dir, 'add', '.');
  git(dir, 'commit', '-qm', 'change');
  return spawnSync('sh', [script], { cwd: dir, env, encoding: 'utf8' }).status;
}

describe('the docs check’s Prettier (#529)', () => {
  it('checks the files the branch changes, not one it doesn’t touch', () => {
    expect(status({ 'notes.md': tidy })).toBe(0);
    expect(status({ 'notes.md': ugly })).not.toBe(0);
  });
});
