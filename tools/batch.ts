/**
 * `npm run batch`: several approved pull requests landed on one verify
 * (yggi/music-commons#68). Landing one at a time, every merge moves `main`
 * and each pull request still open is verified again; a batch is verified
 * once, as the tree `main` will have when all of it has landed.
 *
 *   npm run batch -- prepare <pr>...   a worktree at origin/main with each head merged in, in the order given
 *   npm run batch -- check <tree>      whether origin/main has that tree, once the batch is squashed in
 *
 * `prepare` merges each head as GitHub's squash will, one after another. A
 * head that conflicts with `main` and the heads before it is left out and
 * named: it takes `main` once the batch has landed, the usual way. It prints
 * the worktree and its tree; `npm run verify` there (`npm run test:all`
 * where a pull request reaches the slow tests) stands for every pull request
 * merged in. `check` exits 0 when `origin/main` has that tree, and 1 when it
 * differs, which says something else landed between: verify `main` then.
 * A batch is at most `MOST` pull requests.
 *
 * Lifted from yggi/jambot tooling/batch.ts @ 885b738 (yggi/jambot#684).
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The most pull requests a batch holds: past it a failure is hard to place, and a conflict within it more likely. */
export const MOST = 8;

/** A pull request's head, as a ref git can merge. */
export interface Head {
  pr: number;
  ref: string;
}

/** What `prepare` made: the heads merged in, in order, those left out with the files they conflict in, and the tree. */
export interface Batch {
  merged: number[];
  left: { pr: number; files: string[] }[];
  tree: string;
}

function git(dir: string, args: readonly string[]): { ok: boolean; out: string } {
  const run = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  return { ok: run.status === 0, out: `${run.stdout}${run.stderr}`.trim() };
}

function must(dir: string, args: readonly string[]): string {
  const run = git(dir, args);
  if (!run.ok) throw new Error(`git ${args.join(' ')}: ${run.out}`);
  return run.out;
}

/**
 * A worktree of `repo` at `base`, detached, with each of `heads` merged in, in order. A head that conflicts is left
 * out, its merge undone, and the next is tried on what stands. Throws on more than `MOST` heads or none.
 */
export function prepare(repo: string, worktree: string, heads: readonly Head[], base = 'origin/main'): Batch {
  if (heads.length === 0) throw new Error('batch: no pull request given');
  if (heads.length > MOST) throw new Error(`batch: ${heads.length} pull requests, and a batch is at most ${MOST}`);
  must(repo, ['worktree', 'add', '--detach', worktree, base]);
  const merged: number[] = [];
  const left: Batch['left'] = [];
  for (const { pr, ref } of heads) {
    const merge = git(worktree, ['-c', 'user.name=batch', '-c', 'user.email=batch@localhost', 'merge', '--no-ff', '--no-edit', '-m', `batch: #${pr}`, ref]);
    if (merge.ok) {
      merged.push(pr);
      continue;
    }
    const files = must(worktree, ['diff', '--name-only', '--diff-filter=U']).split('\n');
    must(worktree, ['merge', '--abort']);
    left.push({ pr, files: files.filter(Boolean) });
  }
  return { merged, left, tree: must(worktree, ['rev-parse', 'HEAD^{tree}']) };
}

/** Whether `base` in `repo` has the tree a batch was verified as: `tree` whole or short, or a commit that has it. */
export function landed(repo: string, tree: string, base = 'origin/main'): boolean {
  return must(repo, ['rev-parse', `${base}^{tree}`]) === must(repo, ['rev-parse', `${tree}^{tree}`]);
}

/** What `prepare` says: what was merged, what was left out and why, and what to run next. */
export function summary(batch: Batch, worktree: string): string {
  const lines = [`batch: merged ${batch.merged.map((pr) => `#${pr}`).join(', ') || 'nothing'} into ${worktree}`];
  for (const { pr, files } of batch.left) lines.push(`batch: left out #${pr}, which conflicts in ${files.join(', ')}: it takes main once the batch has landed`);
  lines.push(
    ...(batch.merged.length === 0
      ? ['batch: nothing to verify: every pull request given conflicts with main, and takes main first']
      : [
          `batch: tree ${batch.tree}`,
          `batch: run npm run verify in ${worktree}, squash the merged pull requests in that order, then npm run batch -- check ${batch.tree.slice(0, 12)}`,
        ]),
  );
  return lines.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const [command, ...args] = process.argv.slice(2);
  if (command === 'prepare' && args.length > 0 && args.every((a) => /^\d+$/.test(a))) {
    must(root, ['fetch', '--quiet', 'origin', 'main']);
    const heads = args.map((a) => {
      const ref = `refs/batch/${a}`;
      must(root, ['fetch', '--quiet', 'origin', `+pull/${a}/head:${ref}`]);
      return { pr: Number(a), ref };
    });
    const worktree = resolve(root, '..', `cells-batch-${args.join('-')}`);
    console.log(summary(prepare(root, worktree, heads), worktree));
  } else if (command === 'check' && args.length === 1) {
    must(root, ['fetch', '--quiet', 'origin', 'main']);
    const same = landed(root, args[0]!);
    console.log(
      same
        ? 'batch: origin/main has the tree the batch was verified as'
        : 'batch: origin/main differs from the tree the batch was verified as: something else landed, so verify main',
    );
    process.exitCode = same ? 0 : 1;
  } else {
    console.error('usage: npm run batch -- prepare <pr>... | npm run batch -- check <tree>');
    process.exitCode = 2;
  }
}
