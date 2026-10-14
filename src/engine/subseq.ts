/**
 * Subsequences (`[0 2 4]`, decision 027): a step that holds steps, squeezed into its own length, stacked with commas
 * (`[0 2, 4]`), and Strudel's other forms of one (#337): `<a b c>` one per lap, `x/n` slowed, `x(k,n,r)` struck by a
 * euclid, `[a b|c]` a choice of sequences. What every reading of a braid's timing shares: where each step inside plays
 * (`slots`), what a step holds at the bottom (`leaves`), and a step's numbers moved (`mapLeaves`).
 */
import type { Atom } from './ast';

/** An atom that isn't a subsequence: a note, a rest, a chord, a choice, a splice or a mix. */
export type Leaf = Exclude<Atom, { kind: 'seq' }>;

/** A step as the readings of a braid see it: a token or a unit. */
interface Step {
  readonly atom: Atom;
  readonly repeat: number;
  readonly subdivide: number;
  readonly elongate: number;
  readonly chance?: number | null;
  /** &x:0:g: a hit's own gain. */
  readonly level?: number;
}

/** What a step holds at the bottom, in order (a subsequence's steps, layer by layer, nested ones opened). */
export function leaves(a: Atom): Leaf[] {
  return a.kind === 'seq' ? a.layers.flatMap((l) => l.flatMap((t) => leaves(t.atom))) : [a];
}

/** Every step inside a subsequence, nested ones too, in order (none for any other atom). */
export function innerSteps<T extends Step>(a: Atom): T[] {
  return a.kind === 'seq' ? a.layers.flatMap((l) => l.flatMap((t) => [t as unknown as T, ...innerSteps<T>(t.atom)])) : [];
}

/** A step with each leaf moved by `f` (a subsequence keeps its shape). */
export function mapLeaves(a: Atom, f: (l: Leaf) => Atom): Atom {
  return a.kind === 'seq' ? { ...a, layers: a.layers.map((l) => l.map((t) => ({ ...t, atom: mapLeaves(t.atom, f) }))) } : f(a);
}

/** How many notes a step stands for, its repeats and ratchets counted, nested ones opened (`each`: a leaf's; a euclid's hits each as many). */
export function countOf(u: Step, each: (l: Leaf) => number): number {
  const a = u.atom;
  const one = a.kind === 'seq' ? a.layers.reduce((s, l) => s + l.reduce((x, t) => x + countOf(t, each), 0), 0) * (a.euclid?.k ?? 1) : each(a);
  return u.repeat * u.subdivide * one;
}

/** The laps a step sounds on: those where lap mod `of` is `is` (`<0 2>`: 0 on even laps, 2 on odd). */
export interface Laps {
  readonly of: number;
  readonly is: number;
}

/**
 * A choice of sequences a slot is in (`[0 2|4]`): it sounds when option `is` of `of` is drawn. The draw is thrown once
 * per lap of the choice's own frame, keyed on `id` and on where that lap of the frame begins: `lap` laps from the
 * slot's own lap, at step `at` (in the braid's steps).
 */
export interface Chosen {
  readonly id: string;
  readonly of: number;
  readonly is: number;
  readonly lap: number;
  readonly at: number;
}

/** One place a leaf plays in a braid: from `at` for `dur`, in the braid's steps. */
export interface Slot<A = Leaf> {
  readonly atom: A;
  readonly at: number;
  readonly dur: number;
  /** The x?p of the steps it is in, outermost first (null: the cell's chance=). */
  readonly chances: readonly (number | null)[];
  /** The step of the braid it is in (its index in `units`). */
  readonly top: number;
  /** Its gain (&x:0:g), times the gains of the steps it is in; none written: absent. */
  readonly level?: number;
  /** `<a b>`, `x/n`: the laps it sounds on (absent: every lap). */
  readonly laps?: Laps;
  /** `[a b|c]`: the choices it is in. */
  readonly chosen?: readonly Chosen[];
}

/**
 * A leaf's play, as Strudel queries a pattern (decision 027, #337): a lap of a step's frame is a lap of the cell (a
 * subsequence's steps see the lap their step sees, as Strudel's sequence passes its cycle on). Placed in the braid's
 * steps, from `at` for `dur` (a slowed step's can run past its lap, as Strudel's whole does), on the laps where
 * lap mod `of` is `is`, in the choices `picks`.
 */
export interface Hit<A> {
  readonly atom: A;
  readonly at: number;
  readonly dur: number;
  readonly of: number;
  readonly is: number;
  readonly chances: readonly (number | null)[];
  readonly level?: number;
  readonly picks: readonly Chosen[];
}

