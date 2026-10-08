/**
 * What a tap does to what it carries (docs/notes/nets.md, "a tap is (net, transform)"): the transform written where a
 * name is read, as data. A wire of the graph (engine/graph.ts) carries one per place its name is written; its label is
 * drawn from them (`edgeLabel`), so the label and the transform can't disagree.
 */
import { pickLabel, shiftLabel, type Pick, type RateOp } from './ast';

/** One step of a transform, applied in order (as the language applies them: a pick, a shift, the values' operations, then the tables, then a transposition). */
export type TransformStep =
  /** A slice or a pick of the steps as written: `[a:b]`, `[i]`, `[::-1]`. */
  | { readonly kind: 'pick'; readonly pick: Pick }
  /**
   * A delay: `by` steps behind (`[<<n]`; `[>>n]` is −n: on a table read through over=, a rotation) or, on a tape's
   * read head, `by` tape-seconds after its write head (`at=`).
   */
  | { readonly kind: 'delay'; readonly by: number; readonly unit: 'step' | 'second' }
  /** `degree(…, n)`: n steps up the table it is read through, before the tables read it. */
  | { readonly kind: 'degree'; readonly by: number }
  /** `inverse(…)`: the values mirrored round 0, before the tables read them. */
  | { readonly kind: 'inverse' }
  /** A transposition after the tables: `^n` grid steps, or `+n` semitones (a number in a pitch sum). */
  | { readonly kind: 'transpose'; readonly by: number; readonly unit: 'grid' | 'semitone' }
  /** Subtracted in a pitch sum (`− &x`). */
  | { readonly kind: 'negate' }
  /** A gain: a voice's level in a mix (`&lead * .4`). */
  | { readonly kind: 'gain'; readonly by: number }
  /**
   * A rate (step= / loop=): the driver's ticks multiplied (`*n`) and divided (`/n`) left to right, as written; once per
   * cycle of the driver (`cycle(&x)`) rather than per step; the whole braid per tick (`loop=`); through a spring (`belt=`).
   */
  | {
      readonly kind: 'rate';
      readonly by: readonly RateOp[];
      readonly per: 'step' | 'cycle';
      readonly whole: boolean;
      readonly belt?: number;
    };

export type Transform = readonly TransformStep[];

/** `×2÷3`: a rate's chain, as written. */
export const rateChain = (by: readonly RateOp[]) => by.map((r) => `${r.op}${r.n}`).join('');

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`;

/** One step, as the label shows it (close to how it is written). */
export function stepLabel(s: TransformStep): string {
  switch (s.kind) {
    case 'pick':
      return pickLabel(s.pick);
    case 'delay':
      return s.unit === 'step' ? shiftLabel(-s.by) : `at=${+s.by.toFixed(3)}`;
    case 'degree':
      return `degree ${s.by > 0 ? '+' : ''}${s.by}`;
    case 'inverse':
      return 'inverse';
    case 'transpose':
      return s.unit === 'grid' ? `^${s.by}` : signed(s.by);
    case 'negate':
      return '−';
    case 'gain':
      return `×${+s.by.toFixed(3)}`;
    case 'rate':
      return [s.whole ? 'loop' : '', (s.per === 'cycle' ? '⟳' : '') + rateChain(s.by), s.belt !== undefined ? '· belt' : ''].filter(Boolean).join(' ');
  }
}

/** A transform as the label shows it: its steps in order. */
export const transformLabel = (t: Transform): string => t.map(stepLabel).filter(Boolean).join(' ');

/** Ports a label doesn't name: the structure (a table, a ref, a step, a mix, a product's voice, a note's link) and what plays a voice. Any other is an attribute (`fm`, `lpf`, `write` …), named. */
const UNNAMED = new Set(['over', 'braid', 'step', 'mix', 'is', 'about', 'voice', 'env', 'level', 'pitch']);
/** A port that is an attribute of the reader (`fm=`, `lpf=`, `write=` …): its label names it. */
export const isAttribute = (port: string) => !UNNAMED.has(port);
/** How a port combines what it carries with the rest: an envelope and a level multiply, a pitch adds (a negated one: its `−` says so). */
const OPERATOR: Readonly<Record<string, (t: Transform) => string>> = {
  env: () => '×',
  level: () => '×',
  pitch: (t) => (t.some((s) => s.kind === 'negate') ? '' : '+'),
};

/** At most this many different transforms are named on one label (a keypad's twelve picks: three, then …). */
const NAMED = 3;

/**
 * An edge's label: how many slots of it are written (`×2`), the attribute it feeds, what each place it is written does
 * (the different ones, in order: the first three, then …), and how its port combines it. Undefined when there is nothing to say.
 */
export function edgeLabel(e: { readonly port: string; readonly count: number; readonly transforms: readonly Transform[] }): string | undefined {
  const each = [...new Set(e.transforms.map(transformLabel))].filter(Boolean);
  const parts = [
    e.count > 1 ? `×${e.count}` : '',
    isAttribute(e.port) ? e.port : '',
    ...each.slice(0, NAMED),
    each.length > NAMED ? '…' : '',
    OPERATOR[e.port]?.(e.transforms[0] ?? []) ?? '',
  ];
  return parts.filter(Boolean).join(' ') || undefined;
}
