// A batch of pull requests landed on one verify (tools/batch.ts): each head merged in order, a conflicting one left out, and the tree main must end with. Lifted from yggi/jambot tooling/batch.test.ts @ 885b738.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MOST, landed, prepare, summary } from './batch.ts';

const identity = ['-c', 'user.name=test', '-c', 'user.email=test@localhost'];
let root: string;
let repo: string;
let count = 0;

function git(...args: string[]): string {
  const run = spawnSync('git', [...identity, ...args], { cwd: repo, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`git ${args.join(' ')}: ${run.stderr}`);
  return run.stdout.trim();
}

/** A branch off `main` that writes `files`, as a pull request's head. */
function head(name: string, files: Record<string, string>): string {
  git('checkout', '--quiet', '-b', name, 'main');
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), text);
  }
  git('add', '-A');
  git('commit', '--quiet', '-m', name);
  git('checkout', '--quiet', 'main');
  return name;
}

const worktree = () => join(root, `wt${count++}`);

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'cells-batch-'));
  repo = join(root, 'repo');
  mkdirSync(repo);
  git('init', '--quiet', '-b', 'main');
  writeFileSync(join(repo, 'a.txt'), 'a\n');
  writeFileSync(join(repo, 'b.txt'), 'b\n');
  git('add', '-A');
  git('commit', '--quiet', '-m', 'base');
  head('one', { 'a.txt': 'a one\n' });
  head('two', { 'b.txt': 'b two\n' });
  head('clash', { 'a.txt': 'a clash\n' });
  head('three', { 'c.txt': 'c\n' });
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('a batch of pull requests on one verify (yggi/music-commons#68)', () => {
  it('merges each head in order into a worktree at the base, and names the tree', () => {
    const wt = worktree();
    const batch = prepare(
      repo,
      wt,
      [
        { pr: 1, ref: 'one' },
        { pr: 2, ref: 'two' },
      ],
      'main',
    );
    expect(batch.merged).toEqual([1, 2]);
    expect(batch.left).toEqual([]);
    expect(readFileSync(join(wt, 'a.txt'), 'utf8')).toBe('a one\n');
    expect(readFileSync(join(wt, 'b.txt'), 'utf8')).toBe('b two\n');
    expect(batch.tree).toMatch(/^[0-9a-f]{40}$/);
    // The checkout the batch was made from is left where it was.
    expect(git('rev-parse', '--abbrev-ref', 'HEAD')).toBe('main');
    expect(readFileSync(join(repo, 'a.txt'), 'utf8')).toBe('a\n');
  });

  it('leaves out a head that conflicts with those before it, and goes on with the rest', () => {
    const wt = worktree();
    const batch = prepare(
      repo,
      wt,
      [
        { pr: 1, ref: 'one' },
        { pr: 9, ref: 'clash' },
        { pr: 3, ref: 'three' },
      ],
      'main',
    );
    expect(batch.merged).toEqual([1, 3]);
    expect(batch.left).toEqual([{ pr: 9, files: ['a.txt'] }]);
    expect(readFileSync(join(wt, 'a.txt'), 'utf8')).toBe('a one\n');
    expect(readFileSync(join(wt, 'c.txt'), 'utf8')).toBe('c\n');
    const text = summary(batch, wt);
    expect(text).toContain('merged #1, #3');
    expect(text).toContain('left out #9, which conflicts in a.txt');
    expect(text).toContain(`npm run batch -- check ${batch.tree.slice(0, 12)}`);
  });

  it('finds the base at the batch’s tree once each is squashed in, and not when something else landed', () => {
    const batch = prepare(
      repo,
      worktree(),
      [
        { pr: 1, ref: 'one' },
        { pr: 2, ref: 'two' },
      ],
      'main',
    );
    expect(landed(repo, batch.tree, 'main')).toBe(false);
    // As GitHub's squash lands them: one commit each, in the order given.
    git('checkout', '--quiet', '-b', 'landing', 'main');
    for (const name of ['one', 'two']) {
      git('merge', '--quiet', '--squash', name);
      git('commit', '--quiet', '-m', name);
    }
    expect(landed(repo, batch.tree, 'landing')).toBe(true);
    // (by the short tree `prepare` prints, and by a commit that has it)
    expect(landed(repo, batch.tree.slice(0, 12), 'landing')).toBe(true);
    expect(landed(repo, 'landing', 'landing')).toBe(true);
    // Something else lands between: the tree verified is no longer the base's.
    git('merge', '--quiet', '--squash', 'three');
    git('commit', '--quiet', '-m', 'three');
    expect(landed(repo, batch.tree, 'landing')).toBe(false);
    git('checkout', '--quiet', 'main');
  });

  it('says there is nothing to verify where every head conflicts with the base', () => {
    const wt = worktree();
    git('checkout', '--quiet', '-b', 'moved', 'main');
    git('merge', '--quiet', '--squash', 'one');
    git('commit', '--quiet', '-m', 'one');
    git('checkout', '--quiet', 'main');
    const batch = prepare(repo, wt, [{ pr: 9, ref: 'clash' }], 'moved');
    expect(batch.merged).toEqual([]);
    const text = summary(batch, wt);
    expect(text).toContain('nothing to verify');
    expect(text).not.toContain('npm run batch -- check');
  });

  it(`refuses more than ${MOST} pull requests, and none`, () => {
    const many = Array.from({ length: MOST + 1 }, (_, i) => ({ pr: i + 1, ref: 'one' }));
    expect(() => prepare(repo, worktree(), many, 'main')).toThrow(`at most ${MOST}`);
    expect(() => prepare(repo, worktree(), [], 'main')).toThrow('no pull request');
  });
});
