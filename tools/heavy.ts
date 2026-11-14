/**
 * The lock for the heavy runs: the tests take every core, so two runs at once
 * on one machine, from two worktrees, time each other out (yggi/jambot#666).
 * `npm run verify` takes the lock for its tests alone, and `npm run test:all`
 * and `npm run test:slow` for all they do. Each takes it before it starts and
 * gives it back when it ends, however it ends; a second waits, saying every
 * minute who holds it.
 *
 *   node tools/heavy.ts <command> [args...]   run the command under the lock, with its exit code
 *   node tools/heavy.ts --status              say who holds the lock, if anyone
 *
 * The lock is a directory in the machine's temporary directory, so every
 * checkout and worktree on the machine shares it (`MUSIC_HEAVY_LOCK` moves
 * it). `mkdir` takes it or fails at once, and the holder's process id, command,
 * directory and start go in `holder.json` beside it. A lock whose holder is
 * gone, killed before it could give the lock back, is taken over. A command
 * run under the lock is told so (`MUSIC_HEAVY_HELD`, the lock's path), and
 * what it starts doesn't wait for the lock its parent holds.
 *
 * Lifted from yggi/jambot tooling/heavy.ts @ cbdb663, with the lock's name the
 * family's rather than Jambot's.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Who holds the lock. */
export interface Holder {
  pid: number;
  command: string;
  cwd: string;
  /** When it took the lock, as an ISO date. */
  since: string;
}

/** Where the lock lives: `MUSIC_HEAVY_LOCK`, or `music-heavy.lock` in the temporary directory. */
export function lockPath(env: NodeJS.ProcessEnv = process.env): string {
  return env.MUSIC_HEAVY_LOCK ?? join(tmpdir(), 'music-heavy.lock');
}

/** Whether a process with this id is running. */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: it runs, as another user's.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** Who holds the lock at `path`, or null where none does or its holder is gone. */
export function holder(path: string): Holder | null {
  let held: Holder;
  try {
    held = JSON.parse(readFileSync(join(path, 'holder.json'), 'utf8')) as Holder;
  } catch {
    return null;
  }
  return alive(held.pid) ? held : null;
}

/** A holder not yet known: one that has made the lock and not yet named itself. */
const STARTING: Holder = { pid: 0, command: '?', cwd: '?', since: '?' };

/**
 * Takes the lock for `who`, or says who holds it. A lock whose holder is gone
 * is cleared and taken. One made and not yet named is held (`STARTING`) for
 * `namingMs`, then cleared too: its maker died between the two steps.
 */
export function take(path: string, who: Holder, namingMs = 10_000): { taken: true } | { taken: false; by: Holder } {
  for (let tries = 0; tries < 2; tries++) {
    try {
      mkdirSync(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const by = holder(path);
      if (by) return { taken: false, by };
      if (!existsSync(join(path, 'holder.json')) && Date.now() - mtime(path) < namingMs) return { taken: false, by: STARTING };
      rmSync(path, { recursive: true, force: true });
      continue;
    }
    // Named whole or not at all: a reader never finds half a name.
    writeFileSync(join(path, 'holder.tmp'), JSON.stringify(who));
    renameSync(join(path, 'holder.tmp'), join(path, 'holder.json'));
    return { taken: true };
  }
  return { taken: false, by: holder(path) ?? STARTING };
}

/** When the lock was made, in milliseconds, or 0 where it is gone. */
function mtime(path: string): number {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

/** Gives the lock back, if `pid` holds it. */
export function release(path: string, pid: number): void {
  try {
    const held = JSON.parse(readFileSync(join(path, 'holder.json'), 'utf8')) as Holder;
    if (held.pid !== pid) return;
  } catch {
    return;
  }
  rmSync(path, { recursive: true, force: true });
}

const describe = (h: Holder) => (h.pid === 0 ? 'a run just starting' : `${h.command} (pid ${h.pid}, in ${h.cwd}, since ${h.since})`);

/** How a run waits for the lock: where it is, how often it looks, and where it says who holds it. */
export interface Waiting {
  path?: string;
  pollMs?: number;
  say?: (line: string) => void;
  env?: NodeJS.ProcessEnv;
}

/**
 * Runs `run` once the lock is taken for `command`, polling every `pollMs`, and
 * gives the lock back when it ends. Where an ancestor holds the lock already
 * (`MUSIC_HEAVY_HELD` names its path), `run` starts at once.
 */
export async function holding<T>(
  command: string,
  run: () => Promise<T>,
  { path = lockPath(), pollMs = 2000, say = (line: string) => console.error(line), env = process.env }: Waiting = {},
): Promise<T> {
  if (env.MUSIC_HEAVY_HELD === path) return run();
  const who: Holder = {
    pid: process.pid,
    command,
    cwd: process.cwd(),
    since: new Date().toISOString(),
  };
  let saidAt = -Infinity;
  for (;;) {
    const got = take(path, who);
    if (got.taken) break;
    if (Date.now() - saidAt >= 60_000) {
      say(`heavy: waiting for the lock at ${path}, held by ${describe(got.by)}`);
      saidAt = Date.now();
    }
    await new Promise((done) => setTimeout(done, pollMs));
  }
  const give = () => release(path, process.pid);
  process.on('exit', give);
  try {
    return await run();
  } finally {
    give();
    process.off('exit', give);
  }
}

/** Runs `command` under the lock (`holding`), and resolves with its exit code. */
export async function runHeavy(command: readonly string[], waiting: Waiting = {}): Promise<number> {
  const path = waiting.path ?? lockPath();
  const say = waiting.say ?? ((line: string) => console.error(line));
  return holding(
    command.join(' '),
    () =>
      new Promise<number>((done) => {
        const child = spawn(command[0]!, command.slice(1), {
          stdio: 'inherit',
          env: { ...process.env, MUSIC_HEAVY_HELD: path },
        });
        const pass = (signal: NodeJS.Signals) => child.kill(signal);
        process.on('SIGINT', pass);
        process.on('SIGTERM', pass);
        child.on('error', (error) => {
          say(`heavy: ${String(error)}`);
          done(127);
        });
        child.on('close', (code, signal) => {
          process.off('SIGINT', pass);
          process.off('SIGTERM', pass);
          done(code ?? (signal ? 128 : 1));
        });
      }),
    { ...waiting, path, say },
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === '--status') {
    const by = holder(lockPath());
    console.log(by ? `held by ${describe(by)}` : 'free');
  } else if (args.length === 0) {
    console.error('usage: node tools/heavy.ts <command> [args...] | --status');
    process.exitCode = 2;
  } else {
    process.exitCode = await runHeavy(args);
  }
}
