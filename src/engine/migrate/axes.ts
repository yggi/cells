/**
 * Migrate (decision 076, #572): a style written on the axes before it, `sync harm artic energy`, as it is written now,
 * `sync harm bite mood`. `sync` and `harm` keep their places; `bite` is articulation, as it was; energy leaves the point
 * (it is intensity, #571); `mood` is read where the old point sits:
 *
 * - near a style of the library as it was (within `NEAR_STYLE` of one, `OLD_STYLES`): that style's mood, placed by hand,
 *   so what was written for a style keeps its mood;
 * - else the mood of the mode the seed library found nearest the old point (`OLD_MODES`, its mode fragments' points as
 *   they were), at `MOOD_TENSION` (`moodOf`).
 *
 * Both tables are frozen here so the rule outlives the library it was read from. A pick of `[artic]` reads `[bite]`; one
 * of `[energy]` reads `[bite]` too, until #571 gives intensity a reading of its own.
 *
 * The same rule moved the seed library's association points and its styles (#572). A style by name with an axis that
 * moves or a slider (`artic=.2..0.9 * &drift`) keeps articulation's expression as bite's; its mood is read where each
 * expression's first number puts the axis.
 *
 * Its meaning changed, not its spelling alone, so it is exact only against the old meaning (`Rewrite.exact`), never
 * Normalise's: a text Migrate reads is one written before v0.22.0. Read the old way (`CompileOptions.old`), a line is
 * read as this writes it, and warns. Witnessed by `fixtures/migrations/axes/`.
 */
import { splitComment } from '../edit';
import type { Rewrite } from '../rewrite';
import { moodOf } from '../style';

/** The axes before decision 076, in their order. */
export const OLD_AXES = ['sync', 'harm', 'artic', 'energy'] as const;
type OldPoint = Readonly<Record<(typeof OLD_AXES)[number], number>>;

/** The seed library's mode fragments' association points on the old axes, as they were at v0.21.0, with their modes. */
export const OLD_MODES: readonly { readonly mode: string; readonly point: OldPoint }[] = [
  { mode: 'aeolian', point: { sync: 0.3, harm: 0.45, artic: 0.55, energy: 0.55 } },
  { mode: 'aeolian', point: { sync: 0.12, harm: 0, artic: 1, energy: 0.8 } },
  { mode: 'aeolian', point: { sync: 0.5, harm: 0.75, artic: 0.35, energy: 0.5 } },
  { mode: 'dorian', point: { sync: 0.35, harm: 0.55, artic: 0.65, energy: 0.65 } },
  { mode: 'dorian', point: { sync: 1, harm: 0.12, artic: 0.85, energy: 0.75 } },
  { mode: 'ionian', point: { sync: 0.05, harm: 0.3, artic: 0, energy: 0.2 } },
  { mode: 'ionian', point: { sync: 0.75, harm: 0.85, artic: 0.45, energy: 0.45 } },
  { mode: 'ionian', point: { sync: 0.35, harm: 1, artic: 0.3, energy: 0.6 } },
  { mode: 'ionian', point: { sync: 0.1, harm: 0.12, artic: 0.5, energy: 0.35 } },
  { mode: 'mixolydian', point: { sync: 0.875, harm: 0.485, artic: 0.65, energy: 0.6 } },
  { mode: 'phrygian', point: { sync: 0.6, harm: 0.6, artic: 0.7, energy: 0.85 } },
  { mode: 'lydian', point: { sync: 0.15, harm: 0.6, artic: 0.15, energy: 0.3 } },
  { mode: 'locrian', point: { sync: 0.9, harm: 1, artic: 0.6, energy: 0.9 } },
  // (bell_and_scale plays ionian)
  { mode: 'ionian', point: { sync: 0.383, harm: 0.717, artic: 0.25, energy: 0.417 } },
  { mode: 'harmonic_minor', point: { sync: 0.55, harm: 0.75, artic: 0.6, energy: 0.75 } },
  { mode: 'harmonic_minor', point: { sync: 0.2, harm: 0.9, artic: 0.3, energy: 0.35 } },
];

/** Exact enough, and short: a number as a text writes it. */
const round = (x: number) => Math.round(x * 1e6) / 1e6;
const text = (x: number) => String(round(x)).replace(/^0\./, '.');

/** The squared distance between two old points. */
const d2 = (p: OldPoint, q: OldPoint) => OLD_AXES.reduce((a, k) => a + (p[k] - q[k]) ** 2, 0);

