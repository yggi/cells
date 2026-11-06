/**
 * Minify (decision 069 §5, #482): a text's own names renamed short. Kept: the interface names, the names it uses but
 * doesn't define, and a drum's name (on a MIDI card it is its note, decision 054); a cell that draws is renamed freely,
 * its draws keyed on its content since #481. Lifted from `tools/compileprobe.ts` (#441). Pure.
 */
import { parse } from '../parser';
import { INTERFACE_NAMES } from '../program';
import { GM_KIT } from '../midi';

/** The text's own names (bare), those it defines, in order: the interface names aside. */
const ownNames = (text: string) => {
  const keep = new Set(INTERFACE_NAMES.map((n) => n.slice(1)));
  return [...new Set(parse(text).cells.map((d) => d.name))].filter((n) => !keep.has(n) && !n.startsWith('λ'));
};

/** A short name for the nth: a … z, then a1 …, never one the text keeps. */
const short = (i: number): string => `${String.fromCharCode(97 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`;

/** A General MIDI drum's name or alias: on a MIDI card a kit member's name is its note (decision 054). */
const DRUMS = new Set(GM_KIT.flatMap((d) => [d.name, ...d.aliases]));

/**
 * The names that mean something besides themselves, which minify keeps: a drum's, its MIDI note on a MIDI card (decision
 * 054). A cell that draws is renamed as freely as any other: a draw is keyed on its cell's content, not its name (#481).
 */
export function meaningfulNames(text: string): Set<string> {
  return new Set(
    parse(text)
      .cells.map((d) => d.name)
      .filter((n) => DRUMS.has(n.replace(/\d+$/, '').toLowerCase())),
  );
}

/** Minify (question 2): every own name renamed to a short one; the interface names, the names it uses but doesn't define, and `meaningfulNames` kept. */
export function minify(text: string): string {
  const kept = meaningfulNames(text);
  const own = ownNames(text).filter((n) => !kept.has(n));
  const taken = new Set([...text.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]!));
  const to = new Map<string, string>();
  let i = 0;
  for (const name of own) {
    let n = short(i++);
    while (taken.has(n) && !own.includes(n)) n = short(i++);
    to.set(name, n);
  }
  // (two passes through a marker no text writes, so &a → &b and &b → &a don't meet)
  const via = text.replace(/&([A-Za-z_][A-Za-z0-9_]*)(?![A-Za-z0-9_])/g, (w, n: string) => (to.has(n) ? `&§${to.get(n)}` : w));
  return via.replace(/&§/g, '&');
}
