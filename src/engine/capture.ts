/**
 * Recording a braid left free (`free(0 2 4 ~ …)`, #210, decision 018), the pure part: a key as the number the cell
 * writes for it (`tableReader`: its table's nearest entry, or an accidental on the grid below), one pass of keys taken
 * against the cell's own steps (`Take`), and the quantiser that writes them as braid tokens (`quantise`): keys held
 * together a chord `[a,b]`, a key held across steps `@n`, nothing `~`. Positions are kept exact (steps through the
 * cell's time map, so swing and moving clocks are undone) and rounded only when the take is written. The law:
 * recording what a braid plays gives the braid back (capture.test.ts).
 */
import type { FreeSpec } from './ast';
import type { CompileResult, Output, Shifts } from './program';
import { resolvePitch, semitones } from './helix';

/** What a key outside the cell's table does, live and recorded: an accidental (as played), the nearest entry, or nothing. */
export type OutOfTable = 'allow' | 'snap' | 'ignore';

/** A number as a braid writes it: an entry of the table (laps beyond climbing), and accidentals (# up, b down a grid step). */
export interface Written {
  readonly value: number;
  readonly alter: number;
}

/** A step's text: `4`, `6#`, `3bb`, `-1`. */
export const writtenText = (w: Written) => `${w.value}${w.alter > 0 ? '#'.repeat(w.alter) : 'b'.repeat(-w.alter)}`;

/** The out that plays a cell's own braid as notes on a voice (not a kit, a gate, a tape), or null. */
export function melodicOut(result: CompileResult, cell: string): Output | null {
  return result.outputs.find((o) => !o.silent && !o.tape && !o.gate && !o.kit && o.cell === cell && o.cell !== o.voice) ?? null;
}

/** A cell a take records into: its braid left free, and the out that plays it. */
export interface RecordTarget {
  readonly cell: string;
  readonly spec: FreeSpec;
  readonly out: Output;
}

/**
 * Where a take goes (the cell armed for the keys, #207): the cell armed, if its braid is left free, it steps on a clock and it plays notes;
 * a voice armed, the first such cell (in reading order) that plays it. Null: nothing to record into.
 */
export function recordTarget(result: CompileResult, armed: string | null): RecordTarget | null {
  if (armed === null) return null;
  const of = (cell: string): RecordTarget | null => {
    const spec = result.cells.get(cell)?.frees.find((f) => f.key === 'braid');
    // (stepped by a clock: a take is counted in its steps)
    const out = spec && result.cells.get(cell)?.clock ? melodicOut(result, cell) : null;
    return spec && out ? { cell, spec, out } : null;
  };
  const own = of(armed);
  if (own || !result.cells.get(armed)?.voice) return own;
  const cells = [...result.cells.values()].sort((a, b) => a.span.line - b.span.line || a.span.col - b.span.col);
  for (const c of cells) {
    const t = of(c.name);
    if (t && t.out.voice === armed) return t;
  }
  return null;
}

/** How far either side of 0 the table is read for its entries (laps of it beyond climb the helix). */
const READ = 512;
/** Accidentals at most, either way, between entries. */
const MAX_ALTER = 3;
const tidy = (x: number) => Math.round(x * 1e9) / 1e9;

/**
 * The numbers a melody can write, as pitches on its out (semitones from its voice's own pitch, as a played note is:
 * the cell's tables down to its grid's tuning, the out's sign and constant semitones). `read(semis)` gives the nearest:
 * under 'snap' the nearest entry; under 'allow' the nearest pitch of the grid below, written as an entry with
 * accidentals (fewest, sharps before flats); under 'ignore' that pitch only if it is an entry, else null.
 */
