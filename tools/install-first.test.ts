// Lifted from yggi/webmidi tools/install-first.test.ts @ 985993c (cells-named).
// tools/install-first.mjs, the first step of `npm run verify`: run in a throwaway directory with the install replaced.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Runs the step in a fresh directory, with or without `node_modules`, the install replaced by `install`. */
function run(installed: boolean, install = 'mkdir node_modules') {
  const dir = mkdtempSync(join(tmpdir(), 'cells-install-'));
  dirs.push(dir);
  if (installed) mkdirSync(join(dir, 'node_modules'));
  const result = spawnSync('node', [`${root}/tools/install-first.mjs`], {
    cwd: dir,
    env: { ...process.env, CELLS_INSTALL: install },
    encoding: 'utf8',
  });
  return { dir, status: result.status, stdout: result.stdout };
}

describe('install-first', () => {
  it('installs a checkout without node_modules before verify checks anything, and says so', () => {
    const { dir, status, stdout } = run(false);
    expect(status).toBe(0);
    expect(stdout).toContain('no node_modules in this checkout');
    expect(stdout).toContain('mkdir node_modules runs first');
    expect(existsSync(join(dir, 'node_modules'))).toBe(true);
  });

  it('leaves a checkout that has node_modules alone, and says nothing', () => {
    expect(run(true, 'echo installed again; exit 1')).toMatchObject({ status: 0, stdout: '' });
  });

  it('fails verify when the install fails', () => {
    expect(run(false, 'exit 3').status).toBe(3);
  });

  it('is the first step of npm run verify, with npm ci by default', () => {
    const scripts = JSON.parse(readFileSync(`${root}/package.json`, 'utf8')).scripts;
    expect(scripts.preverify).toMatch(/^node tools\/install-first\.mjs && /);
    expect(readFileSync(`${root}/tools/install-first.mjs`, 'utf8')).toContain("'npm ci --no-audit --no-fund'");
  });

  it('installs again a node_modules stale against the lockfile, and says what is stale', () => {
    const dir = locked('2.0.0');
    const { status, stdout } = spawned(dir, 'echo installed again');
    expect(status).toBe(0);
    expect(stdout).toContain('node_modules is stale against the lockfile (a)');
    expect(stdout).toContain('installed again');
  });

  it('leaves a node_modules alone that holds what the lockfile names', () => {
    expect(spawned(locked('1.0.0'), 'echo installed again; exit 1')).toMatchObject({ status: 0, stdout: '' });
  });

  it('fails verify on a stale node_modules that is a link, and installs nothing into what it points to', () => {
    const other = locked('2.0.0');
    const dir = mkdtempSync(join(tmpdir(), 'cells-install-'));
    dirs.push(dir);
    writeFileSync(join(dir, 'package-lock.json'), lockfile('1.0.0'));
    symlinkSync(join(other, 'node_modules'), join(dir, 'node_modules'));
    const { status, stderr } = spawned(dir, 'touch node_modules/installed');
    expect(status).toBe(1);
    expect(stderr).toContain('node_modules is a link, and stale');
    expect(existsSync(join(other, 'node_modules/installed'))).toBe(false);
  });
});

/** A lockfile naming one package, `a`, at `version`. */
const lockfile = (version: string) => JSON.stringify({ packages: { '': {}, 'node_modules/a': { version } } });
/** The same, with an optional package for another platform, which npm doesn't install. */
const withOptional = JSON.stringify({ packages: { '': {}, 'node_modules/a': { version: '1.0.0' }, 'node_modules/b': { version: '1.0.0', optional: true } } });

/** A checkout whose lockfile names `a` at 1.0.0 (and an optional `b`) and whose node_modules holds `a` at `installed`. */
function locked(installed: string) {
  const dir = mkdtempSync(join(tmpdir(), 'cells-install-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'package-lock.json'), withOptional);
  mkdirSync(join(dir, 'node_modules'));
  writeFileSync(join(dir, 'node_modules/.package-lock.json'), lockfile(installed));
  return dir;
}

/** Runs the step in `dir`, the install replaced by `install`. */
function spawned(dir: string, install: string) {
  const result = spawnSync('node', [`${root}/tools/install-first.mjs`], { cwd: dir, env: { ...process.env, CELLS_INSTALL: install }, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}
