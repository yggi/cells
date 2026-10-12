/**
 * A disentangler (docs/notes/fold.md): lifting's predict and update. A long phrase that comes back nearly the same — a
 * step changed, the last note held longer, transposed or not — is the phrase (the prediction) and what differs there
 * (the residual): written once as a cell of its own, the phrase at its own length, and at each return as that cell
 * spliced (`&m1^$-12`) or, where steps differ, a copy of it with the steps that do (`&v1 base=&m1 _!3 12@2`, decision
 * 026). BWV 847's subject, entered seven times, each a little bent.
 */
import type { Folded, Rule, Tok, Tool } from './ir';
import { elementText, isElement } from './transpose';

/** A phrase: at least this many steps; at most this many changed where it returns: two, or a sixth of it. */
const SHORTEST = 8;
const CHANGES = (n: number) => Math.max(2, Math.floor(n / 6));
/**
 * A phrase said as a phrase is worth this much (characters, a step a return it explains) beyond what it saves: the
 * preference for structure. Measured by the ratchet (`fold/ratchet.test.ts`): 2 brings BWV 847's whole subject back
 * (its head, where the entries bend, included), more changes nothing.
 */
const SAID = 2;
/** Seeds: this many steps alike start a comparison; a seed heard more often than this is a run, left to pairs. */
const SEED = 5;
const COMMON = 48;
/** The longest phrase tried (steps). */
const LONGEST = 64;

/** Where a step is: a line and a place in it. */
type At = { line: number; i: number };

