// tools/pianoroll.ts: the notes a text plays, the notes two texts don't share, the picture, and the command line.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { chromeShell, lacking, main, notesOf, pianoRoll, readInput, VOICE_COLOURS, type Note } from './pianoroll';

const root = fileURLToPath(new URL('..', import.meta.url));
const nodeTs = fileURLToPath(new URL('./node-ts.mjs', import.meta.url));
const tool = fileURLToPath(new URL('./pianoroll.ts', import.meta.url));
const dirs: string[] = [];
const scratch = () => {
  const dir = mkdtempSync(join(tmpdir(), 'cells-pianoroll-'));
  dirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const note = (voice: string, at: number, pitch: number, dur = 0.5): Note => ({ voice, at, dur, pitch });
const notes = (svg: string) => svg.match(/<rect class="note"/g)?.length ?? 0;
const outlined = (svg: string) => svg.match(/class="note"[^>]*stroke="#0b0b0b"/g)?.length ?? 0;

describe('notesOf', () => {
  it('is what a piece plays: the smallest piece holds A4 on its voice', () => {
    expect(notesOf('&a loop=A4')).toEqual([{ voice: 'a', at: 0, dur: 600, pitch: 69 }]);
  });

  it('says why when the text does not compile', () => {
    expect(() => notesOf('&a loop=&nowhere')).toThrow(/doesn't compile/);
  });
});

describe('lacking', () => {
  it('is shown firing: a note moved a semitone is lacking from the other, both ways', () => {
    expect(lacking([note('a', 0, 60)], [note('a', 0, 61)])).toEqual([true]);
    expect(lacking([note('a', 0, 60)], [note('b', 0, 60)])).toEqual([true]);
  });

  it('counts as a multiset: a note doubled is lacking once from a text that plays it once', () => {
    expect(lacking([note('a', 0, 60), note('a', 0, 60)], [note('a', 0, 60)])).toEqual([false, true]);
    expect(lacking([note('a', 0, 60)], [note('a', 0, 60)])).toEqual([false]);
  });
});

describe('pianoRoll', () => {
  const before = { label: 'before', notes: [note('lead', 0, 60), note('lead', 1, 64), note('bass', 0, 48, 2)] };
  const after = { label: 'after', notes: [note('lead', 0, 60), note('lead', 1, 65), note('bass', 0, 48, 2)] };

  it('draws every note, and outlines in two panels the notes the other lacks', () => {
    const { svg } = pianoRoll([before, after]);
    expect(notes(svg)).toBe(6);
    expect(outlined(svg)).toBe(2);
    expect(svg).toContain('before: 3 notes, 1 not in the other');
    expect(svg).toContain('outlined: not in the other panel');
  });

  it('is shown firing: two panels of the same notes outline none, and one panel has no outlines to explain', () => {
    expect(outlined(pianoRoll([before, before]).svg)).toBe(0);
    const one = pianoRoll([before]).svg;
    expect(outlined(one)).toBe(0);
    expect(one).not.toContain('outlined');
  });

  it("keeps a voice's colour across the panels, whatever order it plays in", () => {
    const { svg } = pianoRoll([before, { label: 'bass first', notes: [note('bass', 0, 48), note('lead', 1, 60)] }]);
    const bass = [...svg.matchAll(/class="note"[^>]*fill="(#\w+)"[^>]*><title>bass/g)].map((m) => m[1]);
    expect(new Set(bass)).toEqual(new Set([VOICE_COLOURS[1]]));
  });

  it('folds a voice past the eighth into grey, never a ninth hue', () => {
    const many = { label: 'nine', notes: Array.from({ length: 9 }, (_, i) => note(`v${i}`, i * 0.5, 60 + i)) };
    const { svg } = pianoRoll([many]);
    expect(svg).toContain('1 more');
    expect(svg.match(/class="note"[^>]*fill="#8f8e88"/g)?.length).toBe(1);
  });

  it('names every C it spans, and clips a note held past the window to it', () => {
    const { svg } = pianoRoll([{ label: 'held', notes: [note('a', 0, 48, 600), note('a', 1, 72)] }], { to: 8 });
    for (const c of ['C3', 'C4', 'C5']) expect(svg).toContain(`>${c}<`);
    const width = Number(/class="note" x="[\d.]+" y="[\d.]+" width="([\d.]+)"/.exec(svg)![1]);
    expect(width).toBe(960);
  });
});

describe('the command line', () => {
  it('draws an example against a text, and writes what --notes keeps for another checkout', () => {
    const dir = scratch();
    writeFileSync(join(dir, 'a.cells'), '&a loop=A4');
    const kept = join(dir, 'before.json');
    expect(main(['--notes', kept, 'before=example:oscillator'])).toEqual([kept]);
    expect(readInput(kept).label).toBe('before');
    const out = join(dir, 'roll.svg');
    expect(main(['-o', out, '--title', 'A & B', kept, join(dir, 'a.cells')])).toEqual([out]);
    const svg = readFileSync(out, 'utf8');
    expect(svg).toContain('A &amp; B');
    expect(svg).toContain('a.cells: 1 notes');
  });

  it('runs under Node, through tools/node-ts.mjs', () => {
    const dir = scratch();
    const out = join(dir, 'roll.svg');
    const run = spawnSync('node', ['--experimental-transform-types', '--no-warnings', '--import', nodeTs, tool, '-o', out, 'example:twinkle'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(run.stderr).toBe('');
    expect(run.stdout.trim()).toBe(out);
    expect(notes(readFileSync(out, 'utf8'))).toBeGreaterThan(10);
  });

  it.skipIf(!chromeShell())(
    'renders the picture to a PNG at twice its pixels, in Chromium',
    () => {
      const dir = scratch();
      const [, png] = main(['-o', join(dir, 'roll.svg'), '--png', 'example:twinkle']);
      const bytes = readFileSync(png);
      expect(bytes.subarray(1, 4).toString()).toBe('PNG');
      // The width, big-endian at byte 16 of the header: the SVG's 1020 pixels, twice.
      expect(bytes.readUInt32BE(16)).toBe(2040);
    },
    60_000,
  );
});