/** What a leaf holds in a frame from `at`, `dur` long: itself, once (flatten: a splice's notes). */
type LeafHits<A> = (a: Leaf, at: number, dur: number) => readonly Hit<A>[];

const EPS = 1e-9;
const floor = (x: number) => Math.floor(x + EPS);
const mod = (a: number, m: number) => ((a % m) + m) % m;
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
/** a⁻¹ mod m (a and m coprime). */
function inverse(a: number, m: number): number {
  let [r0, r1, t0, t1] = [mod(a, m), m, 1, 0];
  while (r1 !== 0) {
    const q = Math.floor(r0 / r1);
    [r0, r1, t0, t1] = [r1, r0 - q * r1, t1, t0 - q * t1];
  }
  return mod(t0, m);
}

/** A layer's length in its steps' holds and repeats. */
const weight = (layer: readonly Step[]) => layer.reduce((x, t) => x + t.elongate * t.repeat, 0);

/**
 * How many laps a step takes to come round, at most (`<0 2>` 2, `[0 2]/3` 3, `<0 <2 4>>` 4): its alternations' lengths
 * and slowings multiplied out. A ratchet only shortens it.
 */
export function lapsOf(a: Atom): number {
  if (a.kind !== 'seq') return 1;
  const layer = (l: readonly Step[]) => l.reduce((m, t) => lcm(m, lapsOf(t.atom)), 1) * (a.mode === 'alt' ? weight(l) : 1);
  return a.layers.reduce((m, l) => lcm(m, layer(l)), 1) * (a.slow ?? 1);
}

/** A leaf as itself: one hit, all of its frame, every lap. */
export const whole = <A>(atom: A, at: number, dur: number): Hit<A>[] => [{ atom, at, dur, of: 1, is: 0, chances: [], picks: [] }];

/**
 * `x/n` (Strudel's slow) in a frame from `from`, `dur` long: what it holds stretched over n laps, each lap playing its
 * part. (A choice's frame, `lap` laps and `at` from the hit's, is moved with it.)
 */
function slowed<A>(hs: readonly Hit<A>[], n: number, from: number, dur: number): Hit<A>[] {
  return hs.map((h) => {
    const t = n * (h.is + (h.at - from) / dur);
    const lap = floor(t);
    const of = h.of * n;
    return {
      ...h,
      at: from + Math.max(0, t - lap) * dur,
      dur: h.dur * n,
      of,
      is: mod(lap, of),
      picks: h.picks.map((p) => {
        const f = n * (h.is + p.lap + (p.at - from) / dur) - lap;
        const k = floor(f);
        return { ...p, lap: k, at: from + Math.max(0, f - k) * dur };
      }),
    };
  });
}

/**
 * `x(k,n,r)` (Strudel's euclidRot, a struct) in a frame: a hit 1/n of it long where each of the k falls, playing what
 * the step holds as that hit begins (a note begun before it and held over it too, a lap or more before; under a rest,
 * nothing).
 */
function struck<A>(hs: readonly Hit<A>[], e: { readonly n: number; readonly hits: readonly number[] }, from: number, dur: number): Hit<A>[] {
  const out: Hit<A>[] = [];
  for (const i of e.hits) {
    const p = i / e.n;
    for (const h of hs) {
      const o = (h.at - from) / dur;
      const d = h.dur / dur;
      for (let m = 0; m < o + d; m++)
        if (o <= m + p + EPS && m + p < o + d - EPS)
          out.push({ ...h, at: from + p * dur, dur: dur / e.n, is: mod(h.is + m, h.of), picks: h.picks.map((q) => ({ ...q, lap: q.lap - m })) });
    }
  }
  return out;
}

/** What a step holds in one frame, from `from`, `dur` long: a leaf; a subsequence's layers stacked, alternated or chosen, struck, slowed. */
function holds<A>(a: Atom, from: number, dur: number, id: string, ctx: Ctx, leaf: LeafHits<A>): Hit<A>[] {
  if (a.kind !== 'seq') return leaf(a, from, dur).map((h) => ({ ...h, chances: [...ctx.chances, ...h.chances], ...lv(ctx.level, h.level) }));
  let hs = a.layers.flatMap((l, i) => {
    const all = weight(l);
    const seq: Hit<A>[] = [];
    let b = 0;
    l.forEach((t, j) => {
      seq.push(...place(t, from + (b * dur) / all, (t.elongate * dur) / all, `${id}/${i}.${j}`, ctx, leaf));
      b += t.elongate * t.repeat;
    });
    // <a b c>: Strudel's [a b c]/3, a step a lap; [a b|c]: one layer, drawn each lap of its frame
    if (a.mode === 'alt') return slowed(seq, all, from, dur);
    if (a.mode === 'choose') return seq.map((h) => ({ ...h, picks: [...h.picks, { id, of: a.layers.length, is: i, lap: 0, at: from }] }));
    return seq;
  });
  if (a.euclid) hs = struck(hs, a.euclid, from, dur);
  if (a.slow && a.slow > 1) hs = slowed(hs, a.slow, from, dur);
  return hs;
}

