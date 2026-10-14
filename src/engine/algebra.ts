/**
 * The mix algebra (docs/decisions/006-mix-algebra.md): a mix chord's expressions, typed by what
 * each cell is, and distributed into one binding per voice.
 *
 * Sorts: a pitch (semitones), a volume (map=amp, db, adsr), a signal (sound). A plain value — a
 * number, a map=lin cell — has no sort of its own and takes its operator's: semitones in a sum
 * (0 changes nothing), a volume in a product (1 changes nothing). `+` adds pitches and mixes
 * signals; `*` multiplies volumes, composes pitches (transposing twice adds) and applies both to a
 * signal. Both are commutative and associative; a pitch or volume acting on a mix acts on each of
 * its voices. Pure: the caller says what each cell is.
 */
import type { Binding, Expr, Ref, Span, Term } from './ast';

/**
 * What a cell is, as far as a mix cares. `plain`: a map=lin cell (its operator decides). `wave`: a braid
 * turning at an audio rate with no sound parameter — a sound where it is the only one (a waveform voice),
 * a pitch in a pitch sum or beside another sound (a fast vibrato: FM).
 */
export type Sort = 'signal' | 'volume' | 'plain' | 'pitch' | 'wave';

/** How a wave is read where it stands: as a sound unless the context makes it a pitch. */
type Mode = 'auto' | 'pitch';
/** Does an expression hold a sound by itself (a cell whose sort is signal)? */
const holds = (e: Expr, sortOf: (name: string) => Sort, sorts: readonly Sort[]): boolean =>
  e.k === 'ref'
    ? sorts.includes(sortOf(e.ref.name))
    : e.k === 'num'
      ? false
      : e.k === 'prod'
        ? e.factors.some((f) => holds(f, sortOf, sorts))
        : e.items.some((it) => holds(it.e, sortOf, sorts));

export class AlgebraError extends Error {
  constructor(
    message: string,
    readonly span: Span,
  ) {
    super(message);
  }
}

/** Pitches and volumes, gathered and not yet applied to a signal. */
interface Act {
  readonly k: 'act';
  /** Pitch terms and volume terms, in the order written (a volume's inSum is false). */
  readonly terms: readonly Term[];
  /** map=lin cells not yet sorted: a sum makes them pitches, a product volumes. */
  readonly plain: readonly Ref[];
  /** Semitones (numbers that met a pitch in a sum). */
  readonly offset: number;
  /** Gain (numbers that met a product). */
  readonly gain: number;
}
type Typed = { readonly k: 'num'; readonly value: number } | Act | { readonly k: 'signal'; readonly bindings: readonly Binding[] };

const spanOf = (e: Expr): Span => (e.k === 'ref' ? e.ref.span : e.span);
const ACT: Act = { k: 'act', terms: [], plain: [], offset: 0, gain: 1 };
const volumeTerm = (ref: Ref): Term => ({ ref, sign: 1, inSum: false });
const isVolume = (sortOf: (n: string) => Sort, t: Term) => sortOf(t.ref.name) === 'volume' || (sortOf(t.ref.name) === 'plain' && !t.inSum);

/**
 * A mix chord's expression → its bindings, one per voice. Throws AlgebraError (with a span) when
 * the sorts don't fit: two signals multiplied, a volume added, no signal at all …
 */
export function distribute(e: Expr, sortOf: (name: string) => Sort, why?: (names: readonly string[]) => string | null): Binding[] {
  const t = typeOf(e, sortOf);
  if (t.k === 'signal') return [...t.bindings];
  if (t.k === 'num') throw new AlgebraError('A number is a gain or a pitch: it needs a voice (&theme * &lead * 0.8)', spanOf(e));
  const names = [...t.terms.map((x) => x.ref.name), ...t.plain.map((r) => r.name)];
  const hint = why?.(names);
  throw new AlgebraError(
    `${names.map((n) => '&' + n).join(' * ')} has no voice: a product needs one sound (a voice, a mix, a pattern read through a kit) — &theme * &lead${hint ? `. ${hint}` : ''}`,
    spanOf(e),
  );
}

function typeOf(e: Expr, sortOf: (name: string) => Sort, mode: Mode = 'auto'): Typed {
  if (e.k === 'num') return { k: 'num', value: e.value };
  if (e.k === 'ref') {
    // (&x:0:g is a hit's gain, in a groove or its chord: in a mix a gain is a number, &x * .5)
    if (e.level !== undefined)
      throw new AlgebraError(
        `&${e.ref.name}:0:${+e.level.toFixed(3)} is a hit's gain, in a groove: in a mix, a gain is a number (&${e.ref.name} * ${+e.level.toFixed(3)})`,
        e.ref.span,
      );
    const s = sortOf(e.ref.name);
    if (s === 'signal' || (s === 'wave' && mode === 'auto')) return { k: 'signal', bindings: [{ voice: e.ref, pitches: [], offset: 0, gain: 1 }] };
    if (s === 'plain') return { ...ACT, plain: [e.ref] };
    return { ...ACT, terms: [{ ref: e.ref, sign: 1, inSum: false }] };
  }
  if (e.k === 'prod') {
    // beside a sound, a wave is a pitch (it modulates it); alone, it is the sound
    const m: Mode = mode === 'pitch' || holds(e, sortOf, ['signal']) ? 'pitch' : 'auto';
    return e.factors.map((f) => typeOf(f, sortOf, m)).reduce((a, b, i) => times(a, b, spanOf(e.factors[i])));
  }
  return sum(e, sortOf, mode);
}

