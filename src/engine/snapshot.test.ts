/**
 * What every example plays, as one line per piece in `snapshot.txt` (#142): its notes over the first 40 s,
 * the values its cells hold at a few moments, and the live view at a few more, hashed. A change to what a
 * piece plays fails here and names the piece; when it is meant, refresh with `npx vitest run -u
 * src/engine/snapshot.test.ts` and say in the PR which pieces changed and why (docs/testing.md).
 *
 * Beside it, two promises about time that hold for every example: two plans are the same, and a plan's
 * events over two windows are its events over one.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { notesAt, valuesAt } from './values';
import { liveAt } from './live';
import { PRESETS } from './presets';

/** Plain data for hashing: maps and sets in a fixed order, numbers to 9 significant digits. */
function plain(x: unknown): unknown {
  if (typeof x === 'number') return Number.isFinite(x) ? +x.toPrecision(9) : String(x);
  if (x instanceof Map) return [...x.entries()].map(([k, v]) => [String(k), plain(v)]).sort((a, b) => (a[0]! < b[0]! ? -1 : 1));
  if (x instanceof Set) return [...x].map(String).sort();
  if (Array.isArray(x)) return x.map(plain);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, plain(v)]));
  return x;
}
const hash = (x: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(plain(x)))
    .digest('hex')
    .slice(0, 16);

const VALUE_TIMES = [0.5, 3.3, 11.7, 29.1];
const LIVE_TIMES = [2.1, 13.3, 37.9];

const pieces = Object.entries(PRESETS).map(([key, { source }]) => {
  const result = compileSource(source);
  const shifts = codeShifts(result);
  return { key, result, shifts, played: plan(result, shifts) };
});

describe('every example plays what it played (snapshot.txt)', () => {
  it('notes, values and the live view, hashed per piece', async () => {
    const lines = pieces.map(({ key, result, shifts, played }) => {
      const events = eventsBetween(played, 0, 40);
      const names = [...result.cells.keys()].sort();
      const values = VALUE_TIMES.map((t) => names.map((n) => [n, valuesAt(result, shifts, n, t), notesAt(result, shifts, n, t)]));
      const live = LIVE_TIMES.map((t) => liveAt(result, shifts, new Set(), t));
      return `${key}  ${events.length} notes  events ${hash(events)}  values ${hash(values)}  live ${hash(live)}`;
    });
    await expect(lines.join('\n') + '\n').toMatchFileSnapshot('./snapshot.txt');
  });
});

describe('time: what a plan plays does not depend on how it is asked', () => {
  it.each(pieces.map((p) => [p.key, p] as const))('%s: two plans are the same', (_, { result, shifts, played }) => {
    expect(plain(eventsBetween(plan(result, shifts), 0, 30))).toEqual(plain(eventsBetween(played, 0, 30)));
  });
  it.each(pieces.map((p) => [p.key, p] as const))('%s: 0–30 s and 30–60 s are 0–60 s', (_, { played }) => {
    const split = [...eventsBetween(played, 0, 30), ...eventsBetween(played, 30, 60)];
    expect(plain(split)).toEqual(plain(eventsBetween(played, 0, 60)));
  });
});
