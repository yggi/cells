// Adapted from yggi/jambot tooling/hooks.test.ts @ 8871429: the pre-push gate (.githooks/pre-push), the stamp verify
// leaves for it (tools/verified.sh), the session's start (.claude/hooks/session-start.sh) and branch-status.sh, each
// run in a throwaway repository.
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const failing = 'echo verify ran and failed; exit 1';

// A hook run from a linked worktree hands its children GIT_DIR and friends, and they beat `git -C <dir>`: a test's
// throwaway repository would be this one. Every process here runs without them.
const env: NodeJS.ProcessEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^GIT_/.test(name)));

const repos: string[] = [];
afterEach(() => {
  for (const dir of repos.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function git(dir: string, ...args: string[]) {
  const run = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', env });
  if (run.status !== 0) throw new Error(run.stderr);
  return run.stdout.trim();
}

// The base repository is built once and copied, since building one takes most of a test's time in git.
let base: string;
beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'cells-hook-base-'));
  git(base, 'init', '-q');
  git(base, 'config', 'user.email', 'hook@test');
  git(base, 'config', 'user.name', 'hook');
  // As in a checkout whose hook runs: git runs .githooks/pre-push only when core.hooksPath points there.
  git(base, 'config', 'core.hooksPath', '.githooks');
  writeFileSync(join(base, 'README.md'), 'a\n');
  git(base, 'add', '.');
  git(base, 'commit', '-qm', 'base');
  git(base, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
});
afterAll(() => rmSync(base, { recursive: true, force: true }));

/** A repository whose `origin/main` holds `README.md`, with `files` committed on top of it. */
function repoWith(files: string[]) {
  const dir = mkdtempSync(join(tmpdir(), 'cells-hook-'));
  repos.push(dir);
  cpSync(base, dir, { recursive: true });
  for (const file of files) writeFileSync(join(dir, file), 'b\n');
  if (files.length > 0) {
    git(dir, 'add', '.');
    git(dir, 'commit', '-qm', 'change');
  }
  return dir;
}

/** Commits `name` on the current branch. */
function commit(dir: string, name: string) {
  writeFileSync(join(dir, name), 'x\n');
  git(dir, 'add', '.');
  git(dir, 'commit', '-qm', name);
}

const zero = '0'.repeat(40);

/** Runs git's pre-push hook in `dir` for a push of `refs`, with verify replaced by a shell command. */
function hook(dir: string, refs: { local?: string; remote?: string } | 'head' = 'head', verify = 'true', extra: NodeJS.ProcessEnv = {}) {
  const head = git(dir, 'rev-parse', 'HEAD');
  const { local = head, remote = 'refs/heads/work' } = refs === 'head' ? {} : refs;
  const run = spawnSync('sh', [`${root}/.githooks/pre-push`, 'origin', 'url'], {
    cwd: dir,
    input: `refs/heads/work ${local} ${remote} ${zero}\n`,
    env: { ...env, CELLS_VERIFY: verify, ...extra },
    encoding: 'utf8',
  });
  return { status: run.status, stderr: run.stderr };
}

/** Runs tools/verified.sh in `dir`, as npm's preverify (`begin`) or postverify (`end`). */
function verified(dir: string, step: 'begin' | 'end') {
  const run = spawnSync('sh', [`${root}/tools/verified.sh`, step], { cwd: dir, env, encoding: 'utf8' });
  expect(run.status, run.stderr).toBe(0);
}

/** The count of tests passed that verify's reporter (tools/test-count.ts) keeps in `dir`'s git directory. */
const counted = (dir: string) => join(git(dir, 'rev-parse', '--absolute-git-dir'), 'cells-tests-passed');

