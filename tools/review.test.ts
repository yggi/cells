// The review skill's prepare.sh (.claude/skills/review/), run against a throwaway origin with a pull request #7.
// Lifted from yggi/jambot tooling/review-pr.test.ts @ ef79048 (adapted: npm, the slow tests in place of the end-to-end
// ones, the ladder's files, the changelog, the probe of the language under Node).
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('../.claude/skills/review/prepare.sh', import.meta.url));
const repository = fileURLToPath(new URL('..', import.meta.url));
const nodeTs = fileURLToPath(new URL('./node-ts.mjs', import.meta.url));

// Without the GIT_ variables a hook run from a linked worktree hands its children (tools/hooks.test.ts says why).
const env: NodeJS.ProcessEnv = {
  ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^GIT_/.test(name))),
  GIT_AUTHOR_NAME: 'test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};
const passing = 'echo "      Tests  12 passed (12)"';
// CI's check runs, as GitHub's API answers for a commit; by default the lookup fails, as it does offline.
const noCi = 'exit 1';
const checkRuns = (...runs: [name: string, conclusion: string][]) =>
  `echo '${JSON.stringify({ check_runs: runs.map(([name, conclusion], id) => ({ id, name, status: 'completed', conclusion, html_url: `https://ci/${name}` })) })}'`;

let root: string;
let clone: string;

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();

function commit(file: string, text: string, message: string) {
  mkdirSync(dirname(join(clone, file)), { recursive: true });
  writeFileSync(join(clone, file), text);
  git(clone, 'add', file);
  git(clone, 'commit', '-q', '-m', message);
}

/** Commits `file` on the pull request (#7, branch `feature`) and pushes it. */
function onPullRequest(file: string, text: string, message: string) {
  git(clone, 'checkout', '-q', 'feature');
  commit(file, text, message);
  git(clone, 'push', '-q', 'origin', '+feature:refs/pull/7/head', '+feature:feature');
  git(clone, 'checkout', '-q', 'main');
}

/**
 * Runs prepare.sh in the clone, with `verify` standing in for install and `npm run verify`, `slow` for the slow tests,
 * and `ci` for the lookup of CI's check runs.
 */
function prepare(args: string[], verify = passing, input?: string, slow?: string, ci = noCi) {
  const run = spawnSync('sh', input === undefined ? [script, ...args] : ['-s', '--', ...args], {
    cwd: clone,
    input,
    env: { ...env, CELLS_REVIEW_VERIFY: verify, CELLS_REVIEW_INSTALL: 'echo installed', CELLS_REVIEW_CI: ci, ...(slow && { CELLS_REVIEW_SLOW: slow }) },
    encoding: 'utf8',
    // A run left waiting on the lock fails, rather than hang the suite.
    timeout: 15_000,
  });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

/** Runs prepare.sh like `prepare`, without waiting for it. */
function prepareAsync(args: string[], verify: string) {
  const run = spawn('sh', [script, ...args], { cwd: clone, env: { ...env, CELLS_REVIEW_VERIFY: verify, CELLS_REVIEW_CI: noCi } });
  let stdout = '';
  let stderr = '';
  run.stdout.on('data', (data: Buffer) => (stdout += data.toString()));
  run.stderr.on('data', (data: Buffer) => (stderr += data.toString()));
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve) => run.on('close', (status) => resolve({ status, stdout, stderr })));
}

