/**
 * Foldings: a piece's cyclic patterns, heard at every level, and the same pattern found at more than one. A necklace is
 * `n` slots round a cycle with some marked: the strokes of a bell in its twelve pulses, the notes of a scale in the
 * twelve semitones. Seen as its steps (the gaps between marks) it doesn't depend on where the cycle starts, so the
 * West African bell x.x.xx.x.x.x and the major scale are one necklace, 2 2 1 2 2 2 1 (examples/bell.cells writes them
 * as one scan). The same necklace at two levels is a piece folded the same way at two scales: a fixed point of
 * renormalization (docs/notes/multiscale.md), and a candidate for one cell where the code has two.
 */
import type { Played } from '../realize';

/** `n` slots round a cycle, the marked ones (ascending, in [0, n)). */
export interface Necklace {
  readonly n: number;
  readonly marks: readonly number[];
}

/** The gaps between marks, round the cycle, starting at the first mark. */
export function steps(x: Necklace): number[] {
  return x.marks.map((m, i) => (i + 1 < x.marks.length ? x.marks[i + 1] - m : x.n - m + x.marks[0]));
}

/** The shortest stretch of steps the necklace repeats (two bars of a bell: one bar). */
function primitive(s: readonly number[]): number[] {
  for (let p = 1; p < s.length; p++) if (s.length % p === 0 && s.every((v, i) => v === s[i % p])) return s.slice(0, p);
  return [...s];
}

/**
 * The necklace's name, the same whatever slot the cycle starts at and however many times round it repeats: its steps
 * (one repeat) from the rotation that reads largest (the major scale and the standard bell both read "2 2 2 1 2 2 1",
 * the rotation that starts at the scale's fourth degree).
 */
export function canonical(x: Necklace): string {
  const s = primitive(steps(x));
  let best = s;
  for (let r = 1; r < s.length; r++) {
    const rot = [...s.slice(r), ...s.slice(0, r)];
    for (let k = 0; k < rot.length; k++)
      if (rot[k] !== best[k]) {
        if (rot[k] > best[k]) best = rot;
        break;
      }
  }
  return best.join(' ');
}

/**
 * Maximally even (Clough & Douthett 1991): the marks as evenly spread as `n` slots allow; for each span of d marks,
 * the slots it covers take at most two sizes, one apart. The diatonic scale, the bell, the pentatonic, the tresillo
 * x..x..x. are; the clave son isn't.
 */
export function maximallyEven(x: Necklace): boolean {
  const k = x.marks.length;
  if (k < 2) return true;
  for (let d = 1; d < k; d++) {
    const sizes = new Set(x.marks.map((m, i) => (x.marks[(i + d) % k] - m + x.n) % x.n || x.n));
    if (sizes.size > 2 || Math.max(...sizes) - Math.min(...sizes) > 1) return false;
  }
  return true;
}

/**
 * The rhythm of onsets (s) folded round a cycle of `cycle` seconds with `pulse` seconds a slot: a slot is marked when
 * an onset lands on it in at least half the turns heard (a fill or a variation doesn't change the pattern). Onsets off
 * the pulse grid by more than a quarter pulse leave the pattern null: the pulse doesn't fit them.
 */
export function rhythm(onsets: readonly number[], cycle: number, pulse: number, from = 0): Necklace | null {
  const n = Math.round(cycle / pulse);
  if (n < 2 || Math.abs(n * pulse - cycle) > pulse / 4 || !onsets.length) return null;
  const hits = new Map<number, Set<number>>();
  let turns = 0;
  for (const t of onsets) {
    const local = (t - from) / pulse;
    const slot = Math.round(local);
    if (Math.abs(local - slot) > 0.25) return null;
    const turn = Math.floor(slot / n);
    turns = Math.max(turns, turn + 1);
    const at = ((slot % n) + n) % n;
    if (!hits.has(at)) hits.set(at, new Set());
    hits.get(at)!.add(turn);
  }
  const marks = [...hits].filter(([, ts]) => ts.size * 2 >= turns).map(([slot]) => slot);
  return marks.length ? { n, marks: marks.sort((a, b) => a - b) } : null;
}

/** The pitch classes heard (frequencies, A = 440 Hz), as a necklace of the twelve semitones. */
export function pitchClasses(freqs: readonly number[]): Necklace | null {
  const marks = new Set<number>();
  for (const f of freqs) if (f > 0) marks.add((((Math.round(12 * Math.log2(f / 440)) + 9) % 12) + 12) % 12);
  return marks.size ? { n: 12, marks: [...marks].sort((a, b) => a - b) } : null;
}