export function tableReader(result: CompileResult, o: Output, shifts: Shifts) {
  const pitch = (w: Written) => {
    const r = resolvePitch(result, o.cell, w.value, w.alter, shifts);
    return tidy(o.sign * semitones(result, r.root, r.position) + o.offset);
  };
  // the entries, by pitch (worked out at the first key): a pitch two entries share (a table that repeats), the nearer 0
  let ladder: { s: number; value: number }[] | null = null;
  const entries = () => {
    if (ladder) return ladder;
    const at = new Map<number, number>();
    for (let k = 0; k <= READ; k++)
      for (const v of k ? [k, -k] : [0]) {
        const s = pitch({ value: v, alter: 0 });
        if (Number.isFinite(s) && !at.has(s)) at.set(s, v);
      }
    return (ladder = [...at].map(([s, value]) => ({ s, value })).sort((a, b) => a.s - b.s));
  };
  const nearestEntry = (x: number) => {
    const l = entries();
    let lo = 0;
    let hi = l.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (l[mid].s <= x) lo = mid;
      else hi = mid - 1;
    }
    // (a tie takes the lower)
    return lo + 1 < l.length && l[lo + 1].s - x < x - l[lo].s ? lo + 1 : lo;
  };
  return {
    read(semis: number, mode: OutOfTable): (Written & { readonly semis: number }) | null {
      const l = entries();
      if (!l.length || !Number.isFinite(semis)) return null;
      const x = tidy(semis);
      const i = nearestEntry(x);
      if (mode === 'snap') return { value: l[i].value, alter: 0, semis: l[i].s };
      let best: (Written & { semis: number }) | null = null;
      const better = (c: Written & { semis: number }) => {
        if (!best) return true;
        const d = Math.abs(c.semis - x) - Math.abs(best.semis - x);
        if (Math.abs(d) > 1e-9) return d < 0;
        if (Math.abs(c.alter) !== Math.abs(best.alter)) return Math.abs(c.alter) < Math.abs(best.alter);
        if (c.alter !== best.alter) return c.alter > best.alter;
        return Math.abs(c.value) < Math.abs(best.value) || (Math.abs(c.value) === Math.abs(best.value) && c.value < best.value);
      };
      for (let j = Math.max(0, i - 2); j <= Math.min(l.length - 1, i + 2); j++)
        for (let alter = -MAX_ALTER; alter <= MAX_ALTER; alter++) {
          const c = { value: l[j].value, alter, semis: alter ? pitch({ value: l[j].value, alter }) : l[j].s };
          if (Number.isFinite(c.semis) && better(c)) best = c;
        }
      if (!best) return null;
      const b = best as Written & { semis: number };
      // (an accidental that lands on an entry is that entry)
      const on = l.find((e) => Math.abs(e.s - b.semis) < 1e-9);
      const w = on ? { value: on.value, alter: 0, semis: on.s } : b;
      return mode === 'ignore' && w.alter !== 0 ? null : w;
    },
  };
}

/** A key captured in a take: what it writes, and when it went down and up, in the cell's steps from the pass's start (exact). */
export interface Captured extends Written {
  readonly on: number;
  readonly off: number;
}

/**
 * Captured keys as braid tokens over a frame of `length` steps. A key starts on its nearest step (half a step rounds
 * later) and lasts to its nearest step (one at least), but no further than the next step a key starts on: keys starting
 * together are a chord (sorted, each once) as long as the longest, a step held over several `@n`, a step nothing covers
 * `~`. Keys starting outside the frame are dropped.
 */
export function quantise(notes: readonly Captured[], length: number): string[] {
  const starts = new Map<number, { ws: Map<string, Written>; end: number }>();
  for (const n of notes) {
    const s = Math.floor(n.on + 0.5);
    if (s < 0 || s >= length) continue;
    const e = Math.min(length, Math.max(s + 1, Math.floor(n.off + 0.5)));
    const at = starts.get(s) ?? { ws: new Map<string, Written>(), end: s + 1 };
    at.ws.set(writtenText(n), n);
    at.end = Math.max(at.end, e);
    starts.set(s, at);
  }
  const steps = [...starts.keys()].sort((a, b) => a - b);
  const out: string[] = [];
  let at = 0;
  for (const [k, s] of steps.entries()) {
    for (; at < s; at++) out.push('~');
    const { ws, end } = starts.get(s)!;
    const len = Math.min(end, steps[k + 1] ?? length) - s;
    const sorted = [...ws.values()].sort((a, b) => a.value - b.value || a.alter - b.alter).map(writtenText);
    out.push(`${sorted.length > 1 ? `[${sorted.join(',')}]` : sorted[0]}${len > 1 ? `@${len}` : ''}`);
    at = s + len;
  }
  for (; at < length; at++) out.push('~');
  return out;
}

/**
 * One take: a pass of a cell's loop (`length` steps), its keys as they go down and up, at exact steps of the cell's
 * clock. `begin` places the pass: the first whole loop from where the cell is (a pass just begun, within half a step,
 * counts). Keys may come before it is placed; what falls outside it is dropped when it is written.
 */
export class Take {
  /** Where the pass starts, in the cell's steps, once placed. */
  start: number | null = null;
  readonly #down = new Map<string, Written & { on: number }>();
  readonly #notes: Captured[] = [];

  constructor(readonly length: number) {}

  /** Place the pass from the cell's step now (once). */
  begin(step: number): void {
    this.start ??= this.length * Math.max(0, Math.ceil((step - 0.5) / this.length));
  }

  /** The step at which the pass is over (the last a key may start on), once placed. */
  get end(): number | null {
    return this.start === null ? null : this.start + this.length - 0.5;
  }

  /** A key down at a step (`key` names it, for its up): what it writes, or null (a key that writes nothing). Down again: a new note. */
  down(key: string, w: Written | null, step: number): void {
    this.up(key, step);
    if (w) this.#down.set(key, { value: w.value, alter: w.alter, on: step });
  }

  /** A key up at a step. */
  up(key: string, step: number): void {
    const d = this.#down.get(key);
    if (!d) return;
    this.#down.delete(key);
    this.#notes.push({ ...d, off: step });
  }

  /** The take as braid tokens: keys still down end with the pass. Null: never placed. */
  write(): string[] | null {
    if (this.start === null) return null;
    const start = this.start;
    for (const key of [...this.#down.keys()]) this.up(key, start + this.length);
    return quantise(
      this.#notes.map((n) => ({ ...n, on: n.on - start, off: n.off - start })),
      this.length,
    );
  }
}
