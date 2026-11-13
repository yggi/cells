// The lock for the heavy runs (tools/heavy.ts). Lifted from yggi/jambot tooling/heavy.test.ts @ cbdb663.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { type Holder, holder, holding, release, runHeavy, take } from './heavy.ts';

const dirs: string[] = [];
const lock = () => {
  const dir = mkdtempSync(join(tmpdir(), 'cells-heavy-test-'));
  dirs.push(dir);
  return join(dir, 'lock');
};
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const me = (pid = process.pid): Holder => ({
  pid,
  command: 'npm run test:all',
  cwd: '/here',
  since: '2026-10-22T00:00:00.000Z',
});

/** A process id that is surely not running: a child's, once it has exited. */
const gone = () =>
  new Promise<number>((done) => {
    const child = spawn('true');
    child.on('close', () => done(child.pid!));
  });

describe('the heavy runs’ lock', () => {
  it('is taken by one holder at a time, and free once given back', () => {
    const path = lock();
    expect(take(path, me())).toEqual({ taken: true });
    expect(holder(path)).toEqual(me());
    expect(take(path, me())).toEqual({ taken: false, by: me() });
    release(path, process.pid);
    expect(existsSync(path)).toBe(false);
    expect(take(path, me())).toEqual({ taken: true });
  });

  it('is given back only by its holder', () => {
    const path = lock();
    take(path, me());
    release(path, process.pid + 1);
    expect(holder(path)).toEqual(me());
  });

  it('is taken over from a holder that is gone', async () => {
    const path = lock();
    const dead = await gone();
    take(path, me(dead));
    expect(holder(path)).toBeNull();
    expect(take(path, me())).toEqual({ taken: true });
    expect(holder(path)).toEqual(me());
  });

  it('holds a lock made and not yet named, until its maker has had time to name itself', () => {
    const path = lock();
    mkdirSync(path);
    expect(take(path, me())).toMatchObject({ taken: false, by: { pid: 0 } });
    const old = (Date.now() - 20_000) / 1000;
    utimesSync(path, old, old);
    expect(take(path, me())).toEqual({ taken: true });
  });

  it('clears a lock whose name cannot be read', () => {
    const path = lock();
    mkdirSync(path);
    writeFileSync(join(path, 'holder.json'), '{');
    expect(take(path, me())).toEqual({ taken: true });
  });

  it('runs a command once the lock is free, gives it back after, and passes on its exit code', async () => {
    const path = lock();
    const other = me(process.ppid);
    take(path, other);
    const said: string[] = [];
    const ran = runHeavy(['sh', '-c', 'exit 3'], { path, pollMs: 20, say: (l) => said.push(l) });
    await new Promise((done) => setTimeout(done, 100));
    // Still waiting: the lock is another's, and it says whose.
    expect(holder(path)).toEqual(other);
    expect(said).toEqual([expect.stringContaining(`npm run test:all (pid ${process.ppid}`)]);
    release(path, process.ppid);
    expect(await ran).toBe(3);
    expect(existsSync(path)).toBe(false);
  });

  it('starts at once what the holder of the lock runs: a command under the lock is told so, and does not wait for it', async () => {
    const path = lock();
    const said: string[] = [];
    // The command asks for the lock its parent holds: without the word passed down it would wait for ever.
    const inner = `node --experimental-strip-types --no-warnings ${fileURLToPath(new URL('./heavy.ts', import.meta.url))} sh -c 'exit 4'`;
    const before = process.env.MUSIC_HEAVY_LOCK;
    process.env.MUSIC_HEAVY_LOCK = path;
    try {
      expect(await runHeavy(['sh', '-c', inner], { path, say: (l) => said.push(l) })).toBe(4);
    } finally {
      if (before === undefined) delete process.env.MUSIC_HEAVY_LOCK;
      else process.env.MUSIC_HEAVY_LOCK = before;
    }
    expect(said).toEqual([]);
    // Another's lock is still waited for, whatever lock an ancestor holds.
    take(path, me(process.ppid));
    const ran = holding('inner', () => Promise.resolve(5), {
      path,
      pollMs: 20,
      say: (l) => said.push(l),
      env: { MUSIC_HEAVY_HELD: `${path}-another` },
    });
    await new Promise((done) => setTimeout(done, 100));
    expect(said).toHaveLength(1);
    release(path, process.ppid);
    expect(await ran).toBe(5);
    expect(await holding('inner', () => Promise.resolve(6), { path, env: { MUSIC_HEAVY_HELD: path } })).toBe(6);
  });

  it('gives the lock back when the command cannot start', async () => {
    const path = lock();
    const said: string[] = [];
    expect(await runHeavy(['cells-no-such-command'], { path, say: (l) => said.push(l) })).toBe(127);
    expect(said).toEqual([expect.stringContaining('ENOENT')]);
    expect(existsSync(path)).toBe(false);
  });
});