/** Each line's steps compared in shape: the key, and the base against the first pitched step's. */
export const variants: Tool = (f: Folded) => {
  const lines = f.lines.map((l) => [...l.toks]);
  const used = lines.map((t) => t.map(() => false));
  const rules = new Map(f.rules);
  let next = Math.max(0, ...[...rules.keys()].map((k) => Number(k.slice(1)) || 0)) + 1;
  let made = 0;
  const text = (t: Tok) => elementText(t.key, t.base).length + 1;

  /** How a window compares with another: the steps that differ (null: too many, or not all steps there). */
  const compare = (p: At, q: At, n: number): { diff: boolean[]; by: number } | null => {
    const a = lines[p.line]!;
    const b = lines[q.line]!;
    const ua = used[p.line]!;
    const ub = used[q.line]!;
    if (p.i + n > a.length || q.i + n > b.length) return null;
    const most = CHANGES(n);
    // (shapes first: most places differ in a few steps, and stop there)
    let shapes = 0;
    // (every step of both windows is there: checked above)
    for (let j = 0; j < n; j++) {
      const x = a[p.i + j]!;
      const y = b[q.i + j]!;
      if (!isElement(x.key) || !isElement(y.key) || ua[p.i + j] || ub[q.i + j]) return null;
      if (x.key !== y.key && ++shapes > most) return null;
    }
    // the transposition: what most steps of the same shape agree on
    const votes = new Map<number, number>();
    for (let j = 0; j < n; j++) {
      const x = a[p.i + j]!;
      const y = b[q.i + j]!;
      if (x.key === y.key && x.base !== null && y.base !== null) votes.set(y.base - x.base, (votes.get(y.base - x.base) ?? 0) + 1);
    }
    let by = 0;
    let top = -1;
    for (const [d, c] of votes) if (c > top) [by, top] = [d, c];
    let changed = 0;
    const diff = new Array<boolean>(n);
    for (let j = 0; j < n; j++) {
      const x = a[p.i + j]!;
      const y = b[q.i + j]!;
      diff[j] = x.key !== y.key || (x.base === null) !== (y.base === null) || (x.base !== null && y.base! - x.base !== by);
      if (diff[j] && ++changed > most) return null;
    }
    return { diff, by };
  };

  for (let round = 0; round < 32; round++) {
    // seeds: SEED steps alike in shape, anywhere
    const seeds = new Map<string, At[]>();
    lines.forEach((toks, line) => {
      for (let i = 0; i + SEED <= toks.length; i++) {
        const w = toks.slice(i, i + SEED);
        if (w.some((t, j) => !isElement(t.key) || used[line]![i + j])) continue;
        const b0 = w.find((t) => t.base !== null)?.base ?? 0;
        const key = w.map((t) => `${t.key}/${t.base === null ? '' : t.base - b0}`).join(' ');
        seeds.set(key, [...(seeds.get(key) ?? []), { line, i }]);
      }
    });
    // each place a seed comes again: how long a phrase the first one starts, grown step by step while the steps
    // agree but for a few (at the seed's transposition); the phrases found most often, longest, scored in full
    const found = new Map<string, { proto: At; n: number; score: number }>();
    for (const places of seeds.values()) {
      if (places.length < 2 || places.length > COMMON) continue;
      const proto = places[0]!;
      const a = lines[proto.line]!;
      for (const q of places.slice(1)) {
        if (q.line === proto.line && q.i < proto.i + SEED) continue;
        const b = lines[q.line]!;
        const pitched = a.slice(proto.i, proto.i + SEED).findIndex((t) => t.base !== null);
        const by = pitched < 0 ? 0 : b[q.i + pitched]!.base! - a[proto.i + pitched]!.base!;
        let n = SEED;
        let changed = 0;
        for (;;) {
          const [x, y] = [a[proto.i + n], b[q.i + n]];
          if (!x || !y || !isElement(x.key) || !isElement(y.key) || used[proto.line]![proto.i + n] || used[q.line]![q.i + n]) break;
          if (q.line === proto.line && proto.i + n + 1 > q.i) break;
          const differs = x.key !== y.key || (x.base === null) !== (y.base === null) || (x.base !== null && y.base! - x.base !== by);
          if (differs && changed + 1 > CHANGES(n + 1)) break;
          changed += +differs;
          n++;
        }
        // (a phrase that ends on a change ends before it)
        while (n > SEED && compare(proto, q, n)?.diff[n - 1]) n--;
        if (n < SHORTEST) continue;
        const key = `${proto.line}:${proto.i}:${n}`;
        const hit = found.get(key);
        found.set(key, { proto, n, score: (hit?.score ?? n) + n });
      }
    }
    let best: { proto: At; n: number; returns: { at: At; diff: boolean[]; by: number }[]; gain: number } | null = null;
    /** Every return of a phrase, not overlapping it or each other. */
    const returnsOf = (proto: At, n: number) => {
      const out: { at: At; diff: boolean[]; by: number }[] = [];
      lines.forEach((toks, line) => {
        for (let i = 0; i + n <= toks.length; i++) {
          if (line === proto.line && i < proto.i + n && i + n > proto.i) continue;
          const c = compare(proto, { line, i }, n);
          if (!c) continue;
          out.push({ at: { line, i }, ...c });
          i += n - 1;
        }
      });
      return out;
    };
    /** What writing a phrase once and its returns as it (or copies of it) saves, in characters. */
    const gainOf = (proto: At, n: number, returns: readonly { at: At; diff: boolean[]; by: number }[]) => {
      const written = lines[proto.line]!.slice(proto.i, proto.i + n).reduce((m, t) => m + text(t), 0);
      const cost = returns.reduce(
        (m, r) => {
          const changed = r.diff.filter(Boolean).length;
          return m + (changed ? 22 + 6 * changed + lines[r.at.line]!.slice(r.at.i, r.at.i + n).reduce((k, t, j) => k + (r.diff[j] ? text(t) : 0), 0) : 9);
        },
        9 + written + 6,
      );
      return (returns.length + 1) * written - cost + SAID * n * returns.length;
    };
    for (const first of [...found.values()].sort((x, y) => y.score - x.score).slice(0, 4)) {
      let { proto, n } = first;
      let returns = returnsOf(proto, n);
      // the phrase as its family has it, grown either way while it returns as often (its changes within bounds): at
      // each length the place the others differ from least is the phrase (a bent entry heard first isn't the subject)
      const bestAt = (n: number, shift: number) => {
        let pick: { proto: At; returns: { at: At; diff: boolean[]; by: number }[]; apart: number } | null = null;
        for (const o of [proto, ...returns.map((r) => r.at)]) {
          const p = { line: o.line, i: o.i + shift };
          if (p.i < 0 || p.i + n > lines[p.line]!.length) continue;
          const rs = returnsOf(p, n);
          const apart = rs.reduce((m, r) => m + r.diff.filter(Boolean).length, 0);
          if (!pick || rs.length > pick.returns.length || (rs.length === pick.returns.length && apart < pick.apart)) pick = { proto: p, returns: rs, apart };
        }
        return pick;
      };
      const start = bestAt(n, 0);
      if (start) [proto, returns] = [start.proto, start.returns];
      // grown either way, as long as it returns at all: the length that saves the most is the phrase (a return that
      // changes too much at full length drops out and is written as it is, if that pays)
      // (only lengths where something returns changed: exact returns alone are pairs' to fold, shared across lines)
      const worth = (rs: typeof returns, g: number) => (rs.some((r) => r.diff.some(Boolean)) ? g : -Infinity);
      let top = { proto, n, returns, gain: worth(returns, gainOf(proto, n, returns)) };
      const family = returns.length;
      while (n < LONGEST) {
        let step: { proto: At; returns: { at: At; diff: boolean[]; by: number }[] } | null = null;
        for (const shift of [0, -1]) {
          const next = bestAt(n + 1, shift);
          if (next && next.returns.length && (!step || next.returns.length > step.returns.length)) step = next;
        }
        // (until the family is half what it was: a phrase longer than its returns isn't theirs)
        if (!step || 2 * step.returns.length < family) break;
        [proto, returns] = [step.proto, step.returns];
        n++;
        const gain = worth(returns, gainOf(proto, n, returns));
        if (gain > top.gain) top = { proto, n, returns, gain };
      }
      if (top.gain > 0 && (!best || top.gain > best.gain)) best = top;
    }
    if (!best) break;
    // the phrase as a cell, its returns as it or copies of it
    const { proto, n } = best;
    const steps = lines[proto.line]!.slice(proto.i, proto.i + n);
    const base = steps.find((t) => t.base !== null)?.base ?? null;
    const kidsOf = (toks: readonly Tok[], b: number | null) => toks.map((t) => ({ key: t.key, off: t.base === null ? null : t.base - (b ?? 0) }));
    const phrase: Rule = { key: `s${next++}`, kids: kidsOf(steps, base) };
    rules.set(phrase.key, phrase);
    const replace: { at: At; tok: Tok }[] = [{ at: proto, tok: { key: phrase.key, base } }];
    for (const r of best.returns) {
      const toks = lines[r.at.line]!.slice(r.at.i, r.at.i + n);
      if (!r.diff.some(Boolean)) {
        replace.push({ at: r.at, tok: { key: phrase.key, base: base === null ? null : base + r.by } });
        continue;
      }
      const b = toks.find((t) => t.base !== null)?.base ?? null;
      const v: Rule = { key: `s${next++}`, kids: kidsOf(toks, b), of: phrase.key, patched: r.diff };
      rules.set(v.key, v);
      replace.push({ at: r.at, tok: { key: v.key, base: b } });
    }
    // (later places first, so earlier ones keep their indices)
    for (const { at, tok } of replace.sort((x, y) => y.at.line - x.at.line || y.at.i - x.at.i)) {
      lines[at.line]!.splice(at.i, n, tok);
      used[at.line]!.splice(at.i, n, true);
    }
    made++;
  }
  return made ? { ...f, lines: f.lines.map((l, i) => ({ ...l, toks: lines[i]! })), rules } : null;
};