describe('pre-push', () => {
  it('blocks a push when verify fails, and says why', () => {
    const { status, stderr } = hook(repoWith(['a.ts']), 'head', failing);
    expect(status).toBe(1);
    expect(stderr).toContain('verify ran and failed');
    expect(stderr).toContain('the push was blocked');
  });

  it('keeps the whole output of a failed check, and says where, since its end may miss the failure', () => {
    const dir = repoWith(['a.ts']);
    const long = 'echo the first line failed; for i in $(seq 100); do echo noise $i; done; exit 1';
    const { stderr } = hook(dir, 'head', long);
    expect(stderr).not.toContain('the first line failed');
    const kept = /full log: (\S+)/.exec(stderr)?.[1];
    expect(kept).toBeDefined();
    expect(readFileSync(kept!, 'utf8')).toContain('the first line failed');
    expect(kept!.startsWith(git(dir, 'rev-parse', '--absolute-git-dir'))).toBe(true);
  });

  it('lets a push through when verify passes, with one line that counts the tests', () => {
    const { status, stderr } = hook(repoWith(['a.ts']), 'head', `echo ' Test Files  3 passed (3)'; echo '      Tests  12 passed (12)'`);
    expect(status).toBe(0);
    expect(stderr.trim().split('\n')).toEqual([expect.stringMatching(/^pre-push: verify passed, 12 tests; tree \w+ stamped$/)]);
  });

  it('counts the tests through the colours of a terminal', () => {
    const coloured = String.raw`printf ' \033[2m     Tests \033[22m \033[1m\033[32m7 passed\033[39m\033[22m\033[90m (7)\033[39m\n'`;
    expect(hook(repoWith(['a.ts']), 'head', coloured).stderr).toContain('verify passed, 7 tests');
  });

  it.each([
    ['deleting a branch', { local: zero, remote: 'refs/heads/work' }],
    ['pushing a tag', { remote: 'refs/tags/v1' }],
  ])('does not run verify for %s', (_, refs) => {
    expect(hook(repoWith(['a.ts']), refs, failing)).toEqual({ status: 0, stderr: '' });
  });

  it('refuses to push a commit other than the one checked out', () => {
    const dir = repoWith(['a.ts']);
    const { status, stderr } = hook(dir, { local: git(dir, 'rev-parse', 'origin/main') });
    expect(status).toBe(1);
    expect(stderr).toContain('not the checked out commit');
  });

  it('refuses a push while a tracked file has uncommitted changes', () => {
    const dir = repoWith(['a.ts']);
    writeFileSync(join(dir, 'a.ts'), 'edited\n');
    const { status, stderr } = hook(dir);
    expect(status).toBe(1);
    expect(stderr).toContain('uncommitted');
  });

  // Lifted from yggi/cell-studio tools/hooks.test.ts @ 90d1619: the untracked-file rule and the stamp of what the run saw.
  it('refuses an untracked file git does not ignore, which verify would see and the commit lacks, and names it', () => {
    const dir = repoWith(['a.ts']);
    writeFileSync(join(dir, 'helper.ts'), 'verify needs me\n');
    const { status, stderr } = hook(dir);
    expect(status).toBe(1);
    expect(stderr).toContain('untracked files are in it but not in the commit');
    expect(stderr).toContain('  helper.ts');
  });

  it('is not troubled by an ignored file', () => {
    const dir = repoWith(['a.ts']);
    writeFileSync(join(git(dir, 'rev-parse', '--absolute-git-dir'), 'info', 'exclude'), 'scratch.txt\n');
    writeFileSync(join(dir, 'scratch.txt'), 'x\n');
    expect(hook(dir).status).toBe(0);
  });

  it('is not troubled by an untracked file once the commit passed verify without it', () => {
    const dir = repoWith(['a.ts']);
    expect(hook(dir).status).toBe(0);
    writeFileSync(join(dir, 'scratch.txt'), 'x\n');
    expect(hook(dir, 'head', failing).status).toBe(0);
  });

  it('stamps the tree its own run saw, and nothing when a file changed while the check ran', () => {
    const dir = repoWith(['a.ts']);
    const { status, stderr } = hook(dir, 'head', 'echo edited > a.ts');
    expect(status).toBe(0);
    expect(stderr).toContain('a file changed while it ran: let through, not stamped');
    git(dir, 'checkout', '--', 'a.ts');
    expect(hook(dir, 'head', failing).status).toBe(1);
  });

  it('does not verify a tree twice, so a retried push is free, and says so with the count of tests that passed', () => {
    const dir = repoWith(['a.ts']);
    expect(hook(dir, 'head', `echo '      Tests  12 passed (12)'`).status).toBe(0);
    const again = hook(dir, 'head', failing);
    expect(again.status).toBe(0);
    const commit = git(dir, 'rev-parse', '--short', 'HEAD');
    expect(again.stderr.trim()).toBe(`pre-push: ${commit} passed npm run verify already (12 tests passed); not run again`);
  });

  it('reads a stamp of a tree alone, from before the count was kept, as a count unknown', () => {
    const dir = repoWith(['a.ts']);
    writeFileSync(join(git(dir, 'rev-parse', '--absolute-git-dir'), 'cells-verified'), `${git(dir, 'rev-parse', 'HEAD^{tree}')}\n`);
    const { status, stderr } = hook(dir, 'head', failing);
    expect(status).toBe(0);
    expect(stderr).toContain('passed npm run verify already (? tests passed)');
  });

  it('verifies again once the tree changes', () => {
    const dir = repoWith(['a.ts']);
    expect(hook(dir).status).toBe(0);
    commit(dir, 'b.ts');
    expect(hook(dir, 'head', failing).status).toBe(1);
  });

  it('does not remember a tree that failed', () => {
    const dir = repoWith(['a.ts']);
    expect(hook(dir, 'head', failing).status).toBe(1);
    expect(hook(dir, 'head', failing).status).toBe(1);
  });

  it('runs its check without the GIT_DIR a linked worktree hands a hook', () => {
    const dir = repoWith(['a.ts']);
    const leaks = 'test -z "$GIT_DIR" || { echo GIT_DIR leaked; exit 1; }';
    const { status, stderr } = hook(dir, 'head', leaks, { GIT_DIR: join(dir, '.git') });
    expect(stderr).not.toContain('GIT_DIR leaked');
    expect(status).toBe(0);
  });

  it('is what a checkout runs: the session start points core.hooksPath at it', () => {
    expect(readFileSync(`${root}/.claude/hooks/session-start.sh`, 'utf8')).toContain('git config core.hooksPath .githooks');
  });

  it('is what a clone runs after its first verify: preverify points core.hooksPath at it, and says so once', () => {
    const dir = repoWith(['a.ts']);
    const begin = () => spawnSync('sh', [`${root}/tools/verified.sh`, 'begin'], { cwd: dir, env, encoding: 'utf8' });
    git(dir, 'config', '--unset', 'core.hooksPath');
    expect(spawnSync('git', ['-C', dir, 'config', 'core.hooksPath'], { env }).status).toBe(1);
    expect(begin().stderr).toContain('core.hooksPath now points at .githooks');
    expect(git(dir, 'config', 'core.hooksPath')).toBe('.githooks');
    expect(begin().stderr).toBe('');
    git(dir, 'config', 'core.hooksPath', 'elsewhere');
    begin();
    expect(git(dir, 'config', 'core.hooksPath')).toBe('.githooks');
  });
});

