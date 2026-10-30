/**
 * Phrases: a phrase written twice or more (anywhere) becomes a cell of its own, used
 * where it was: exactly (&m), backwards (&m[::-1]), or — where the numbers are steps of
 * a grid — transposed (&m^$7), or where they are steps of a table, moved by degrees
 * (&m^2: the same shape two steps up the scale), or turned round its helix (&m[>>2]: begun two steps on,
 * the steps that wrap round climbing a lap). What repeats, as written, moved or backwards, is the folder's to find
 * (`writtenHints`, #158: one finder for Shorten and the import); the turns, which climb by a table's lap, are looked up
 * here, and the rewrite and its saving are Shorten's.
 */
import { period } from '../helix';
import { declLine, freshName, setBraid } from '../edit';
import { sameNotes } from '../sameness';
import type { CompileOptions } from '../program';
import { writtenHints } from '../fold/hints';
import { saves, type Candidate, type Result, type ShortenRewrite } from './harness';

const NOTE = /^(-?[0-9]+)((?:@[0-9]+)?)$/; // a plain step: a whole number, perhaps held (transposable)
/** A phrase worth a name has at least four steps (the folder's hints find three or more) … */
const MIN_PHRASE = 4;
/** … and at most sixteen: a longer one is two. */
const MAX_PHRASE = 16;
/** … and saves at least this much beyond its own line: a new name is something to look up (a toll for reading). */
const TOLL = 12;
const use = (name: string, ref: string) => `&${name}${ref}`;
/** … and is looked up turned when it is at most twelve (a lap of the chromatic grid). */
const MAX_TURN = 12;

/** A phrase's turns round a helix whose lap is `lap`: begun k steps on, the k that wrap climbing a lap (`[>>k]`), or back (`[<<k]`). */
function turnsOf(tokens: readonly string[], lap: number): { key: string; ref: string }[] {
  const L = tokens.length;
  if (L > MAX_TURN) return [];
  const climb = (t: string, by: number) => {
    const m = NOTE.exec(t);
    return m ? `${+m[1] + by}${m[2]}` : t.startsWith('~') ? t : null;
  };
  const key = tokens.join(' ');
  const out: { key: string; ref: string }[] = [];
  for (let k = 1; k < L; k++)
    for (const dir of ['>>', '<<'] as const) {
      const turned =
        dir === '>>' ? [...tokens.slice(k), ...tokens.slice(0, k).map((t) => climb(t, lap))] : [...tokens.slice(L - k).map((t) => climb(t, -lap)), ...tokens.slice(0, L - k)];
      if (turned.some((t) => t === null) || turned.join(' ') === key) continue;
      out.push({ key: turned.join(' '), ref: `[${dir}${k === 1 ? '' : k}]` });
    }
  return out;
}

/** An occurrence moved by degrees (`^d`), not grid steps (`^$d`). */
const isDegree = (ref: string) => ref.startsWith('^') && !ref.startsWith('^$');

