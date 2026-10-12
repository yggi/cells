/**
 * The look-up isometry (docs/notes/fold.md): a figuration. A run of blocks of a line, each the same rhythm and the
 * same pattern through its own chord (BWV 847's prelude: top, middle, low, middle, bottom, middle, low, middle, over a
 * new chord each half bar), is one figure read over a table of chords: `&f1 0 1 2 1 3 1 2 1` read `over=` a table
 * stepped once a block (`&t1 step=&tempo*8 [12,3,2,0] …`), each chord in the order the figure first plays it. The figure is the slow part's shape, the table its harmony:
 * the notes factored into what repeats and what changes. Any block length, any line: the same move at every scale.
 */
import type { Folded, Look, Tok, Tool } from './ir';
import { elementText, isElement } from './transpose';

/** Blocks a figure must run for, and the notes it must hold in all, to pay. */
const LEAST_BLOCKS = 3;
const LEAST_NOTES = 12;
/** Block lengths tried (tokens). */
const SIZES = [3, 4, 5, 6, 7, 8, 9, 10, 12, 16];

/** A token's steps, and its single pitch (null: a rest; undefined: anything else, a chord or drums). */
const durOf = (t: Tok) => Number(/^[rdn](\d+)/.exec(t.key)![1]);
const pitchOf = (t: Tok): number | null | undefined => (t.key.startsWith('r') ? null : /^n\d+:0$/.test(t.key) ? t.base! : undefined);

/**
 * A block's figure (its rhythm, and each note's place in its chord) and its chord, its notes in the order the figure
 * first plays them (so a figure is one whatever the voicing: BWV 847's both hands); null if it has none.
 */
function blockOf(toks: readonly Tok[]): { sig: string; chord: number[] } | null {
  const pitches = toks.map(pitchOf);
  if (pitches.some((p) => p === undefined)) return null;
  const chord = [...new Set(pitches.filter((p): p is number => p !== null))];
  if (chord.length < 2) return null;
  const sig = toks.map((t, i) => `${durOf(t)}:${pitches[i] === null ? '~' : chord.indexOf(pitches[i]!)}`).join(' ');
  return { sig, chord };
}

/** Each line's figurations, the longest first, written as look-ups. */
export const figure: Tool = (f: Folded) => {
  const looks = new Map(f.looks ?? []);
  let made = 0;
  const lines = f.lines.map((line) => {
    const toks = line.toks;
    if (toks.some((t) => !isElement(t.key))) return line;
    // (where each token starts, in steps)
    const starts: number[] = [];
    toks.reduce((s, t) => (starts.push(s), s + durOf(t)), 0);
    const found: { from: number; size: number; count: number; chords: number[][]; sig: string; dur: number; gain: number }[] = [];
    for (const size of SIZES)
      for (let from = 0; from + size * LEAST_BLOCKS <= toks.length; from++) {
        const first = blockOf(toks.slice(from, from + size));
        if (!first) continue;
        const dur = toks.slice(from, from + size).reduce((n, t) => n + durOf(t), 0);
        // (the table steps once a block from the piece's start: the run must start on a block's edge)
        if (starts[from]! % dur !== 0) continue;
        const chords = [first.chord];
        while (from + size * (chords.length + 1) <= toks.length) {
          const b = blockOf(toks.slice(from + size * chords.length, from + size * (chords.length + 1)));
          if (!b || b.sig !== first.sig || b.chord.length !== first.chord.length) break;
          chords.push(b.chord);
        }
        if (chords.length < LEAST_BLOCKS || chords.length * size < LEAST_NOTES) continue;
        // (a figuration is harmony moving under a figure: a chord that stays is a repeat, `x!n`, not a table)
        const changes = chords.filter((c, j) => j > 0 && c.join() !== chords[j - 1]!.join()).length;
        if (changes < (chords.length - 1) / 2) continue;
        // (it pays: the notes written out against the figure, its table, padded from the start, and its run)
        const written = toks.slice(from, from + size * chords.length).reduce((n, t) => n + elementText(t.key, t.base).length + 1, 0);
        const table = 30 + chords.reduce((n, c) => n + c.join(',').length + 3, 0) + 2 * (starts[from]! / dur);
        const cost = table + 30 + 2 * size + 8;
        if (cost < written) found.push({ from, size, count: chords.length, chords, sig: first.sig, dur, gain: written - cost });
      }
    // what saves the most first, then those that don't overlap them
    found.sort((a, b) => b.gain - a.gain || a.from - b.from);
    const taken: [number, number][] = [];
    const runs = found.filter((r) => {
      const [a, b] = [r.from, r.from + r.size * r.count];
      if (taken.some(([x, y]) => a < y && x < b)) return false;
      taken.push([a, b]);
      return true;
    });
    if (!runs.length) return line;
    const out: Tok[] = [];
    let i = 0;
    for (const r of runs.sort((a, b) => a.from - b.from)) {
      out.push(...toks.slice(i, r.from));
      const key = `f${looks.size + 1}`;
      const pattern: Tok[] = r.sig.split(' ').map((w) => {
        const [d, at] = w.split(':');
        return at === '~' ? { key: `r${d}`, base: null } : { key: `n${d}:0`, base: Number(at) };
      });
      const look: Look = { pattern, chords: r.chords, dur: r.dur, start: starts[r.from]!, scale: line.scale ?? 1 };
      looks.set(key, look);
      out.push({ key, base: null });
      i = r.from + r.size * r.count;
      made++;
    }
    out.push(...toks.slice(i));
    return { ...line, toks: out };
  });
  return made ? { lines, rules: f.rules, looks } : null;
};
