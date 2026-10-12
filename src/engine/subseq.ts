/**
 * Subsequences (`[0 2 4]`, decision 027): a step that holds steps, squeezed into its own length, stacked with commas
 * (`[0 2, 4]`). What every reading of a braid's timing shares: where each step inside plays (`slots`), what a step holds
 * at the bottom (`leaves`), and a step's numbers moved (`mapLeaves`).
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

/** How many notes a step stands for, its repeats and ratchets counted, nested ones opened (`each`: a leaf's). */
export function countOf(u: Step, each: (l: Leaf) => number): number {
  const a = u.atom;
  const one = a.kind === 'seq' ? a.layers.reduce((s, l) => s + l.reduce((x, t) => x + countOf(t, each), 0), 0) : each(a);
  return u.repeat * u.subdivide * one;
}

/** One place a leaf plays in a braid: from `at` for `dur`, in the braid's steps. */
export interface Slot {
  readonly atom: Leaf;
  readonly at: number;
  readonly dur: number;
  /** The x?p of the steps it is in, outermost first (null: the cell's chance=). */
  readonly chances: readonly (number | null)[];
  /** The step of the braid it is in (its index in `units`). */
  readonly top: number;
  /** Its gain (&x:0:g), times the gains of the steps it is in; none written: absent. */
  readonly level?: number;
}

/**
 * Where each leaf of a braid plays, in its own steps: a step lasts `unit` (a splice: its steps; anything else one)
 * times its hold (@n), n times over (!n), ratcheted (*n) inside that. A subsequence takes one step and shares it out
 * among its steps, each by its hold and repeats (`[0 2@2]`: a third and two thirds; a splice inside one slot, its own
 * steps squeezed into it); its layers (`[0 2, 4]`) each span all of it.
 */
export function slots(units: readonly Step[], unit: (a: Leaf) => number): Slot[] {
  const out: Slot[] = [];
  let base = 0;
  units.forEach((u, top) => {
    const foot = (u.atom.kind === 'seq' ? 1 : unit(u.atom)) * u.elongate;
    place(u, base, foot, [], top, out, undefined);
    base += foot * u.repeat;
  });
  return out;
}

function place(u: Step, at: number, foot: number, chances: readonly (number | null)[], top: number, out: Slot[], level: number | undefined): void {
  const dur = foot / u.subdivide;
  const odds = u.chance === undefined ? chances : [...chances, u.chance];
  const lv = u.level === undefined ? level : u.level * (level ?? 1);
  const a = u.atom;
  for (let r = 0; r < u.repeat; r++)
    for (let s = 0; s < u.subdivide; s++) {
      const from = at + r * foot + s * dur;
      if (a.kind !== 'seq') {
        out.push({ atom: a, at: from, dur, chances: odds, top, ...(lv === undefined ? {} : { level: lv }) });
        continue;
      }
      for (const layer of a.layers) {
        const whole = layer.reduce((x, t) => x + t.elongate * t.repeat, 0);
        let b = 0;
        for (const t of layer) {
          place(t, from + (b * dur) / whole, (t.elongate * dur) / whole, odds, top, out, lv);
          b += t.elongate * t.repeat;
        }
      }
    }
}
