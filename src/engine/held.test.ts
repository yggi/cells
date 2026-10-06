import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { freeIndex, freeList, withHeld } from './held';

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