/** Phrases written more than once (exactly, backwards, or transposed): one cell, used where they were. */
export function phrases(source: string, cells: readonly Candidate[], result: Result, options: CompileOptions = {}): ShortenRewrite[] {
  type Occ = { cell: string; at: number; ref: string };
  // (not in a cell another copies, base=&x: a copy counts its base's steps, =!3, so a phrase cut out of the base
  // would move every copy's changes; nor in a copy, whose steps are changes to its base's)
  const copied = new Set([...source.matchAll(/\bbase=&(\w+)/g)].map((m) => m[1]));
  cells = cells.filter((c) => !copied.has(c.name) && !new RegExp(`^&${c.name}\\b[^\\n]*\\bbase=&`, 'm').test(source));
  const found: { key: string; tokens: string[]; occs: Occ[]; saving: number }[] = [];
  const grid = new Map(cells.map((c) => [c.name, c.grid]));
  // each cell's lap: how far a step that wraps round climbs (its table's period)
  const laps = new Map(cells.map((c) => [c.name, period(result, c.name)]));
  const lapValues = [...new Set(laps.values())];
  const tokensOf = new Map(cells.map((c) => [c.name, c.tokens]));
  // what repeats, as written, moved or backwards: the folder's hints over the cells as written (#158), one finder for
  // both tools. Every window of a repeat is one too, at its places shifted, so a phrase is any of them, whichever saves
  // most (a figure that comes back may be begun on any of its notes)
  const windows = new Map<string, { tokens: string[]; places: Occ[] }>();
  for (const h of writtenHints(cells)) {
    const first = h.spans[0]!;
    const whole = tokensOf.get(first.line)!.slice(first.from, first.to);
    for (let L = MIN_PHRASE; L <= Math.min(MAX_PHRASE, whole.length); L++)
      for (let k = 0; k + L <= whole.length; k++) {
        const tokens = whole.slice(k, k + L);
        if (tokens.every((t) => t === tokens[0])) continue; // (that's a run)
        // (a transposition moves every step it reads, so only a phrase of numbers, and rests, is moved: the finder
        // matches a chord or a reference as written, and keeps it where it is)
        const moves = tokens.every((t) => NOTE.test(t) || /^~(@\d+)?$/.test(t));
        // (the cell may be written as any of its places is, the others moved from it: each is weighed, as its text
        // and the references it makes are shorter or longer)
        const anchors = h.spans.flatMap((sp, i) => {
          const t = h.transforms[i]!;
          return t.kind === 'reversed' || (t.kind === 'transposed' && !moves) ? [] : [{ cell: sp.line, at: sp.from + k, by: t.kind === 'same' ? 0 : t.by }];
        });
        for (const a of anchors) {
          const text = tokensOf.get(a.cell)!.slice(a.at, a.at + L);
          const key = text.join(' ');
          const w = windows.get(key) ?? { tokens: text, places: [] };
          // (moved by grid steps where the numbers are a grid's, wherever the cell is read; else by steps of its table:
          // degrees; backwards as it is, a reversal moved too being no reference of one step)
          h.spans.forEach((sp, i) => {
            const t = h.transforms[i]!;
            const by = (t.kind === 'same' ? 0 : t.by) - a.by;
            if (t.kind === 'reversed') {
              if (by === 0) w.places.push({ cell: sp.line, at: sp.to - k - L, ref: '[::-1]' });
            } else if (by === 0) w.places.push({ cell: sp.line, at: sp.from + k, ref: '' });
            else if (moves) w.places.push({ cell: sp.line, at: sp.from + k, ref: grid.get(sp.line) ? `^$${by}` : `^${by}` });
          });
          windows.set(key, w);
        }
      }
  }
  // (a phrase written once and turned once doesn't repeat as the hints read it: a turn climbs by its table's lap,
  // which only Shorten knows, so every window of four to twelve steps is a phrase where one of its turns is written)
  const at = new Map<string, Occ[]>();
  for (const c of cells)
    for (let L = MIN_PHRASE; L <= Math.min(MAX_TURN, c.tokens.length); L++)
      for (let i = 0; i + L <= c.tokens.length; i++) {
        const key = c.tokens.slice(i, i + L).join(' ');
        at.set(key, [...(at.get(key) ?? []), { cell: c.name, at: i, ref: '' }]);
      }
  for (const c of cells)
    for (let L = MIN_PHRASE; L <= Math.min(MAX_TURN, c.tokens.length); L++)
      for (let i = 0; i + L <= c.tokens.length; i++) {
        const tokens = c.tokens.slice(i, i + L);
        const key = tokens.join(' ');
        if (windows.has(key) || tokens.every((t) => t === tokens[0])) continue;
        const lap = laps.get(c.name)!;
        if (turnsOf(tokens, lap).some((t) => (at.get(t.key) ?? []).some((o) => laps.get(o.cell) === lap))) windows.set(key, { tokens, places: [{ cell: c.name, at: i, ref: '' }] });
      }
  for (const [key, { tokens, places }] of windows) {
    const L = tokens.length;
    // its occurrences: as written first, then moved, backwards, turned — none overlapping in a cell
    const taken = new Map<string, Set<number>>();
    const occs: Occ[] = [];
    const take = (cell: string, at: number, ref: string) => {
      const used = taken.get(cell) ?? new Set<number>();
      for (let j = at; j < at + L; j++) if (used.has(j)) return;
      for (let j = at; j < at + L; j++) used.add(j);
      taken.set(cell, used);
      occs.push({ cell, at, ref });
    };
    for (const o of [...places].sort((a, b) => +(a.ref !== '') - +(b.ref !== '') || a.cell.localeCompare(b.cell) || a.at - b.at)) take(o.cell, o.at, o.ref);
    // turned round the helix: begun k steps on ([>>k]: the k that wrap round climb a lap) or back
    // ([<<k]) — once per lap there is (12 on the chromatic grid, 7 in a scale …)
    for (const lap of lapValues) for (const turn of turnsOf(tokens, lap)) for (const o of at.get(turn.key) ?? []) if (laps.get(o.cell) === lap) take(o.cell, o.at, turn.ref);
    if (occs.length < 2) continue;
    // a rough saving, to rank (each is measured exactly once it's a suggestion)
    const saving = occs.reduce((a, o) => a + key.length - use('m1', o.ref).length, 0) - (key.length + 6);
    if (saving > 4) found.push({ key, tokens, occs, saving });
  }
  found.sort((a, b) => b.saving - a.saving || b.tokens.length - a.tokens.length);
  // keep the best, and none mostly covering the same steps as a better one
  const kept: typeof found = [];
  const covered = new Set<string>();
  for (const f of found) {
    const steps = f.occs.flatMap((o) => Array.from({ length: f.tokens.length }, (_, j) => `${o.cell}:${o.at + j}`));
    if (steps.filter((x) => covered.has(x)).length > steps.length / 2) continue;
    for (const x of steps) covered.add(x);
    kept.push(f);
    if (kept.length >= 8) break;
  }
  const out: ShortenRewrite[] = [];
  for (const f of kept) {
    const apply = (src: string) => {
      const name = freshName(src, 'm');
      // the new cell, just above the first cell that uses it
      const first = Math.min(...f.occs.map((o) => declLine(src, o.cell)));
      const lines = src.split('\n');
      lines.splice(first, 0, `&${name} ${f.key}`);
      let next = lines.join('\n');
      // each cell: its occurrences replaced, from the right (so the earlier places stay put)
      for (const cell of new Set(f.occs.map((o) => o.cell))) {
        const ts = [...tokensOf.get(cell)!];
        for (const o of f.occs.filter((x) => x.cell === cell).sort((a, b) => b.at - a.at)) ts.splice(o.at, f.tokens.length, use(name, o.ref));
        next = setBraid(next, cell, ts);
      }
      return next;
    };
    const ways = [
      ...new Set(
        f.occs.map((o) =>
          o.ref === ''
            ? 'as written'
            : o.ref === '[::-1]'
              ? 'backwards'
              : o.ref.startsWith('^$')
                ? `transposed ${o.ref}`
                : isDegree(o.ref)
                  ? `${o.ref.slice(1)} degrees`
                  : `turned ${o.ref}`,
        ),
      ),
    ];
    // (a turn's climb, and a degree's step, depend on the table it's read through: checked note for note)
    const turnedAny = f.occs.some((o) => o.ref.startsWith('[>>') || o.ref.startsWith('[<<') || isDegree(o.ref));
    const s: ShortenRewrite = {
      id: `phrase:${f.key}`,
      tool: 'shorten',
      rule: 'phrase',
      title: `A phrase written ${f.occs.length} times (${ways.join(', ')}) in ${[...new Set(f.occs.map((o) => `&${o.cell}`))].join(', ')}: one cell, used where it was`,
      before: f.key.length > 48 ? f.key.slice(0, 47) + '…' : f.key,
      after: f.occs.map((o) => use('m', o.ref)).join(' … '),
      apply,
    };
    // (a turn's climb depends on the table it's read through: checked, note for note, before it's offered)
    const saving = saves(source, s) ?? 0;
    if (saving >= TOLL && (!turnedAny || sameNotes(source, s.apply(source), [...new Set(f.occs.map((o) => o.cell))], options))) out.push(s);
  }
  return out;
}
