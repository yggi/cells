import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { freeIndex, freeList, withHeld } from './held';
import { setBraid } from './edit';

const src = ['&s scan(2 2 1 2 2 2 1) shift=free(0, 0..6)', '&t 0 2 4 over=&s step=free(120bpm, 60..240)'].join('\n');

describe('held free() values', () => {
  it('lists the free()s in reading order and finds one by its span', () => {
    const r = compileSource(src);
    const fs = freeList(r);
    expect(fs.map((f) => f.span.line)).toEqual([1, 2]);
    expect(freeIndex(r, fs[1])).toBe(1);
    expect(freeIndex(r, { span: { line: 9, col: 1 } })).toBe(-1);
  });

  it('writes the held values in, and leaves the others as written', () => {
    const r = compileSource(src);
    const out = withHeld(src, r, new Map([[1, 90]]));
    expect(out.split('\n')[0]).toBe('&s scan(2 2 1 2 2 2 1) shift=free(0, 0..6)');
    expect(out.split('\n')[1]).toMatch(/step=free\(90/);
    const both = withHeld(
      src,
      r,
      new Map<number, number>([
        [0, 3],
        [1, 90],
      ]),
    );
    expect(both.split('\n')[0]).toMatch(/free\(3, 0\.\.6\)/);
  });
});

describe('a braid left free, held (#210)', () => {
  const braid = '&key scan(2 2 1 2 2 2 1)\n&riff over=&key step=4 free(0 2 4 ~) shift=free(0, 0..6) # the riff';
  it('writes a take in its place, as text; the slider after it stays where it is', () => {
    const r = compileSource(braid);
    expect(freeList(r).map((f) => f.key)).toEqual(['braid', 'shift']);
    const out = withHeld(
      braid,
      r,
      new Map<number, number | string>([
        [0, '0 4 7 5 ~ 4@2 [0,4]'],
        [1, 2],
      ]),
    );
    expect(out.split('\n')[1]).toBe('&riff over=&key step=4 free(0 4 7 5 ~ 4@2 [0,4]) shift=free(2, 0..6) # the riff');
    expect(compileSource(out).ok).toBe(true);
  });
  it('setBraid rewrites its default and keeps it free', () => {
    expect(setBraid(braid, 'riff', ['0', '2@2', '~']).split('\n')[1]).toBe('&riff over=&key step=4 shift=free(0, 0..6) free(0 2@2 ~) # the riff');
  });
});
