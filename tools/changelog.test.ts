// tools/changelog.mjs, the entries not yet released in changes/: `check` shown firing on each bad entry and passing a
// good one, `gather` run in throwaway directories, and the repository's own changes/ checked.
// yggi/webmidi and yggi/cell-studio have the same test, lifted from here.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const tool = join(root, 'tools/changelog.mjs');
const POINTER = 'Entries not yet released are in [`changes/`](changes/), one file each; a release gathers them here (`npm run changelog -- gather`).';
const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A throwaway repository root holding `files` (path → text). */
function repository(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'changelog-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'changes'));
  for (const [path, text] of Object.entries(files)) writeFileSync(join(dir, path), text);
  return dir;
}
const run = (cwd: string, ...args: string[]) => spawnSync('node', [tool, ...args], { cwd, encoding: 'utf8' });

describe('changelog check', () => {
  it('passes a good entry, and changes/README.md, which is no entry', () => {
    const dir = repository({ 'changes/12.md': '### Added\n- **A thing** (#12): what it does.\n', 'changes/README.md': '# Changes\n\nNo heading of a section here.\n' });
    expect(run(dir, 'check')).toMatchObject({ status: 0, stderr: '' });
  });

  it.each([
    ['no heading', '- **A thing**: what it does.\n', 'its first line is no section heading'],
    ['an unknown heading', '### Improved\n- **A thing**: what it does.\n', '"### Improved" is no section the changelog has'],
    ['an unknown second heading', '### Added\n- **A thing**.\n### Improved\n- **Another**.\n', '"### Improved" is no section the changelog has'],
    ['a heading of another level', '## Added\n- **A thing**: what it does.\n', 'its first line is no section heading'],
    ['no bullet', '### Fixed\n\nA thing works.\n', 'no bullet'],
  ])('fails an entry with %s, and names it', (_, text, says) => {
    const result = run(repository({ 'changes/bad.md': text, 'changes/12.md': '### Added\n- Fine.\n' }), 'check');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`changes/bad.md: ${says}`);
    expect(result.stderr).not.toContain('changes/12.md');
  });

  it('fails a file that is not markdown', () => {
    expect(run(repository({ 'changes/12.txt': '### Added\n- Fine.\n' }), 'check')).toMatchObject({ status: 1, stderr: expect.stringContaining('changes/12.txt') });
  });

  it("passes the repository's own changes/", () => {
    expect(run(root, 'check')).toMatchObject({ status: 0, stderr: '' });
  });
});

const intro = '# Changelog\n\nWhat changed. Add a file to `changes/`.\n\n';
const released = '## v0.1.0 — 2026-10-01\n\n### Added\n\n- The first.\n';

