/**
 * free() values moved by hand: what plays, not what's written, until they are kept. They are held by
 * their place among the code's free()s (the first, the second … in reading order), so rewriting the
 * code around them can't lose them.
 */
import type { CompileResult } from './compile';
import { setFree } from './edit';

/** Held values by their place among the code's free()s. */
export type Held = ReadonlyMap<number, number | string>;

/** Every free() in the code, in reading order. */
export const freeList = (r: CompileResult) =>
  [...r.cells.values()].flatMap((c) => c.frees).sort((a, b) => a.span.line - b.span.line || a.span.col - b.span.col);

/** The place of the free() written at a span, or −1. */
export const freeIndex = (r: CompileResult, spec: { span: { line: number; col: number } }) =>
  freeList(r).findIndex((f) => f.span.line === spec.span.line && f.span.col === spec.span.col);

/** The code with the held values written in. */
export function withHeld(src: string, r: CompileResult, held: Held): string {
  const fs = freeList(r);
  let out = src;
  // (from the end backwards: each rewrite leaves the earlier places where they were)
  for (let i = fs.length - 1; i >= 0; i--) if (held.has(i)) out = setFree(out, fs[i], held.get(i)!);
  return out;
}
