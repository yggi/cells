/**
 * `npm run sync`: `origin/main` merged into the branch checked out, with the
 * generated files written again rather than merged by hand
 * (yggi/music-commons#68). `dist/` and `types/` mirror `src/` file by file,
 * and the generated modules and the reference follow the examples, the
 * fragments and the parser's tables, so a conflict in one of them says
 * nothing a person can settle: the tool that wrote it writes it again from
 * the merged sources.
 *
 * Where the merge stops on generated files alone (`GENERATED`), it takes the
 * branch's side of each, runs the generators (`REGENERATE`) and commits the
 * merge. Where a file a person wrote conflicts too, it stops and names those:
 * settle them, then run it again with `--continue`, which regenerates and
 * commits. It never pushes; the pre-push hook verifies the result as any
 * other tree.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** What a generator writes: these paths and what lies under those that end in a slash. */
export const GENERATED = ['dist/', 'types/', 'src/engine/examples.generated.ts', 'src/repository/seed.generated.ts', 'docs/language/reference.md'] as const;

/** The generators, in the order one feeds the next: the generated modules before what compiles them. */
export const REGENERATE = ['examples', 'fragments', 'reference', 'types', 'dist'] as const;

/** Whether a generator writes `path`. */
export const isGenerated = (path: string): boolean => GENERATED.some((g) => (g.endsWith('/') ? path.startsWith(g) : path === g));

/** The conflicting `paths` by who settles them: the generators, or a person. */
export function sorted(paths: readonly string[]): { generated: string[]; written: string[] } {
  return {
    generated: paths.filter(isGenerated),
    written: paths.filter((p) => !isGenerated(p)),
  };
}

function run(dir: string, command: string, args: readonly string[]): { ok: boolean; out: string } {
  const done = spawnSync(command, args, { cwd: dir, encoding: 'utf8' });
  return { ok: done.status === 0, out: `${done.stdout}${done.stderr}`.trim() };
}

function must(dir: string, command: string, args: readonly string[]): string {
  const done = run(dir, command, args);
  if (!done.ok) throw new Error(`${command} ${args.join(' ')}: ${done.out}`);
  return done.out;
}

const conflicts = (dir: string): string[] => must(dir, 'git', ['diff', '--name-only', '--diff-filter=U']).split('\n').filter(Boolean);

/**
 * Merges `base` into the branch checked out in `dir`, or with `resume` goes on from a merge a person settled.
 * Generated files in conflict take the branch's side and `regenerate` writes them all again; the merge is then
 * committed. Returns the files a person has to settle first, empty when the merge is committed or nothing was to merge.
 */
export function sync(dir: string, { base = 'origin/main', resume = false, regenerate = () => npmRuns(dir) } = {}): string[] {
  if (!resume) {
    const merge = run(dir, 'git', ['merge', '--no-commit', '--no-ff', base]);
    if (merge.ok && !run(dir, 'git', ['rev-parse', '--verify', '--quiet', 'MERGE_HEAD']).ok) return [];
  }
  const { generated, written } = sorted(conflicts(dir));
  if (written.length > 0) return written;
  // The branch's side stands in until the generators have run: any side would do, since each file is written again.
  for (const path of generated) {
    const ours = run(dir, 'git', ['checkout', '--ours', '--', path]);
    if (ours.ok) must(dir, 'git', ['add', '--', path]);
    else must(dir, 'git', ['rm', '--quiet', '--force', '--', path]);
  }
  regenerate();
  // What the generators changed, and what they wrote new or removed under the paths that are here.
  must(dir, 'git', ['add', '-u']);
  for (const path of GENERATED) if (existsSync(join(dir, path))) must(dir, 'git', ['add', '-A', '--', path]);
  must(dir, 'git', ['commit', '--quiet', '--no-edit']);
  return [];
}

function npmRuns(dir: string): void {
  for (const script of REGENERATE) must(dir, 'npm', ['run', '--silent', script]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const resume = process.argv.includes('--continue');
  if (!resume) must(root, 'git', ['fetch', '--quiet', 'origin', 'main']);
  const written = sync(root, { resume });
  if (written.length > 0) {
    console.log(`sync: settle ${written.join(', ')} (git add each), then npm run sync -- --continue`);
    process.exitCode = 1;
  } else {
    console.log('sync: origin/main is merged in, the generated files written again; the push verifies it');
  }
}
