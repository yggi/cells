/**
 * Phrases: a phrase written twice or more (anywhere) becomes a cell of its own, used
 * where it was: exactly (&m), backwards (&m[::-1]), or — where the numbers are steps of
 * a grid — transposed (&m^7), or where they are steps of a table, moved by degrees
 * (degree(&m, 2): the same shape two steps up the scale), or turned round its helix (&m[>>2]: begun two steps on,
 * the steps that wrap round climbing a lap).
 */
import { period } from '../helix';
import { declLine, freshName, setBraid } from '../edit';
import { measured, sameNotes, type Candidate, type Result, type Suggestion } from './harness';

const NOTE = /^(-?[0-9]+)((?:@[0-9]+)?)$/; // a plain step: a whole number, perhaps held (transposable)
/** A phrase worth a name has at least four steps … */
const MIN_PHRASE = 4;
/** … and saves at least this much beyond its own line: a new name is something to look up (a toll for reading). */
const TOLL = 12;
/** An occurrence moved by degrees (its ref is written degree(&m, d), not a suffix). */
const DEGREE = '°';
const use = (name: string, ref: string) => (ref.startsWith(DEGREE) ? `degree(&${name}, ${ref.slice(1)})` : `&${name}${ref}`);

/** Phrases written more than once (exactly, backwards, or transposed): one cell, used where they were. */
export function phrases(source: string, cells: readonly Candidate[], result: Result): Suggestion[] {
  type Occ = { cell: string; at: number; ref: string };
  const found: { key: string; tokens: string[]; occs: Occ[]; saving: number }[] = [];
  const maxLen = 16;
  // every stretch of 2–16 steps, keyed as written
  const where = new Map<string, { cell: string; at: number }[]>();
  for (const c of cells)
    for (let L = MIN_PHRASE; L <= Math.min(maxLen, c.tokens.length); L++)
      for (let i = 0; i + L <= c.tokens.length; i++) {
        const key = c.tokens.slice(i, i + L).join(' ');
        const list = where.get(key) ?? [];
        list.push({ cell: c.name, at: i });
        where.set(key, list);
      }
  const grid = new Map(cells.map((c) => [c.name, c.grid]));
  // each cell's lap: how far a step that wraps round climbs (its table's period)
  const laps = new Map(cells.map((c) => [c.name, period(result, c.name)]));
  const lapValues = [...new Set(laps.values())];
  const tokensOf = new Map(cells.map((c) => [c.name, c.tokens]));
  // the same shape, transposed: whole numbers (perhaps held), keyed by their steps from the first
  const shapeOf = (ts: string[]) => {
    const m = ts.map((t) => NOTE.exec(t));
    if (m.some((x) => !x)) return null;
    const v0 = +m[0]![1];
    return { key: m.map((x) => `${+x![1] - v0}${x![2]}`).join(' '), first: v0 };
  };
  const byShape = new Map<string, { cell: string; at: number; first: number }[]>();
  for (const c of cells) {
    for (let L = MIN_PHRASE; L <= Math.min(maxLen, c.tokens.length); L++)
      for (let i = 0; i + L <= c.tokens.length; i++) {
        const sh = shapeOf(c.tokens.slice(i, i + L));
        if (!sh) continue;
        const list = byShape.get(sh.key) ?? [];
        list.push({ cell: c.name, at: i, first: sh.first });
        byShape.set(sh.key, list);
      }
  }
  for (const [key, list] of where) {
    const tokens = key.split(' ');
    const L = tokens.length;
    if (tokens.every((t) => t === tokens[0])) continue; // (that's a run)
    // its occurrences: as written, backwards, transposed — none overlapping in a cell
    const taken = new Map<string, Set<number>>();
    const occs: Occ[] = [];
    const take = (cell: string, at: number, ref: string) => {
      const used = taken.get(cell) ?? new Set<number>();
      for (let j = at; j < at + L; j++) if (used.has(j)) return;
      for (let j = at; j < at + L; j++) used.add(j);
      taken.set(cell, used);
      occs.push({ cell, at, ref });
    };
    for (const o of list) take(o.cell, o.at, '');
    const back = where.get([...tokens].reverse().join(' '));
    if (back && tokens.join(' ') !== [...tokens].reverse().join(' ')) for (const o of back) take(o.cell, o.at, '[::-1]');
    // turned round the helix: begun k steps on ([>>k]: the k that wrap round climb a lap) or back
    // ([<<k]) — once per lap there is (12 on the chromatic grid, 7 in a scale …), looked up directly
    if (L >= MIN_PHRASE && L <= 12)
      for (const lap of lapValues) {
        const climb = (t: string, by: number) => {
          const m = NOTE.exec(t);
          return m ? `${+m[1] + by}${m[2]}` : t.startsWith('~') ? t : null;
        };
        for (let k = 1; k < L; k++)
          for (const dir of ['>>', '<<'] as const) {
            const turned =
              dir === '>>' ? [...tokens.slice(k), ...tokens.slice(0, k).map((t) => climb(t, lap))] : [...tokens.slice(L - k).map((t) => climb(t, -lap)), ...tokens.slice(0, L - k)];
            if (turned.some((t) => t === null)) continue;
            const tkey = turned.join(' ');
            if (tkey === key) continue;
            for (const at of where.get(tkey) ?? []) if (laps.get(at.cell) === lap) take(at.cell, at.at, `[${dir}${k === 1 ? '' : k}]`);
          }
      }
    const sh = shapeOf(tokens);
    if (sh && L >= MIN_PHRASE)
      for (const o of byShape.get(sh.key) ?? []) {
        const d = o.first - sh.first;
        // (grid steps where the numbers are a grid's, wherever the cell is read; else steps of its table: degrees)
        if (d !== 0) take(o.cell, o.at, grid.get(o.cell) ? `^${d}` : `${DEGREE}${d}`);
      }
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
  const out: Suggestion[] = [];
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
              : o.ref.startsWith('^')
                ? `transposed ${o.ref}`
                : o.ref.startsWith(DEGREE)
                  ? `${o.ref.slice(1)} degrees`
                  : `turned ${o.ref}`,
        ),
      ),
    ];
    // (a turn's climb, and a degree's step, depend on the table it's read through: checked note for note)
    const turnedAny = f.occs.some((o) => o.ref.startsWith('[>>') || o.ref.startsWith('[<<') || o.ref.startsWith(DEGREE));
    const s = measured(source, {
      id: `phrase:${f.key}`,
      kind: 'phrase',
      title: `A phrase written ${f.occs.length} times (${ways.join(', ')}) in ${[...new Set(f.occs.map((o) => `&${o.cell}`))].join(', ')}: one cell, used where it was`,
      before: f.key.length > 48 ? f.key.slice(0, 47) + '…' : f.key,
      after: f.occs.map((o) => use('m', o.ref)).join(' … '),
      apply,
    });
    // (a turn's climb depends on the table it's read through: checked, note for note, before it's offered)
    if (s && s.saving >= TOLL && (!turnedAny || sameNotes(source, s.apply(source), [...new Set(f.occs.map((o) => o.cell))]))) out.push(s);
  }
  return out;
}