/** The mode the library found nearest an old point (the first of a tie, as the repository's query takes it). */
export function oldMode(p: OldPoint): string {
  return OLD_MODES.reduce((best, m) => (d2(p, m.point) < d2(p, best.point) ? m : best)).mode;
}

/**
 * The library's styles as they were at v0.21.0, on the old axes, each with its mood placed by hand (#572): its mode's
 * brightness tempered by the tension heard in it (`moodOf`, `docs/notes/572-axes-atlas.md`), on a grid of twentieths.
 */
export const OLD_STYLES: readonly { readonly id: string; readonly mood: number; readonly point: OldPoint }[] = [
  { id: 'synthPop', mood: 0.5, point: { sync: 0.3, harm: 0.45, artic: 0.55, energy: 0.55 } },
  { id: 'techno', mood: 0.4, point: { sync: 0.12, harm: 0, artic: 1, energy: 0.8 } },
  { id: 'deepHouse', mood: 0.65, point: { sync: 0.35, harm: 0.55, artic: 0.65, energy: 0.65 } },
  { id: 'ambient', mood: 0.9, point: { sync: 0.05, harm: 0.3, artic: 0, energy: 0.2 } },
  { id: 'lofi', mood: 0.5, point: { sync: 0.5, harm: 0.75, artic: 0.35, energy: 0.5 } },
  { id: 'funk', mood: 0.65, point: { sync: 1, harm: 0.12, artic: 0.85, energy: 0.75 } },
  { id: 'bossaNova', mood: 0.9, point: { sync: 0.75, harm: 0.85, artic: 0.45, energy: 0.45 } },
  { id: 'swingJazz', mood: 0.85, point: { sync: 0.35, harm: 1, artic: 0.3, energy: 0.6 } },
  { id: 'electroSwing', mood: 0.5, point: { sync: 0.55, harm: 0.75, artic: 0.6, energy: 0.75 } },
  { id: 'spooky', mood: 0.3, point: { sync: 0.2, harm: 0.9, artic: 0.3, energy: 0.35 } },
  { id: 'kinderlied', mood: 0.95, point: { sync: 0.1, harm: 0.12, artic: 0.5, energy: 0.35 } },
];

/** How near a style an old point is placed for it, and takes its mood: half the repository's miss distance (0.3). */
export const NEAR_STYLE = 0.15;

/** An old point's mood: the nearest style's, where one is within `NEAR_STYLE`; else its mode's (`moodOf`). */
export function oldMood(p: OldPoint): number {
  const near = OLD_STYLES.reduce((best, s) => (d2(p, s.point) < d2(p, best.point) ? s : best));
  return Math.sqrt(d2(p, near.point) / OLD_AXES.length) <= NEAR_STYLE + 1e-9 ? near.mood : moodOf(oldMode(p));
}

/** An old point on the new axes: `bite` its articulation, and `mood` (`oldMood`), unless a point speaks to no mood. */
export function newPoint(p: OldPoint, mood = true): { sync: number; harm: number; bite: number; mood?: number } {
  return { sync: p.sync, harm: p.harm, bite: p.artic, ...(mood ? { mood: oldMood(p) } : {}) };
}