// An origin with main and a pull request #7 (a branch `feature`, also at refs/pull/7/head as GitHub has it), and a
// clone of it to run from. It is built once and copied for each test, since building it takes half a second of git.
let template: string;
beforeAll(() => {
  template = mkdtempSync(join(tmpdir(), 'cells-review-template-'));
  const origin = join(template, 'origin.git');
  clone = join(template, 'clone');
  git(template, 'init', '-q', '--bare', '-b', 'main', origin);
  git(template, 'clone', '-q', origin, clone);
  commit('shared.txt', 'one\n', 'Base');
  git(clone, 'push', '-q', 'origin', 'HEAD:main');
  git(clone, 'checkout', '-q', '-b', 'feature');
  commit('shared.txt', 'two\n', 'Step 1: change the shared file');
  for (let i = 0; i < 35; i++) writeFileSync(join(clone, `file-${i}.txt`), `${i}\n`);
  git(clone, 'add', '.');
  git(clone, 'commit', '-q', '-m', 'Step 2: add 35 files');
  commit('last.txt', 'last\n', 'Step 3: the last file');
  git(clone, 'push', '-q', 'origin', 'feature', 'feature:refs/pull/7/head');
  git(clone, 'checkout', '-q', 'main');
});
afterAll(() => rmSync(template, { recursive: true, force: true }));

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'cells-review-'));
  cpSync(template, root, { recursive: true });
  clone = join(root, 'clone');
  git(clone, 'remote', 'set-url', 'origin', join(root, 'origin.git'));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('review prepare.sh', () => {
  it('checks out a pull request by number and lists every commit and every file', () => {
    const { status, stdout } = prepare(['7', join(root, 'wt')]);
    expect(status).toBe(0);
    expect(stdout).toContain(`Reviewing 7 at ${git(clone, 'rev-parse', '--short', 'feature')}`);
    for (const step of ['Step 1', 'Step 2', 'Step 3']) expect(stdout).toContain(step);
    for (const file of ['shared.txt', 'file-0.txt', 'file-34.txt', 'last.txt']) expect(stdout).toContain(file);
    expect(stdout).toContain('npm run verify passes (Tests 12 passed (12))');
  });

  it('says when verify fails, and shows the end of its output', () => {
    const { status, stdout } = prepare(['7', join(root, 'wt')], 'echo the build broke; exit 1');
    expect(status).toBe(0);
    expect(stdout).toContain('npm run verify FAILS');
    expect(stdout).toContain('the build broke');
  });

  it("shows the failing tests from verify's output, not the lines around them", () => {
    const verify = [
      'echo noise before',
      'echo " FAIL  |quick| src/a.test.ts > breaks"',
      'echo "⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯"',
      'echo " FAIL  |quick| src/a.test.ts > breaks"',
      'echo "Error: Test timed out in 5000ms."',
      'echo " Test Files  1 failed (1)"',
      'echo "      Tests  1 failed | 3 passed (4)"',
      'for i in $(seq 40); do echo noise after; done',
      'exit 1',
    ].join('; ');
    const { stdout } = prepare(['7', join(root, 'wt')], verify);
    expect(stdout).toContain('npm run verify FAILS (Tests 1 failed | 3 passed (4))');
    expect(stdout).toContain('Error: Test timed out in 5000ms.');
    expect(stdout).not.toContain('noise');
  });

  it('runs the slow tests only when the pull request touches what they read, and shows their end when they fail', () => {
    expect(prepare(['7', join(root, 'wt')], passing, undefined, 'echo "      Tests  3 passed (3)"').stdout).not.toContain('test:slow');
    onPullRequest('src/engine/fold/fold.ts', 'x\n', 'Step 4: the folder');
    const passed = prepare(['7', join(root, 'wt')], passing, undefined, 'echo "      Tests  3 passed (3)"');
    expect(passed.stdout).toContain('npm run test:slow passes (Tests 3 passed (3))');
    const failed = prepare(['7', join(root, 'wt')], 'echo verify noise; ' + passing, undefined, 'echo "the ratchet lost a fold"; exit 1');
    expect(failed.stdout).toContain('npm run test:slow FAILS');
    expect(failed.stdout).toContain('the ratchet lost a fold');
    expect(failed.stdout).not.toContain('verify noise');
  });

  it("reuses CI's run on the head when verify and the slow tests both passed there, and runs them itself otherwise", () => {
    onPullRequest('src/engine/fold/fold.ts', 'x\n', 'Step 4: the folder');
    const ranHere = 'echo ran locally; exit 1';
    const witnessed = prepare(['7', join(root, 'wt')], ranHere, undefined, ranHere, checkRuns(['verify', 'success'], ['slow', 'success']));
    expect(witnessed.stdout).toContain('CI passed verify and the slow tests on this commit, so neither ran here (--verify runs them): https://ci/verify');
    expect(witnessed.stdout).not.toContain('ran locally');
    for (const ci of [checkRuns(['verify', 'success'], ['slow', 'failure']), checkRuns(['verify', 'success']), noCi, 'echo not json']) {
      const { stdout } = prepare(['7', join(root, 'wt')], passing, undefined, 'echo "      Tests  3 passed (3)"', ci);
      expect(stdout).toContain('npm run verify passes');
      expect(stdout).toContain('npm run test:slow passes');
    }
    const forced = prepare(['7', '--verify', join(root, 'wt')], passing, undefined, undefined, checkRuns(['verify', 'success'], ['slow', 'success']));
    expect(forced.stdout).toContain('npm run verify passes');
  });

  it("reads CI's latest run of a job, so a re-run that passed counts and one that failed after a pass doesn't", () => {
    const runs = (first: string, second: string) =>
      `echo '${JSON.stringify({
        check_runs: [
          { id: 2, name: 'verify', status: 'completed', conclusion: second, html_url: 'https://ci/2' },
          { id: 1, name: 'verify', status: 'completed', conclusion: first, html_url: 'https://ci/1' },
          { id: 3, name: 'slow', status: 'completed', conclusion: 'success' },
        ],
      })}'`;
    expect(prepare(['7', join(root, 'wt')], passing, undefined, undefined, runs('failure', 'success')).stdout).toContain('https://ci/2');
    expect(prepare(['7', join(root, 'wt')], passing, undefined, undefined, runs('success', 'failure')).stdout).toContain('npm run verify passes');
  });

  it.each([
    ['src/engine/snapshot.txt', 'what a piece plays moves'],
    ['fixtures/contracts/euclid.json', "the hub's contract vectors change"],
    ['src/host.d.ts', 'the purity gate changes'],
    ['types/index.d.ts', 'the declarations a frontend typechecks against change'],
    ['src/engine/fold/ratchet.baseline.json', 'Ratchet: recorded anew'],
  ])('names a change to %s, on the ladder’s last rung or a ratchet', (file, says) => {
    expect(prepare(['7', join(root, 'wt')]).stdout).not.toContain('Ladder:');
    onPullRequest(file, 'moved\n', `Step 4: ${file}`);
    expect(prepare(['7', join(root, 'wt')]).stdout).toContain(says);
  });

  it('asks about the changelog when src/ changes beyond its tests and CHANGELOG.md does not', () => {
    onPullRequest('src/engine/a.test.ts', 'x\n', 'Step 4: a test');
    expect(prepare(['7', join(root, 'wt')]).stdout).not.toContain('Changelog:');
    onPullRequest('src/engine/a.ts', 'x\n', 'Step 5: the code');
    expect(prepare(['7', join(root, 'wt')]).stdout).toContain('Changelog: src/ changes beyond its tests');
    onPullRequest('CHANGELOG.md', 'x\n', 'Step 6: its line');
    expect(prepare(['7', join(root, 'wt')]).stdout).not.toContain('Changelog:');
  });

  it('says how to probe the language under Node, where the pull request has the hook', () => {
    expect(prepare(['7', join(root, 'wt')]).stdout).not.toContain('Probe:');
    onPullRequest('tools/node-ts.mjs', '\n', 'Step 4: the hook');
    const { stdout } = prepare(['7', join(root, 'wt')]);
    expect(stdout).toContain(`Probe: cd ${join(root, 'wt')} && node `);
  });

  it("starts the probe with notes(), which plays a piece from this repository's source", () => {
    onPullRequest('tools/node-ts.mjs', '\n', 'Step 4: the hook');
    const probe = /^Probe: .*--input-type=module -e "(.*…)"$/m.exec(prepare(['7', join(root, 'wt')]).stdout)![1]!;
    const run = spawnSync(
      'node',
      ['--experimental-transform-types', '--no-warnings', '--import', nodeTs, '--input-type=module', '-e', probe.replace('…', "console.log(JSON.stringify(notes('&a loop=A4')));")],
      { cwd: repository, encoding: 'utf8' },
    );
    expect(run.stderr).toBe('');
    expect(JSON.parse(run.stdout)).toEqual([['a', 0, 600, 440]]);
  });

  it('runs one review at a time, so two never share the machine', async () => {
    const times = join(root, 'times');
    const verify = `echo start >>${times}; sleep 1; echo end >>${times}; ${passing}`;
    const runs = await Promise.all([prepareAsync(['7', join(root, 'a')], verify), prepareAsync(['feature', join(root, 'b')], verify)]);
    for (const run of runs) expect(run.status).toBe(0);
    expect(readFileSync(times, 'utf8')).toBe('start\nend\nstart\nend\n');
    expect(runs.map((run) => run.stderr).join('')).toContain('waiting for another review');
  }, 20_000);

  it('fetches and checks out only once it holds the lock, since a fetch fails on a worktree still being added', async () => {
    const lock = join(git(clone, 'rev-parse', '--absolute-git-dir'), 'review.lock');
    mkdirSync(lock);
    writeFileSync(join(lock, 'pid'), `${process.pid}\n`);
    const run = prepareAsync(['7', join(root, 'wt')], passing);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(existsSync(join(root, 'wt'))).toBe(false);
    expect(() => git(clone, 'rev-parse', '--verify', '-q', 'refs/remotes/origin/pr/7')).toThrow();
    rmSync(lock, { recursive: true });
    expect((await run).status).toBe(0);
  }, 20_000);

  it('takes over a lock whose review is gone', () => {
    const lock = join(git(clone, 'rev-parse', '--absolute-git-dir'), 'review.lock');
    mkdirSync(lock);
    // A pid that no process has: above the kernel's limit.
    writeFileSync(join(lock, 'pid'), '99999999\n');
    const { status, stdout } = prepare(['7', join(root, 'wt')]);
    expect(status).toBe(0);
    expect(stdout).toContain('npm run verify passes');
  }, 20_000);

  it('names the files it conflicts in with another pull request, with --against', () => {
    git(clone, 'checkout', '-q', '-b', 'rival', 'main');
    commit('shared.txt', 'rival\n', 'Rival changes the shared file');
    git(clone, 'push', '-q', 'origin', 'rival', 'rival:refs/pull/8/head');
    git(clone, 'checkout', '-q', 'main');
    expect(prepare(['7', '--against', '8', join(root, 'wt')]).stdout).toContain('Against 8: conflicts in: shared.txt');
  });

  it('says it merges cleanly with another branch, with --against', () => {
    git(clone, 'checkout', '-q', '-b', 'rival', 'main');
    commit('other.txt', 'rival\n', 'Rival adds another file');
    git(clone, 'push', '-q', 'origin', 'rival');
    git(clone, 'checkout', '-q', 'main');
    expect(prepare(['7', '--against', 'rival', join(root, 'wt')]).stdout).toContain('Against rival: merges cleanly');
  });

  it('warns when main has moved past the merge base, and names the conflicts', () => {
    commit('shared.txt', 'three\n', 'Main moves on');
    git(clone, 'push', '-q', 'origin', 'main');
    const { stdout } = prepare(['7', join(root, 'wt')]);
    expect(stdout).toContain('Behind main by 1 commit');
    expect(stdout).toContain('conflicts with main in: shared.txt');
  });

  it('says a pull request behind main merges cleanly when it does, and nothing when it is up to date', () => {
    expect(prepare(['7', join(root, 'wt')]).stdout).not.toContain('Behind main');
    commit('other.txt', 'x\n', 'Main moves on elsewhere');
    git(clone, 'push', '-q', 'origin', 'main');
    const { stdout } = prepare(['7', join(root, 'wt')]);
    expect(stdout).toContain('Behind main by 1 commit');
    expect(stdout).toContain('merges with main cleanly');
  });

  const diffNames = (stdout: string) => execFileSync('sh', ['-c', /^Diff: (git .*)$/m.exec(stdout)![1]!.replace(' diff ', ' diff --name-only ')], { encoding: 'utf8', env });

  it('scopes the commits and the diff with --from', () => {
    const from = git(clone, 'rev-parse', 'feature~1');
    const { stdout } = prepare(['7', '--from', from, join(root, 'wt')]);
    expect(stdout).toContain(`Scope: ${from.slice(0, 7)}..`);
    expect(stdout).toContain('Step 3');
    expect(stdout).not.toContain('Step 1');
    expect(stdout).not.toContain('file-0.txt');
    expect(diffNames(stdout)).toBe('last.txt\n');
  });

  it('leaves main out of --from, after main was merged into the pull request', () => {
    const from = git(clone, 'rev-parse', 'feature~1');
    commit('other.txt', 'x\n', 'Main moves on elsewhere');
    git(clone, 'push', '-q', 'origin', 'main');
    git(clone, 'checkout', '-q', 'feature');
    git(clone, 'merge', '-q', '--no-edit', 'main');
    git(clone, 'push', '-q', 'origin', 'feature:refs/pull/7/head');
    git(clone, 'checkout', '-q', 'main');
    const { stdout } = prepare(['7', '--from', from, join(root, 'wt')]);
    expect(stdout).toContain('(2 of 4 commits)');
    expect(stdout).toContain('last.txt');
    expect(stdout).not.toContain('Main moves on elsewhere');
    expect(stdout).not.toContain('Behind main');
    expect(diffNames(stdout)).toBe('last.txt\n');
  });

  it('limits --from to the files it touched when <commit> conflicts with main', () => {
    const from = git(clone, 'rev-parse', 'feature~1');
    commit('shared.txt', 'three\n', 'Main changes the shared file too');
    commit('last.txt', 'main\n', 'Main adds the last file too');
    git(clone, 'push', '-q', 'origin', 'main');
    git(clone, 'checkout', '-q', 'feature');
    git(clone, 'merge', '-q', '-X', 'ours', '--no-edit', 'main');
    git(clone, 'push', '-q', 'origin', 'feature:refs/pull/7/head');
    git(clone, 'checkout', '-q', 'main');
    const { stdout } = prepare(['7', '--from', from, join(root, 'wt')]);
    expect(stdout).toContain('does not merge with main cleanly');
    expect(stdout).toContain("may show main's changes in: last.txt\n");
    expect(diffNames(stdout)).toBe('last.txt\n');
  });

  it('checks out a branch by name, and fails cleanly for one that does not exist', () => {
    expect(prepare(['feature', join(root, 'wt')]).stdout).toContain('Reviewing feature at');
    const { status, stderr } = prepare(['no-such-branch', join(root, 'none')]);
    expect(status).toBe(1);
    expect(stderr).toContain('could not fetch');
  });

  it('runs from main when piped to sh, for a checkout that does not have it', () => {
    const { status, stdout } = prepare(['7', join(root, 'wt')], passing, readFileSync(script, 'utf8'));
    expect(status).toBe(0);
    expect(stdout).toContain('Reviewing 7 at');
  });
});