/**
 * The scripts a package manager runs when it installs cells from git, as each frontend does (`github:yggi/cells#vX.Y.Z`).
 * pnpm 10 (Jambot's) refuses such a git dependency unless the frontend allows its builds (ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED),
 * and npm (Cell studio's) installs all of cells' devDependencies to run one (pacote's git fetcher). So the hook can't be
 * set by a `prepare` script, as Cell studio's is: a clone's first `npm run verify` sets it (`preverify`, tools/verified.sh).
 */
const installScripts = (scripts: Record<string, string>) => ['preinstall', 'install', 'postinstall', 'prepare', 'prepack', 'build'].filter((name) => name in scripts);

describe('installing cells from git', () => {
  it('is shown firing: a prepare script is one', () => {
    expect(installScripts({ prepare: 'git config core.hooksPath .githooks', verify: 'npm test' })).toEqual(['prepare']);
  });

  it('runs no script of cells, so a frontend installs it without allowing builds', () => {
    expect(installScripts(JSON.parse(readFileSync(`${root}/package.json`, 'utf8')).scripts)).toEqual([]);
  });
});

describe('the stamp verify leaves (tools/verified.sh)', () => {
  it('is written by npm run verify: preverify begins it, postverify (only after a pass) ends it, its tests counted', () => {
    const scripts = JSON.parse(readFileSync(`${root}/package.json`, 'utf8')).scripts;
    expect(scripts.preverify).toBe('node tools/install-first.mjs && sh tools/verified.sh begin');
    expect(scripts.postverify).toBe('sh tools/verified.sh end');
    expect(scripts.verify).toMatch(/npm test -- --reporter=default --reporter=\.\/tools\/test-count\.ts$/);
  });

  it("keeps the count verify's reporter left with the stamp, so the push of that tree says it", () => {
    const dir = repoWith(['a.ts']);
    verified(dir, 'begin');
    writeFileSync(counted(dir), '1938\n');
    verified(dir, 'end');
    expect(existsSync(counted(dir))).toBe(false);
    expect(hook(dir, 'head', failing).stderr).toContain('passed npm run verify already (1938 tests passed)');
  });

  it("does not take a count an earlier test run left for this run's", () => {
    const dir = repoWith(['a.ts']);
    writeFileSync(counted(dir), '5\n');
    verified(dir, 'begin');
    verified(dir, 'end');
    expect(hook(dir, 'head', failing).stderr).toContain('passed npm run verify already (? tests passed)');
  });

  it('lets the push of the files it saw through without verifying again, even if they were committed after', () => {
    const dir = repoWith(['a.ts']);
    writeFileSync(join(dir, 'a.ts'), 'edited\n');
    writeFileSync(join(dir, 'new.ts'), 'new\n');
    verified(dir, 'begin');
    verified(dir, 'end');
    git(dir, 'add', '.');
    git(dir, 'commit', '-qm', 'what verify saw');
    const { status, stderr } = hook(dir, 'head', failing);
    expect(status).toBe(0);
    expect(stderr).toContain('passed npm run verify already');
  });

  it('stamps nothing when a file changed while verify ran, since verify may have read either version', () => {
    const dir = repoWith(['a.ts']);
    verified(dir, 'begin');
    writeFileSync(join(dir, 'a.ts'), 'edited while verify ran\n');
    verified(dir, 'end');
    // Neither the tree it began on (the edit undone) nor the one it ended on (the edit committed) passed.
    git(dir, 'checkout', '--', 'a.ts');
    expect(hook(dir, 'head', failing).status).toBe(1);
    writeFileSync(join(dir, 'a.ts'), 'edited while verify ran\n');
    git(dir, 'commit', '-qam', 'the edit');
    expect(hook(dir, 'head', failing).status).toBe(1);
  });

  it('stamps nothing for a commit that leaves out a file verify saw', () => {
    const dir = repoWith(['a.ts']);
    writeFileSync(join(dir, 'helper.ts'), 'verify needed me\n');
    verified(dir, 'begin');
    verified(dir, 'end');
    expect(hook(dir, 'head', failing).status).toBe(1);
  });

  it('does nothing at the end of a run that did not begin (a verify that failed leaves its begin behind, harmless)', () => {
    const dir = repoWith(['a.ts']);
    verified(dir, 'end');
    expect(existsSync(join(git(dir, 'rev-parse', '--absolute-git-dir'), 'cells-verified'))).toBe(false);
  });
});