/** The finest pulse heard: the most common gap (to the millisecond) between successive onsets of any voice. */
export function pulseOf(onsets: readonly number[]): number | null {
  const sorted = [...onsets].sort((a, b) => a - b);
  const count = new Map<number, number>();
  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.round((sorted[i] - sorted[i - 1]) * 1000);
    if (gap > 0) count.set(gap, (count.get(gap) ?? 0) + 1);
  }
  let best: [number, number] | null = null;
  for (const [gap, c] of count) if (!best || c > best[1] || (c === best[1] && gap < best[0])) best = [gap, c];
  return best ? best[0] / 1000 : null;
}

/** A level to fold at: a cycle (s) with its pulse (s), named for what writes or hears it (a cell, a ridge). */
export interface Level {
  readonly name: string;
  readonly cycle: number;
  readonly pulse: number;
}

/**
 * The levels to fold a piece at: any clocked cell's turn as the cycle, with any cell's step (or the finest pulse heard,
 * unless a written one is within 2 % of it) as the pulse, whole slots a cycle, 3 to `most`, the cycle within `longest`
 * seconds. The bell's bar is &beat's turn, its pulse &pulse's step: no one cell has both. Spans in seconds (a cell's
 * step and turn: layout/tower.ts `towerSpans`, as decades there).
 */
export function levelsOf(spans: readonly { readonly name: string; readonly step: number; readonly turn: number }[], heard: number | null, longest: number, most = 64): Level[] {
  const pulses = spans.map((x) => x.step);
  if (heard && !pulses.some((q) => Math.abs(q / heard - 1) < 0.02)) pulses.push(heard);
  const out: Level[] = [];
  for (const c of spans) {
    if (!(c.turn <= longest)) continue;
    for (const pulse of pulses) {
      const n = Math.round(c.turn / pulse);
      if (n < 3 || n > most || Math.abs(n * pulse - c.turn) > 0.02 * pulse) continue;
      if (!out.some((l) => Math.abs(l.cycle - c.turn) < 1e-6 && Math.abs(l.pulse - pulse) < 1e-6)) out.push({ name: `&${c.name}/${n}`, cycle: c.turn, pulse });
    }
  }
  return out;
}

/** A necklace heard: in whose notes, at which level (or in pitch) and at what pulse (s; a semitone in pitch), and its name. */
export interface Folding {
  readonly voice: string;
  readonly level: string;
  readonly kind: 'rhythm' | 'pitch';
  readonly pulse: number;
  readonly necklace: Necklace;
  readonly name: string;
  readonly even: boolean;
}

/**
 * Every folding of a piece's notes: each voice's rhythm round each level, and each voice's pitch classes. Trivial
 * ones (one mark, every slot, or marks evenly spaced) are left out: every pulse is a necklace of those.
 */
export function foldings(events: readonly Pick<Played, 'at' | 'voice' | 'freq'>[], levels: readonly Level[]): Folding[] {
  const byVoice = new Map<string, Pick<Played, 'at' | 'voice' | 'freq'>[]>();
  for (const e of events) {
    const notes = byVoice.get(e.voice);
    if (notes) notes.push(e);
    else byVoice.set(e.voice, [e]);
  }
  const out: Folding[] = [];
  const keep = (voice: string, level: string, kind: Folding['kind'], pulse: number, x: Necklace | null) => {
    if (!x || x.marks.length < 2 || x.marks.length >= x.n || new Set(steps(x)).size === 1) return;
    out.push({ voice, level, kind, pulse, necklace: x, name: canonical(x), even: maximallyEven(x) });
  };
  for (const [voice, notes] of byVoice) {
    const onsets = [...new Set(notes.map((e) => +e.at.toFixed(4)))];
    for (const l of levels) keep(voice, l.name, 'rhythm', l.pulse, rhythm(onsets, l.cycle, l.pulse));
    keep(voice, 'octave', 'pitch', 0, pitchClasses(notes.map((e) => e.freq)));
  }
  return out;
}

/**
 * The same necklace at more than one scale: groups of foldings with one name heard at two pulses or more, or in rhythm
 * and in pitch (the same pattern repeated round a longer cycle at the same pulse is one scale), largest first.
 */
export function alike(fs: readonly Folding[]): { name: string; even: boolean; where: Folding[] }[] {
  const by = new Map<string, Folding[]>();
  for (const f of fs) by.set(f.name, [...(by.get(f.name) ?? []), f]);
  return (
    [...by]
      .map(([name, where]) => ({ name, even: where[0].even, where }))
      // (pulses within a twenty-fourth of an octave are one: a pulse heard to the millisecond against one written)
      .filter((g) => new Set(g.where.map((f) => `${f.kind}:${f.pulse > 0 ? Math.round(24 * Math.log2(f.pulse)) : 0}`)).size > 1)
      .sort((a, b) => b.where.length - a.where.length)
  );
}
