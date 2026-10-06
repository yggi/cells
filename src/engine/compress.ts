/**
 * Shorten: read the code like a linter, find what's written out longhand, and
 * offer it shorter — the measure is the code's length, the promise that it
 * sounds the same.
 *
 *  - runs:      0 0 0 0             → 0!4
 *  - phrases:   a phrase written twice or more (anywhere) becomes a cell of its own,
 *               used where it was: exactly (&m), backwards (&m[::-1]), or — where the
 *               numbers are steps of a grid — transposed (&m^7)
 *               — or turned round its helix (&m[>>2]: begun two steps on, the steps that
 *               wrap round climbing a lap)
 *  - fractions: every step's length shares a factor (4@2 2@2 0@4): divide it out,
 *               and slow the clock to match (4 2 0@2, step=&bar*2)
 *  - the same:  two cells written exactly alike: one, used by both names' users
 *
 * Each suggestion carries its rewrite; its saving is measured on the result.
 */
import { compileSource } from './compile';
import { codeShifts } from './program';
import { period } from './helix';
import { attrsOf, declLine, declWords, deleteCell, freshName, setAttr, setBraid, spansLines } from './edit';
import { flatten } from './flatten';

export interface Suggestion {
  readonly id: string;
  readonly kind: 'run' | 'phrase' | 'fraction' | 'same';
  /** In a sentence: what it does. */
  readonly title: string;
  /** What was written, and what it becomes (short excerpts). */
  readonly before: string;
  readonly after: string;
  /** Characters saved. */
  readonly saving: number;
  readonly apply: (source: string) => string;
}

const NOTE = /^(-?[0-9]+)((?:@[0-9]+)?)$/; // a plain step: a whole number, perhaps held (transposable)
/** A phrase worth a name has at least four steps … */
const MIN_PHRASE = 4;
/** … and saves at least this much beyond its own line: a new name is something to look up (a toll for reading). */
const TOLL = 12;

/** The cells whose steps are written out one by one, and safe to rewrite. */
function candidates(source: string) {
  const r = compileSource(source);
  const readAsTable = new Set([...r.cells.values()].flatMap((c) => (c.over ? [c.over] : [])));
  const out: { name: string; tokens: string[]; grid: boolean }[] = [];
  for (const c of r.cells.values()) {
    if (c.lambda || c.implicit || c.voice || c.mix || c.sink || c.kit || c.note || c.map) continue;
    if (readAsTable.has(c.name) || spansLines(source, c.name)) continue;
    const w = declWords(source, c.name);
    if (!w || w.braid.length < 2 || w.braid.some((t) => t.startsWith('[') && t.includes('&'))) continue;
    // transposable: its numbers are steps of a grid (no table between them and it)
    const over = c.over ? r.cells.get(c.over) : null;
    out.push({ name: c.name, tokens: w.braid, grid: !over || !!over.root });
  }
  return { result: r, cells: out };
}

const measured = (source: string, s: Omit<Suggestion, 'saving'>): Suggestion | null => {
  try {
    const next = s.apply(source);
    const saving = source.length - next.length;
    return saving > 0 && next !== source ? { ...s, saving } : null;
  } catch {
    return null;
  }
};

/** Runs: the same step written again and again. */
function runs(source: string, cells: ReturnType<typeof candidates>['cells']): Suggestion[] {
  const out: Suggestion[] = [];
  for (const c of cells) {
    const next: string[] = [];
    const shown: string[] = [];
    for (let i = 0; i < c.tokens.length;) {
      let k = 1;
      while (i + k < c.tokens.length && c.tokens[i + k] === c.tokens[i]) k++;
      const t = c.tokens[i];
      if (k >= 2 && !t.includes('!')) {
        next.push(`${t}!${k}`);
        if (shown.length < 2) shown.push(`${Array(Math.min(k, 4)).fill(t).join(' ')}${k > 4 ? ' …' : ''} → ${t}!${k}`);
      } else for (let j = 0; j < k; j++) next.push(t);
      i += k;
    }
    if (next.length === c.tokens.length) continue;
    const s = measured(source, {
      id: `run:${c.name}`,
      kind: 'run',
      title: `Runs in &${c.name}: the same step again and again, counted`,
      before: shown.map((x) => x.split(' → ')[0]).join('   '),
      after: shown.map((x) => x.split(' → ')[1]).join('   '),
      apply: (src) => setBraid(src, c.name, next),
    });
    if (s) out.push(s);
  }
  return out;
}