/** What branch-status.sh says in `dir`. */
function branchStatus(dir: string) {
  return spawnSync('sh', [`${root}/.claude/hooks/branch-status.sh`], { cwd: dir, env, encoding: 'utf8' }).stdout.trim();
}

describe('branch-status', () => {
  it('says how far the branch is ahead of origin/main', () => {
    const dir = repoWith(['a.ts']);
    expect(branchStatus(dir)).toMatch(/: 0 behind, 1 ahead of origin\/main \(/);
    expect(branchStatus(dir)).not.toContain(';');
  });

  it('tells a branch that is behind and has work to merge main', () => {
    const dir = repoWith(['a.ts']);
    git(dir, 'checkout', '-q', '-b', 'other', 'origin/main');
    commit(dir, 'main-moves.ts');
    git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    git(dir, 'checkout', '-q', '-');
    expect(branchStatus(dir)).toContain('1 behind, 1 ahead');
    expect(branchStatus(dir)).toContain('merge origin/main before starting');
  });

  it('tells a branch main already holds to restart from main', () => {
    const dir = repoWith([]);
    git(dir, 'checkout', '-q', '-b', 'old');
    commit(dir, 'merged.ts');
    git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    commit(dir, 'later-on-main.ts');
    git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    git(dir, 'reset', '-q', '--hard', 'HEAD~1');
    expect(branchStatus(dir)).toContain('1 behind, 0 ahead');
    expect(branchStatus(dir)).toContain('git checkout -B old origin/main');
  });

  it('tells a checkout that the remote branch has moved', () => {
    const dir = repoWith(['a.ts']);
    const branch = git(dir, 'branch', '--show-current');
    const mine = git(dir, 'rev-parse', 'HEAD');
    commit(dir, 'pushed-elsewhere.ts');
    git(dir, 'update-ref', `refs/remotes/origin/${branch}`, 'HEAD');
    git(dir, 'reset', '-q', '--hard', mine);
    expect(branchStatus(dir)).toContain(`origin/${branch} has 1 commits this checkout lacks: git merge --ff-only`);
  });

  it('says so when HEAD is detached or origin/main is not fetched', () => {
    const dir = repoWith([]);
    git(dir, 'update-ref', '-d', 'refs/remotes/origin/main');
    expect(branchStatus(dir)).toContain('origin/main unknown');
    git(dir, 'checkout', '-q', '--detach');
    expect(branchStatus(dir)).toBe('branch: detached HEAD');
  });
});

describe('session-start', () => {
  /** Runs the session's start in `dir`, with an `npm` that only notes how it was called and makes node_modules. */
  function start(dir: string) {
    const bin = join(dir, '.stub-bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'npm'), `#!/bin/sh\necho "$@" >>"${join(dir, 'npm-calls')}"\nmkdir -p node_modules\n`);
    chmodSync(join(bin, 'npm'), 0o755);
    const run = spawnSync('sh', [`${root}/.claude/hooks/session-start.sh`], {
      cwd: dir,
      env: { ...env, CLAUDE_PROJECT_DIR: dir, PATH: `${bin}:${env.PATH}` },
      encoding: 'utf8',
    });
    const calls = existsSync(join(dir, 'npm-calls')) ? readFileSync(join(dir, 'npm-calls'), 'utf8') : '';
    return { status: run.status, stdout: run.stdout, calls };
  }

  it('installs in a checkout with no node_modules, as a fresh git worktree is, and says how the branch stands', () => {
    const dir = repoWith(['a.ts']);
    const { status, stdout, calls } = start(dir);
    expect(status).toBe(0);
    expect(calls).toMatch(/^ci\b/);
    expect(stdout).toMatch(/0 behind, 1 ahead of origin\/main/);
    expect(git(dir, 'config', 'core.hooksPath')).toBe('.githooks');
  });

  it('does not install again where node_modules is', () => {
    const dir = repoWith(['a.ts']);
    mkdirSync(join(dir, 'node_modules'));
    expect(start(dir).calls).toBe('');
  });
});
