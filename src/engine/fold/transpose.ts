/**
 * The disentangler (docs/notes/fold.md): a line's chords and rests as tokens, each written relative to its own lowest
 * pitch (its base) — a shift with carry, so that a figure and the same a fifth up are one key at two bases, and
 * neighbours across a block's edge compare as shapes. And back: a token as text, at a base.
 */
import type { Chord, Line, Tok } from './ir';

/** An element's key: a rest `r<dur>`, drums `d<dur>:&bd,&hh`, a chord `n<dur>:0,4,7` (above its base). */
const restKey = (dur: number) => `r${dur}`;

/** A chord as a token: its shape and its base. */
function chordTok(c: Chord): Tok {
  const nums = c.values.map(Number);
  if (nums.some((v) => !Number.isFinite(v))) return { key: `d${c.dur}:${[...c.values].sort().join(',')}`, base: null };
  const base = Math.min(...nums);
  return { key: `n${c.dur}:${nums.map((v) => v - base).join(',')}`, base };
}

/** A line as tokens: its chords, the rests between them, and the rest to its end. */
export function tokensOf(line: Line): Tok[] {
  const out: Tok[] = [];
  let now = 0;
  for (const c of [...line.chords].sort((a, b) => a.at - b.at)) {
    if (c.at > now) out.push({ key: restKey(c.at - now), base: null });
    out.push(chordTok(c));
    now = c.at + c.dur;
  }
  if (line.length > now) out.push({ key: restKey(line.length - now), base: null });
  return out;
}

/** Is this key an element's (a chord, drums, a rest), not a symbol's? */
export const isElement = (key: string): boolean => /^[rdn]\d/.test(key);
/** Is this key a figuration's (`figure.ts`)? */
export const isLook = (key: string): boolean => /^f\d/.test(key);

/** An element as braid text at a base pitch: `4`, `[0,4,7]@2`, `~@3`, `[&bd,&hh]`. */
export function elementText(key: string, base: number | null): string {
  const m = /^([rdn])(\d+)(?::(.*))?$/.exec(key)!;
  const dur = Number(m[2]);
  const hold = dur === 1 ? '' : `@${dur}`;
  if (m[1] === 'r') return `~${hold}`;
  const values = m[1] === 'd' ? m[3]!.split(',') : m[3]!.split(',').map((v) => String(Number(v) + (base ?? 0)));
  return `${values.length === 1 ? values[0] : `[${values.join(',')}]`}${hold}`;
}