/** a * b: commutative and associative — the voice is whichever is a signal. */
function times(a: Typed, b: Typed, at: Span): Typed {
  if (a.k === 'num' && b.k === 'num') return { k: 'num', value: a.value * b.value };
  if (a.k === 'signal' && b.k === 'signal')
    throw new AlgebraError(`Two sounds can't multiply (&${a.bindings[0].voice.name} * &${b.bindings[0].voice.name}): mix them with + or ,`, at);
  if (a.k === 'signal' || b.k === 'signal') {
    const [s, x, before] = a.k === 'signal' ? [a, b as Exclude<Typed, { k: 'signal' }>, false] : [b as { k: 'signal'; bindings: readonly Binding[] }, a, true];
    const act = x.k === 'num' ? { ...ACT, gain: x.value } : x;
    const terms = [...act.terms, ...act.plain.map(volumeTerm)];
    return {
      k: 'signal',
      bindings: s.bindings.map((bd) => ({
        ...bd,
        pitches: before ? [...terms, ...bd.pitches] : [...bd.pitches, ...terms],
        offset: bd.offset + act.offset,
        gain: bd.gain * act.gain,
      })),
    };
  }
  // pitches and volumes: in a product, a map=lin cell is a volume
  const x = a.k === 'num' ? { ...ACT, gain: a.value } : a;
  const y = b.k === 'num' ? { ...ACT, gain: b.value } : b;
  return {
    k: 'act',
    terms: [...x.terms, ...x.plain.map(volumeTerm), ...y.terms, ...y.plain.map(volumeTerm)],
    plain: [],
    offset: x.offset + y.offset,
    gain: x.gain * y.gain,
  };
}

/** a + b: signals mix; pitches add (a number in a pitch sum is semitones); volumes don't add. */
function sum(e: Extract<Expr, { k: 'sum' }>, sortOf: (name: string) => Sort, mode: Mode): Typed {
  // sounds mix; a sum with a pitch in it and no sound is a pitch sum, where a wave is a pitch too
  const m: Mode = mode === 'pitch' || (!holds(e, sortOf, ['signal']) && holds(e, sortOf, ['pitch', 'plain'])) ? 'pitch' : 'auto';
  const items = e.items.map((it) => ({ t: typeOf(it.e, sortOf, m), sign: it.sign, span: spanOf(it.e) }));
  if (items.every((x) => x.t.k === 'num')) return { k: 'num', value: items.reduce((s, x) => s + x.sign * (x.t as { value: number }).value, 0) };
  if (items.some((x) => x.t.k === 'signal')) {
    const bindings: Binding[] = [];
    for (const x of items) {
      if (x.t.k === 'num') throw new AlgebraError('A number is a gain or a pitch: it needs a voice (&theme * &lead * 0.8)', x.span);
      if (x.t.k === 'act') throw new AlgebraError("A pitch or a volume can't be added to a sound: it acts on one (&theme * &lead)", x.span);
      if (x.sign < 0) throw new AlgebraError("Sounds mix with +; there's no subtracting a voice", x.span);
      bindings.push(...x.t.bindings);
    }
    return { k: 'signal', bindings };
  }
  const terms: Term[] = [];
  let offset = 0;
  for (const { t, sign, span } of items) {
    if (t.k === 'num') {
      offset += sign * t.value;
      continue;
    }
    const act = t as Act;
    if (act.gain !== 1) throw new AlgebraError('A gain inside a pitch sum: gains multiply the sound — (&theme + 12) * &lead * 0.8', span);
    for (const term of act.terms) {
      if (term.inSum === false && !isPitchTerm(term, sortOf))
        throw new AlgebraError(`&${term.ref.name} is a volume: it multiplies, it can't be added — &theme * &${term.ref.name} * &lead`, term.ref.span);
      terms.push({ ...term, sign: (term.sign * sign) as 1 | -1, inSum: true });
    }
    for (const r of act.plain) terms.push({ ref: r, sign, inSum: true });
    offset += sign * act.offset;
  }
  return { k: 'act', terms, plain: [], offset, gain: 1 };
}

const isPitchTerm = (t: Term, sortOf: (name: string) => Sort) => !isVolume(sortOf, t);