describe('changelog gather', () => {
  it('puts what Unreleased held and every entry under the new heading, the sections in order, and leaves the pointer', () => {
    const dir = repository({
      'CHANGELOG.md': `${intro}## Unreleased\n\n${POINTER}\n\n### Fixed\n\n- **Held, fixed**: kept as it is.\n\n- **Held, second**.\n\n${released}`,
      'changes/12.md': '### Fixed\n- **Twelve, fixed**.\n',
      'changes/9.md': '### Added\n\n- **Nine, added**,\n  over two lines.\n\n- **Nine, again**.\n',
      'changes/fix-x.md': '### Fixed\n- **A slug, fixed**.\n',
      'changes/README.md': '# Changes\n',
    });
    const result = run(dir, 'gather', 'v0.2.0', '2026-11-05');
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(dir, 'CHANGELOG.md'), 'utf8')).toBe(
      `${intro}## Unreleased\n\n${POINTER}\n\n## v0.2.0 — 2026-11-05\n\n` +
        '### Added\n\n- **Nine, added**,\n  over two lines.\n\n- **Nine, again**.\n\n' +
        '### Fixed\n\n- **Held, fixed**: kept as it is.\n\n- **Held, second**.\n\n- **Twelve, fixed**.\n\n- **A slug, fixed**.\n\n' +
        released,
    );
    expect(readdirSync(join(dir, 'changes'))).toEqual(['README.md']);
  });

  it('files an entry of two sections each part under its own heading (#568)', () => {
    const dir = repository({
      'CHANGELOG.md': `${intro}## Unreleased\n\n${POINTER}\n\n${released}`,
      'changes/5.md': '### Added\n\n- **Five, added**.\n\n### Changed\n\n- **Five, changed**.\n',
      'changes/6.md': '### Changed\n\n- **Six, changed**.\n',
    });
    const result = run(dir, 'gather', 'v0.2.0', '2026-11-05');
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(dir, 'CHANGELOG.md'), 'utf8')).toBe(
      `${intro}## Unreleased\n\n${POINTER}\n\n## v0.2.0 — 2026-11-05\n\n` +
        '### Added\n\n- **Five, added**.\n\n### Changed\n\n- **Five, changed**.\n\n- **Six, changed**.\n\n' +
        released,
    );
  });

  it("keeps a changelog's tight spacing, a preamble Unreleased held, a heading of its own, and drops a line saying nothing changed", () => {
    const tight = '## 0.9.0 — 2026-10-06\n\n### Added\n- The first.\n';
    const dir = repository({
      'CHANGELOG.md': `${intro}## Unreleased\n\nNothing has changed since \`0.9.0\`.\n\nWhat this release is about.\n\n### Corrected: notes\n- **Held**.\n### Changed\n- **Held, changed**.\n\n${tight}`,
      'changes/3.md': '### Changed\n- **Three**.\n',
      'changes/4.md': '### Added\n- **Four**.\n',
    });
    expect(run(dir, 'gather', '0.10.0', '2026-11-05').status).toBe(0);
    expect(readFileSync(join(dir, 'CHANGELOG.md'), 'utf8')).toBe(
      `${intro}## Unreleased\n\n${POINTER}\n\n## 0.10.0 — 2026-11-05\n\nWhat this release is about.\n\n` +
        '### Added\n- **Four**.\n\n### Changed\n- **Held, changed**.\n- **Three**.\n\n### Corrected: notes\n- **Held**.\n\n' +
        tight,
    );
    expect(existsSync(join(dir, 'changes/3.md'))).toBe(false);
  });

  it('gathers nothing, and deletes nothing, when an entry is malformed, when there is nothing, or when the version is spelled unlike the headings', () => {
    const changelog = `${intro}## Unreleased\n\n${POINTER}\n\n${released}`;
    const bad = repository({ 'CHANGELOG.md': changelog, 'changes/1.md': '### Added\n- One.\n', 'changes/2.md': 'Two.\n' });
    expect(run(bad, 'gather', 'v0.2.0', '2026-11-05').status).toBe(1);
    expect(readdirSync(join(bad, 'changes')).sort()).toEqual(['1.md', '2.md']);
    expect(readFileSync(join(bad, 'CHANGELOG.md'), 'utf8')).toBe(changelog);

    expect(run(repository({ 'CHANGELOG.md': changelog }), 'gather', 'v0.2.0', '2026-11-05')).toMatchObject({ status: 1, stderr: expect.stringContaining('nothing to gather') });

    const unprefixed = repository({ 'CHANGELOG.md': changelog, 'changes/1.md': '### Added\n- One.\n' });
    expect(run(unprefixed, 'gather', '0.2.0', '2026-11-05')).toMatchObject({ status: 1, stderr: expect.stringContaining('"## v0.1.0 — 2026-10-01"') });
    expect(run(unprefixed, 'gather', 'v0.1.0', '2026-11-05')).toMatchObject({ status: 1, stderr: expect.stringContaining('already') });
    expect(readFileSync(join(unprefixed, 'CHANGELOG.md'), 'utf8')).toBe(changelog);
  });
});