/** Phrases written more than once (exactly, backwards, or transposed): one cell, used where they were. */
function phrases(source: string, cells: ReturnType<typeof candidates>['cells']): Suggestion[] {
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
  const r0 = compileSource(source);
  const laps = new Map(cells.map((c) => [c.name, period(r0, c.name)]));
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
    if (!c.grid) continue;
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
        if (d !== 0 && grid.get(o.cell) && list.every((x) => grid.get(x.cell))) take(o.cell, o.at, `^${d}`);
      }
    if (occs.length < 2) continue;
    // a rough saving, to rank (each is measured exactly once it's a suggestion)
    const saving = occs.reduce((a, o) => a + key.length - (3 + o.ref.length), 0) - (key.length + 6);
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
        for (const o of f.occs.filter((x) => x.cell === cell).sort((a, b) => b.at - a.at)) ts.splice(o.at, f.tokens.length, `&${name}${o.ref}`);
        next = setBraid(next, cell, ts);
      }
      return next;
    };
    const ways = [
      ...new Set(f.occs.map((o) => (o.ref === '' ? 'as written' : o.ref === '[::-1]' ? 'backwards' : o.ref.startsWith('^') ? `transposed ${o.ref}` : `turned ${o.ref}`))),
    ];
    const turnedAny = f.occs.some((o) => o.ref.startsWith('[>>') || o.ref.startsWith('[<<'));
    const s = measured(source, {
      id: `phrase:${f.key}`,
      kind: 'phrase',
      title: `A phrase written ${f.occs.length} times (${ways.join(', ')}) in ${[...new Set(f.occs.map((o) => `&${o.cell}`))].join(', ')}: one cell, used where it was`,
      before: f.key.length > 48 ? f.key.slice(0, 47) + '…' : f.key,
      after: f.occs.map((o) => `&m${o.ref}`).join(' … '),
      apply,
    });
    // (a turn's climb depends on the table it's read through: checked, note for note, before it's offered)
    if (s && s.saving >= TOLL && (!turnedAny || sameNotes(source, s.apply(source), [...new Set(f.occs.map((o) => o.cell))]))) out.push(s);
  }
  return out;
}

/** Do these cells play the same notes (value, place, length) in both programs? */
function sameNotes(a: string, b: string, names: readonly string[]): boolean {
  try {
    const ra = compileSource(a);
    const rb = compileSource(b);
    if (!rb.ok) return false;
    const notes = (r: typeof ra, n: string) =>
      flatten(r, n, codeShifts(r))
        .map((e) => `${e.step.toFixed(6)}:${e.duration.toFixed(6)}:${e.value + e.alter + (e.transpose ?? 0)}:${e.table}`)
        .join(' ');
    return names.every((n) => notes(ra, n) === notes(rb, n));
  } catch {
    return false;
  }
}