/** An axis's value as written: a number, a slider, a range, moved by cells: up to the next word that isn't one of them. */
function valueAt(code: string, from: number): number {
  let i = from;
  const term = () => {
    if (code.startsWith('free(', i)) {
      let depth = 0;
      for (; i < code.length; i++) {
        if (code[i] === '(') depth++;
        else if (code[i] === ')' && --depth === 0) return void i++;
      }
      return;
    }
    const m = /&?\(?[A-Za-z0-9_.\-[\]$]+/y;
    m.lastIndex = i;
    if (m.test(code)) i = m.lastIndex;
  };
  term();
  for (;;) {
    const op = /\s*(\.\.|\*|±|\+-)\s*/y;
    op.lastIndex = i;
    if (!op.test(code)) return i;
    i = op.lastIndex;
    term();
  }
}

/** The first number an axis's value holds: where it sits, held. */
const heldAt = (value: string): number => parseFloat(/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/.exec(value)?.[0] ?? '0.5');
const plain = (value: string) => /^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(value);

/** One map=style body (what follows `map=style`, to the line's or the inline cell's end) on the new axes, or null. */
function restyleBody(body: string): string | null {
  // (by name: each old axis's value as written)
  const named = new Map<string, { at: number; end: number; value: string }>();
  for (const k of OLD_AXES) {
    const m = new RegExp(`(^|\\s)${k}=`).exec(body);
    if (!m) continue;
    const at = m.index + m[1]!.length;
    const end = valueAt(body, at + k.length + 1);
    named.set(k, { at, end, value: body.slice(at + k.length + 1, end) });
  }
  if (named.has('artic') || named.has('energy')) {
    if (!OLD_AXES.every((k) => named.has(k))) return null;
    const v = (k: (typeof OLD_AXES)[number]) => named.get(k)!.value;
    const old = Object.fromEntries(OLD_AXES.map((k) => [k, heldAt(v(k))])) as OldPoint;
    const bite = v('artic');
    const mood = text(oldMood(old));
    // (from the end, so each place holds: artic's value becomes bite's, energy's mood's)
    const [a, e] = [named.get('artic')!, named.get('energy')!];
    const edits = [
      { at: a.at, end: a.end, to: `bite=${bite}` },
      { at: e.at, end: e.end, to: `mood=${mood}` },
    ].sort((x, y) => y.at - x.at);
    return edits.reduce((s, x) => s.slice(0, x.at) + x.to + s.slice(x.end), body);
  }
  // (in order: four values, each a number or a slider), written by name, so a text migrated is read the same once more
  const tokens = /^\s+((?:free\([^)]*\)|\S)+)\s+((?:free\([^)]*\)|\S)+)\s+((?:free\([^)]*\)|\S)+)\s+((?:free\([^)]*\)|\S)+)(?=\s*(?:$|\)|\s+[a-z]+=))/.exec(body);
  if (!tokens || !tokens.slice(1).every((t) => plain(t) || t.startsWith('free('))) return null;
  const [s, h, ar, en] = tokens.slice(1) as [string, string, string, string];
  const old = { sync: heldAt(s), harm: heldAt(h), artic: heldAt(ar), energy: heldAt(en) };
  return ` sync=${s} harm=${h} bite=${ar} mood=${text(oldMood(old))}${body.slice(tokens[0].length)}`;
}

/** A line's code on the new axes (its style cells, inline ones too, and its picks of `[artic]` and `[energy]`), or null. */
export function restyled(code: string): string | null {
  let out = code.replace(/\[(artic|energy)\]/g, '[bite]');
  // (each map=style: a line's own, or an inline cell's, &(map=style …), its body to the cell's close)
  const at = [...out.matchAll(/map=style(?=\s)/g)].map((m) => m.index! + 'map=style'.length).reverse();
  for (const i of at) {
    const close = out.lastIndexOf('&(', i) > out.lastIndexOf(')', i) && out.lastIndexOf('&(', i) >= 0 ? matching(out, out.lastIndexOf('&(', i) + 1) : -1;
    const end = close >= 0 ? close : out.length;
    const body = restyleBody(out.slice(i, end));
    if (body !== null) out = out.slice(0, i) + body + out.slice(end);
  }
  return out === code ? null : out;
}

/** The index of the `)` closing the `(` at `open`. */
function matching(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')' && --depth === 0) return i;
  }
  return s.length;
}

/** Is a line's code written on the old axes: a style cell by name or a pick of a retired axis? (by order is ambiguous) */
export const writesOldAxes = (code: string): boolean => /(?:^|\s)(?:artic|energy)=|\[(?:artic|energy)\]/.test(code) && /map=style|\[(?:artic|energy)\]/.test(code);

/** Each line with a style on the old axes: written on the new. */
export function axes(source: string): Rewrite<'axes'>[] {
  return source.split('\n').flatMap((raw, i) => {
    const [code, comment] = splitComment(raw);
    if (!/^\s*&/.test(code)) return [];
    const after = restyled(code);
    if (after === null) return [];
    return [
      {
        id: `axes:${i + 1}`,
        tool: 'migrate' as const,
        rule: 'axes' as const,
        title: `a style on the axes sync harm bite mood: bite its articulation, mood its style's or its mode's (decision 076)`,
        before: code.trim(),
        after: after.trim(),
        apply: (src: string) =>
          src
            .split('\n')
            .map((l, j) => (j === i && l === raw ? after + comment : l))
            .join('\n'),
        exact: true as const,
      },
    ];
  });
}