/** The x?p and gain of the steps a step is in, outermost first. */
interface Ctx {
  readonly chances: readonly (number | null)[];
  readonly level: number | undefined;
}
const lv = (outer: number | undefined, own: number | undefined) => {
  const l = own === undefined ? outer : outer === undefined ? own : own * outer;
  return l === undefined ? {} : { level: l };
};

/**
 * A step from `at`, each copy `foot` long (!n), ratcheted (*n: Strudel's fast, n laps of what it holds in one, lap L
 * playing its laps nL … nL + n − 1). The order is fixed, whatever the order written: `(k,n,r)`, `/n`, `*n`, `!n`.
 */
function place<A>(u: Step, at: number, foot: number, id: string, outer: Ctx, leaf: LeafHits<A>): Hit<A>[] {
  const ctx: Ctx = {
    chances: u.chance === undefined ? outer.chances : [...outer.chances, u.chance],
    level: u.level === undefined ? outer.level : u.level * (outer.level ?? 1),
  };
  const n = u.subdivide;
  const dur = foot / n;
  const out: Hit<A>[] = [];
  for (let r = 0; r < u.repeat; r++)
    for (let j = 0; j < n; j++) {
      const from = at + r * foot + j * dur;
      for (const h of holds(u.atom, from, dur, id, ctx, leaf)) {
        if (n === 1 || (h.of === 1 && !h.picks.length)) {
          out.push(h);
          continue;
        }
        // (its lap nL + j is one it sounds on: nL + j ≡ is, mod of; a choice's frame k content laps away is k copies away)
        const g = gcd(n, h.of);
        if (mod(h.is - j, g) !== 0) continue;
        const of = h.of / g;
        const is = of === 1 ? 0 : mod(((h.is - j) / g) * inverse(n / g, of), of);
        out.push({
          ...h,
          of,
          is,
          picks: h.picks.map((p) => {
            const m = j + p.lap;
            return { ...p, lap: Math.floor(m / n), at: p.at + (mod(m, n) - j) * dur };
          }),
        });
      }
    }
  return out;
}

/** How long a step lasts, in a braid's steps, before its hold: a leaf `unit`, a subsequence one (one written bare, `&x/2`, as its step would). */
export function footOf(a: Atom, unit: (a: Leaf) => number): number {
  if (a.kind !== 'seq') return unit(a);
  if (!a.bare) return 1;
  const t = a.layers[0][0];
  return footOf(t.atom, unit) * t.elongate;
}

/**
 * Where each leaf of a braid plays, in its own steps: a step lasts `unit` (a splice: its steps; anything else one)
 * times its hold (@n), n times over (!n), ratcheted (*n) inside that. A subsequence takes one step and shares it out
 * among its steps, each by its hold and repeats (`[0 2@2]`: a third and two thirds; a splice inside one slot, its own
 * steps squeezed into it); its layers (`[0 2, 4]`) each span all of it. `<a b>`, `x/n`, `x(k,n,r)` and `[a b|c]` play
 * as Strudel's mini-notation does, a lap of the braid its cycle: each slot with the laps it sounds on and the choices
 * it is in. `leaf` is what a leaf holds in its frame (flatten: a splice's own notes); `id` names the choices.
 */
export function placed<A>(units: readonly Step[], unit: (a: Leaf) => number, leaf: LeafHits<A>, id = ''): Slot<A>[] {
  const out: Slot<A>[] = [];
  let base = 0;
  units.forEach((u, top) => {
    const foot = footOf(u.atom, unit) * u.elongate;
    for (const h of place(u, base, foot, `${id}${top}`, { chances: [], level: undefined }, leaf))
      out.push({
        atom: h.atom,
        at: h.at,
        dur: h.dur,
        chances: h.chances,
        top,
        ...(h.level === undefined ? {} : { level: h.level }),
        ...(h.of > 1 ? { laps: { of: h.of, is: h.is } } : {}),
        ...(h.picks.length ? { chosen: h.picks } : {}),
      });
    base += foot * u.repeat;
  });
  return out;
}

/** Where each leaf of a braid plays, in its own steps (`placed`, each leaf as itself). */
export const slots = (units: readonly Step[], unit: (a: Leaf) => number): Slot[] => placed(units, unit, whole);
