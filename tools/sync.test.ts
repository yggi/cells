// main merged into a branch with the generated files written again (tools/sync.ts): a conflict in them alone is the generators', one in a written file a person's.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { GENERATED, REGENERATE, isGenerated, sorted, sync } from './sync.ts';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A repository whose `dist/a.js` is `src/a.ts` in capitals on one line, with `main` and `branch` each changing a line of the source. */
function repository(mainLine: string, branchLine: string) {
  const dir = mkdtempSync(join(tmpdir(), 'cells-sync-'));
  dirs.push(dir);
  const git = (...args: string[]) => {
    const run = spawnSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@localhost', ...args], {
      cwd: dir,
      encoding: 'utf8',
    });
    if (run.status !== 0) throw new Error(`git ${args.join(' ')}: ${run.stderr}`);
    return run.stdout.trim();
  };
  const read = (path: string) => readFileSync(join(dir, path), 'utf8');
  // (one line, so a change anywhere in the source is a change to the same generated line)
  const generate = () => writeFileSync(join(dir, 'dist/a.js'), read('src/a.ts').toUpperCase().trim().split('\n').join(' ') + '\n');
  const write = (lines: string[]) => {
    writeFileSync(join(dir, 'src/a.ts'), lines.join('\n') + '\n');
    generate();
    git('add', '-A');
    git('commit', '--quiet', '-m', lines.join(' '));
  };
  git('init', '--quiet', '-b', 'main');
  git('config', 'user.name', 'test');
  git('config', 'user.email', 'test@localhost');
  mkdirSync(join(dir, 'src'));
  mkdirSync(join(dir, 'dist'));
  write(['one', 'two', 'three', 'four', 'five']);
  git('checkout', '--quiet', '-b', 'branch');
  write(branchLine === 'first' ? ['ours', 'two', 'three', 'four', 'five'] : ['one', 'two', 'three', 'four', 'ours']);
  git('checkout', '--quiet', 'main');
  write(mainLine === 'first' ? ['theirs', 'two', 'three', 'four', 'five'] : ['one', 'two', 'three', 'four', 'theirs']);
  git('checkout', '--quiet', 'branch');
  return { dir, git, read, generate };
}

describe('npm run sync: main merged in, the generated files written again (yggi/music-commons#68)', () => {
  it('knows what a generator writes', () => {
    expect(GENERATED.map(isGenerated)).toEqual(GENERATED.map(() => true));
    expect(sorted(['dist/engine/compile.js', 'types/index.d.ts', 'src/engine/compile.ts', 'README.md', 'distant.ts'])).toEqual({
      generated: ['dist/engine/compile.js', 'types/index.d.ts'],
      written: ['src/engine/compile.ts', 'README.md', 'distant.ts'],
    });
    // (the generated modules before what compiles them)
    expect(REGENERATE.indexOf('examples')).toBeLessThan(REGENERATE.indexOf('dist'));
    // (the API's ledger, which a main with new exports changes: #854)
    expect(isGenerated('docs/api.md')).toBe(true);
    expect(REGENERATE).toContain('api');
  });

  it('settles a conflict in generated files alone by writing them again, and commits the merge', () => {
    // The sources merge cleanly (a line each, apart); the one-line file generated from them conflicts.
    const { dir, git, read, generate } = repository('first', 'last');
    expect(sync(dir, { base: 'main', regenerate: generate })).toEqual([]);
    expect(read('src/a.ts')).toBe('theirs\ntwo\nthree\nfour\nours\n');
    expect(read('dist/a.js')).toBe('THEIRS TWO THREE FOUR OURS\n');
    expect(git('status', '--porcelain')).toBe('');
    expect(git('rev-list', '--count', '--merges', 'HEAD')).toBe('1');
    // Without the generators the conflict stands: git alone could not have merged it.
    const again = repository('first', 'last');
    expect(spawnSync('git', ['merge', 'main'], { cwd: again.dir }).status).not.toBe(0);
  });

  it('stops on a file a person wrote, names it, and goes on once it is settled', () => {
    const { dir, git, read, generate } = repository('first', 'first');
    expect(sync(dir, { base: 'main', regenerate: generate })).toEqual(['src/a.ts']);
    writeFileSync(join(dir, 'src/a.ts'), 'both\ntwo\nthree\nfour\nfive\n');
    git('add', 'src/a.ts');
    expect(sync(dir, { base: 'main', resume: true, regenerate: generate })).toEqual([]);
    expect(read('dist/a.js')).toBe('BOTH TWO THREE FOUR FIVE\n');
    expect(git('status', '--porcelain')).toBe('');
  });

  it('does nothing where main is merged in already', () => {
    const { dir, git, generate } = repository('first', 'last');
    sync(dir, { base: 'main', regenerate: generate });
    const head = git('rev-parse', 'HEAD');
    expect(
      sync(dir, {
        base: 'main',
        regenerate: () => {
          throw new Error('not run');
        },
      }),
    ).toEqual([]);
    expect(git('rev-parse', 'HEAD')).toBe(head);
  });
});