/** Cells written exactly alike: one is enough — its users read the other. */
function sameCells(source: string, result: ReturnType<typeof compileSource>): Suggestion[] {
  const out: Suggestion[] = [];
  const byText = new Map<string, string[]>();
  for (const c of result.cells.values()) {
    if (c.lambda || c.implicit || c.voice || c.note || c.sink || spansLines(source, c.name)) continue;
    // (what a mix plays directly stays itself: merged, two outputs would become one at double gain)
    if (result.outputs.some((o) => o.cell === c.name)) continue;
    const line = source.split('\n')[declLine(source, c.name)] ?? '';
    const body = line
      .replace(/^&[A-Za-z_][A-Za-z0-9_]*\s*/, '')
      .replace(/\s+#.*$/, '')
      .trim();
    if (!body || /[?|]/.test(body)) continue; // (chance keys on names: merging would throw differently)
    byText.set(body, [...(byText.get(body) ?? []), c.name]);
  }
  for (const [body, names] of byText) {
    if (names.length < 2) continue;
    const [keep, ...gone] = names;
    const apply = (src: string) => {
      let next = src;
      for (const g of gone) {
        next = deleteCell(next, g);
        next = next.replace(new RegExp(`&${g}(?![A-Za-z0-9_])`, 'g'), `&${keep}`);
      }
      return next;
    };
    const s = measured(source, {
      id: `same:${names.join(',')}`,
      kind: 'same',
      title: `${names.map((n) => `&${n}`).join(' and ')} are written exactly alike: keep &${keep}, and use it for both`,
      before: `${gone.map((g) => `&${g}`).join(' ')} ${body.length > 40 ? body.slice(0, 39) + '…' : body}`,
      after: `&${keep}`,
      apply,
    });
    if (s) out.push(s);
  }
  return out;
}

/** Shorten again and again — the best each time — until nothing more pays. */
export function shortenAll(source: string, rounds = 60): { source: string; steps: string[] } {
  let now = source;
  const steps: string[] = [];
  for (let i = 0; i < rounds; i++) {
    const best = shorten(now)[0];
    if (!best) break;
    const next = best.apply(now);
    if (next.length >= now.length) break;
    steps.push(`−${best.saving}: ${best.title}`);
    now = next;
  }
  return { source: now, steps };
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Fractions: every step held a multiple of some n — divide it out, and slow the clock instead. */
function fractions(source: string, cells: ReturnType<typeof candidates>['cells'], result: ReturnType<typeof compileSource>): Suggestion[] {
  const out: Suggestion[] = [];
  for (const c of cells) {
    // only what nothing else splices in, steps by, reads or is shaped by (they'd hear the lengths) — a mix
    // playing it is fine — and without chance (it keys on positions)
    const leaning = [...result.cells.values()].some(
      (x) =>
        x.name !== c.name &&
        (x.over === c.name ||
          x.step?.driver === c.name ||
          x.env === c.name ||
          x.pitch === c.name ||
          x.units.some((u) => u.atom.kind === 'ref' && u.atom.name === c.name) ||
          Object.values(x.paramCells ?? {}).some((p) => p.factors.includes(c.name))),
    );
    if (leaning || result.outputs.some((o) => o.mods.some((m) => m.cell === c.name) || o.levels.some((l) => l.cell === c.name))) continue;
    if (c.tokens.some((t) => t.includes('&') || t.includes('?') || t.includes('|'))) continue;
    const cell = result.cells.get(c.name);
    const attrs = attrsOf(source, c.name);
    const step = attrs.get('step');
    if (!cell || !step || attrs.has('stride') || attrs.has('cycle') || cell.loops) continue;
    const held = c.tokens.map((t) => {
      const m = /@([0-9]+)/.exec(t);
      return m ? +m[1] : 1;
    });
    const g = held.reduce(gcd);
    if (g < 2) continue;
    // the clock, slowed by g: &x*n/d becomes &x*(n·g)/d, reduced; a plain rate divides
    let slower: string | null = null;
    const driven = /^&([A-Za-z_][A-Za-z0-9_]*)(?:\*([0-9]+))?(?:\/([0-9]+))?$/.exec(step);
    if (driven) {
      let n = (driven[2] ? +driven[2] : 1) * g;
      let d = driven[3] ? +driven[3] : 1;
      const k = gcd(n, d);
      n /= k;
      d /= k;
      slower = `&${driven[1]}${n > 1 ? `*${n}` : ''}${d > 1 ? `/${d}` : ''}`;
    } else if (/^[0-9]*\.?[0-9]+$/.test(step)) slower = String(+(+step / g).toFixed(6));
    if (!slower) continue;
    const next = c.tokens.map((t, i) => t.replace(/@[0-9]+/, held[i] / g > 1 ? `@${held[i] / g}` : ''));
    const s = measured(source, {
      id: `fraction:${c.name}`,
      kind: 'fraction',
      title: `&${c.name}: every step is held ${g}× or more — divide by ${g}, and step ${g}× slower`,
      before: `step=${step}  ${c.tokens.slice(0, 5).join(' ')}${c.tokens.length > 5 ? ' …' : ''}`,
      after: `step=${slower}  ${next.slice(0, 5).join(' ')}${next.length > 5 ? ' …' : ''}`,
      apply: (src) => setAttr(setBraid(src, c.name, next), c.name, 'step', slower),
    });
    if (s) out.push(s);
  }
  return out;
}

/** Everything that could be written shorter, the largest saving first. */
export function shorten(source: string): Suggestion[] {
  const { result, cells } = candidates(source);
  if (!result.ok) return [];
  return [...runs(source, cells), ...phrases(source, cells), ...fractions(source, cells, result), ...sameCells(source, result)].sort((a, b) => b.saving - a.saving);
}
