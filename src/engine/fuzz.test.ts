import { describe, expect, test } from 'vitest';
import { PRESETS } from './presets';
import { codeShifts, compileSource } from './compile';
import { eventsBetween, plan } from './realize';

// Half-typed code is the normal state of the editor: every example, with a token or a
// character deleted, must compile, plan and play its first seconds without throwing.
// A seeded sample, so a failure names its input and comes back every run.

const TOKENS = 12; // token deletions per example
const CHARS = 8; // character deletions per example

/** mulberry32: a small seeded generator. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function survives(source: string) {
  const r = compileSource(source);
  const p = plan(r, codeShifts(r));
  eventsBetween(p, 0, 2);
  eventsBetween(p, 2, 4);
}

function edits(source: string, seed: number): string[] {
  const rnd = random(seed);
  const tokens = [...source.matchAll(/\S+/g)];
  const out: string[] = [];
  for (let i = 0; i < TOKENS; i++) {
    const m = tokens[Math.floor(rnd() * tokens.length)];
    out.push(source.slice(0, m.index) + source.slice(m.index! + m[0].length));
  }
  for (let i = 0; i < CHARS; i++) {
    const at = Math.floor(rnd() * source.length);
    out.push(source.slice(0, at) + source.slice(at + 1));
  }
  return out;
}

describe('fuzz: an example with one deletion never throws', () => {
  for (const [key, p] of Object.entries(PRESETS)) {
    test(key, () => {
      let seed = 0;
      for (const c of key) seed = (seed * 31 + c.charCodeAt(0)) | 0;
      for (const source of edits(p.source, seed)) expect(() => survives(source), source).not.toThrow();
    });
  }
});

describe('a program with errors plays nothing (it may name cells it lacks)', () => {
  test.each([
    ['a moving parameter through an unknown cell', '&t step=4 0\n&v s=saw lpf=100..2000 * &nope\n&out loop=SAMPLE_RATE map=sample [&t * &v]'],
    ['a cell over an unknown table, spliced into a played one', '&a over=&nope 0 1\n&t step=4 &a\n&v s=sine\n&out loop=SAMPLE_RATE map=sample [&t * &v]'],
  ])('%s', (_, source) => {
    const r = compileSource(source);
    expect(r.ok).toBe(false);
    const p = plan(r, codeShifts(r));
    expect(p.tracks).toEqual([]);
    expect(eventsBetween(p, 0, 4)).toEqual([]);
  });
});
