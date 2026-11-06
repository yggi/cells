/**
 * Minify (decision 069 §5, #482): a text's own names renamed short. Kept: the interface names, the names it uses but
 * doesn't define, a drum's name (on a MIDI card it is its note, decision 054), and, until #481 keys a draw on its cell's
 * content, a cell that draws and the cells that splice one. Lifted from `tools/compileprobe.ts` (#441). Pure.
 */
import { parse } from '../parser';
import { INTERFACE_NAMES } from '../program';
import { GM_KIT } from '../midi';
import { splitComment } from '../edit';

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
 * The names that mean something besides themselves, which minify keeps: a drum's (its MIDI note), and a cell that draws
 * (`x?`, `[a|b]`, `chance=`, `seed=`), or splices one that does, since a draw is keyed on the name of the cell that plays
 * it (`realize.ts`, decision 031).
 */
export function meaningfulNames(text: string): Set<string> {
  const lines = new Map(parse(text).cells.map((d) => [d.name, text.split('\n')[d.span.line - 1] ?? ''] as const));
  const keep = new Set([...lines.keys()].filter((n) => DRUMS.has(n.replace(/\d+$/, '').toLowerCase())));
  const draws = new Set([...lines].filter(([, l]) => /\?|\[[^\]]*\||\b(?:chance|seed)=/.test(splitComment(l)[0])).map(([n]) => n));
  for (let grew = true; grew;) {
    grew = false;
    for (const [n, l] of lines)
      // (through a braid's splice; a mix's product plays the cell, which keys its own draws)
      if (!draws.has(n) && !/\*/.test(splitComment(l)[0]) && [...splitComment(l)[0].matchAll(/&([A-Za-z_]\w*)/g)].some((m) => draws.has(m[1]!) && m[1] !== n)) {
        draws.add(n);
        grew = true;
      }
  }
  return new Set([...keep, ...draws]);
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
