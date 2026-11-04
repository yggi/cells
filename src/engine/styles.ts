/**
 * A style read by a voice (decision 063 §3): `lpf=300..1200 * &style[artic]`. A moving parameter multiplies its factors'
 * series (`realize.ts`), each the whole of a cell; a factor picked by a slot (`&style[artic]`, `&pluck[sustain]`, read as
 * `[$i]` by `compiler/slots.ts`) is given a cell of its own here, before compile, that holds what it reads:
 *
 * - a slot of a style (`map=style`) or an envelope (`map=adsr`): that one value, held;
 * - an axis of a cell with `style=`: the style's value on it, held; for a range, `style=a..b`, a glide from a's value to
 *   b's over the cell's scope, the piece's length (`Scope`): in a straight line, sixteen steps a bar (`step=1m*16`), b's
 *   on the last, so it comes round with the piece (#376: on the meter, it is the piece's time) and follows the tempo.
 *   With no meter, it glides in seconds on a clock of its own. With no scope known yet, it holds a's value.
 *
 * And every `style=` is read: a style cell (`map=style`), an unnamed one, or a mix of them by weight, which is exact by
 * definition (the point it computes); each end within the axes' ranges.
 */
import type { CellDecl, Diagnostic, ParseResult, Ref, StylePoint } from './ast';
import { parse } from './parser';
import { AXES, CENTRE, STYLE } from './style';

/** The span a glide runs over: the piece's meter and its steps over the piece, or seconds where it has no meter. */
export type Scope = { readonly bars: number } | { readonly seconds: number };

/** A cell's values as written, where every step is a plain number; null otherwise. */
const valuesOf = (d: CellDecl | undefined): number[] | null => {
  if (!d || d.braid.kind !== 'list') return null;
  const v = d.braid.tokens.map((t) => (t.atom.kind === 'note' && t.repeat === 1 && t.elongate === 1 && t.subdivide === 1 ? t.atom.value : NaN));
  return v.some((x) => Number.isNaN(x)) ? null : v;
};

/** A glide's steps a bar: b's value is reached on the bar's last sixteenth. */
const GLIDE_STEPS = 16;

/** A cell's braid with each number v read as a + (b − a)·v: a curve from 0 to 1 laid between two values. */
function between(d: CellDecl, a: number, b: number, name: string, span: CellDecl['span']): CellDecl {
  const braid =
    d.braid.kind === 'list'
      ? { ...d.braid, tokens: d.braid.tokens.map((t) => (t.atom.kind === 'note' ? { ...t, atom: { ...t.atom, value: a + (b - a) * t.atom.value } } : t)) }
      : d.braid;
  return { ...d, name, span, braid, label: null, about: undefined, ...(d.style ? { style: undefined } : {}) };
}

/** Numbers as a braid writes them: short, and exact enough. */
const text = (x: number) => String(Math.round(x * 1e9) / 1e9);

/**
 * The piece with a cell for each picked factor of a style or an envelope, and `glides`: whether a range of styles is
 * read, which needs the piece's scope (compile once without it, then with it: `compile.ts`).
 */
export function readStyles(parsed: ParseResult, scope: Scope | null): { parsed: ParseResult; glides: boolean } {
  const decls = new Map(parsed.cells.map((c) => [c.name, c]));
  const diagnostics: Diagnostic[] = [];
  const error = (message: string, span: CellDecl['span']) => diagnostics.push({ severity: 'error', message, span });

  /** A style cell's point, or null (an error says why, where it is read). */
  const styleCell = (r: Ref): number[] | null => {
    const d = decls.get(r.name);
    if (!d) return null; // (an unknown cell: compile says so)
    const v = valuesOf(d);
    if (d.map?.kind !== 'style' || !v || v.length !== AXES.length) {
      error(`style=&${r.name}: a style is a map=style cell (&${r.name} map=style .3 .45 .55 .55), or a mix of them by weight`, r.span);
      return null;
    }
    return v;
  };
  /** A style as style= writes it: a cell's point, or a mix's weighted sum. */
  const pointOf = (p: StylePoint): number[] | null => {
    if (p.kind === 'cell') return styleCell(p.ref);
    const terms = p.terms.map((t) => ({ v: styleCell(t.ref), w: t.weight }));
    if (terms.some((t) => !t.v)) return null;
    return AXES.map((_, i) => terms.reduce((a, t) => a + t.w * t.v![i]!, 0));
  };
  /** Each cell's style= read: its ends, each within the axes' ranges. */
  const styles = new Map<string, { from: number[]; to: number[] | null; curve: Ref | null }>();
  for (const d of parsed.cells) {
    if (!d.style) continue;
    const from = pointOf(d.style.from);
    const to = d.style.to ? pointOf(d.style.to) : null;
    if (!from || (d.style.to && !to)) continue;
    const outside = [from, ...(to ? [to] : [])].flatMap((p) => AXES.filter((a, i) => !(p[i]! >= a.range[0] - 1e-9 && p[i]! <= a.range[1] + 1e-9)));
    if (outside.length) {
      error(
        `&${d.name} style=: its style lies outside the axes on ${[...new Set(outside.map((a) => a.name))].join(', ')} (each ${AXES[0]!.range[0]} to ${AXES[0]!.range[1]}); a mix's weights sum its styles' points`,
        d.style.span,
      );
      continue;
    }
    const curve = d.style.curve ?? null;
    if (curve && !decls.has(curve.name)) continue; // (an unknown cell: compile says so)
    const line = curve ? decls.get(curve.name)!.braid : null;
    if (curve && !(line?.kind === 'list' && line.tokens.every((t) => t.atom.kind === 'note'))) {
      error(`style=a..b * &${curve.name}: a curve is a line of numbers from 0 to 1 (&${curve.name} map=lin step=1m 0 .5 1)`, curve.span);
      continue;
    }
    styles.set(d.name, { from, to, curve });
  }

  // the cells made: one for each (cell, slot) a factor reads, shared by every factor that reads it
  const made = new Map<string, CellDecl>();
  let glides = false;
  let centred = false;
  // (a gate: play= with a braid of voices, as compiler/parts.ts reads one)
  const performed = parsed.cells.some((c) => typeof (c.params.play ?? c.params.trigger) === 'string' && c.braid.kind !== 'blank');
  const cellOf = (r: Ref): string | null => {
    if (!r.pick || r.pick.kind !== 'at' || !r.pick.abs) return null;
    const i = r.pick.i;
    const d = decls.get(r.name);
    const style = styles.get(r.name);
    let body: string | null = null;
    if (!d && r.name === STYLE) {
      // (the section's style, which no line writes: the centre, said once; the composer writes &style, never a fragment)
      body = text(CENTRE[i]!);
      // (said in a piece with performers, a score played, as a missing part is: not an instrument heard alone, compiler/parts.ts)
      if (!centred && performed)
        diagnostics.push({
          severity: 'info',
          message: `no line writes &${STYLE}: &${STYLE}[${AXES[i]!.name}] reads the centre of style space, ${text(CENTRE[i]!)} on each axis (a score names its style as the note &${STYLE} style=…, decision 063)`,
          span: r.span,
        });
      centred = true;
    } else if (style) {
      const a = style.from[i]!;
      const b = style.to ? style.to[i]! : a;
      if (style.to && !style.curve) glides = true;
      const curve = style.curve ? decls.get(style.curve.name) : undefined;
      if (curve && a !== b) {
        // (a curve written out: its values, 0 to 1, laid between the two ends, on its own clock)
        const name = `λ${r.name}_${i}`;
        if (!made.has(name)) made.set(name, between(curve, a, b, name, r.span));
        return name;
      }
      if (a === b || !scope) body = text(a);
      else if ('bars' in scope) {
        // (each step's start at its share of the scope: a bar k of n begins at a + (b − a)·k/n)
        const n = scope.bars * GLIDE_STEPS;
        body = `map=lin step=1m*${GLIDE_STEPS} ${Array.from({ length: n }, (_, k) => text(a + ((b - a) * k) / n)).join(' ')}`;
      } else body = `map=lin step=${text(1 / scope.seconds)}hz ${text(a)} ${text(b)}`;
    } else if (d && (d.map?.kind === 'style' || d.map?.kind === 'adsr')) {
      const v = valuesOf(d)?.[i];
      if (v !== undefined) body = text(v);
    }
    if (body === null) return null;
    const name = `λ${r.name}_${i}`;
    if (!made.has(name)) {
      const holder = parse(`&styleRead lpf=0..1 * &(${body})`).cells.find((c) => c.name !== 'styleRead');
      if (holder) made.set(name, { ...holder, name, span: r.span });
    }
    return made.has(name) ? name : null;
  };

  let changed = false;
  const cells = parsed.cells.map((d) => {
    if (!d.paramCells) return d;
    let paramCells: Record<string, NonNullable<CellDecl['paramCells']>[string]> | null = null;
    for (const [key, pc] of Object.entries(d.paramCells)) {
      const factors = pc.factors.map((f) => {
        const name = cellOf(f);
        return name ? { name, pick: null, shift: 0, span: f.span } : f;
      });
      if (factors.some((f, k) => f !== pc.factors[k])) (paramCells ??= { ...d.paramCells })[key] = { ...pc, factors };
    }
    if (!paramCells) return d;
    changed = true;
    return { ...d, paramCells };
  });
  if (!changed && !diagnostics.length) return { parsed, glides };
  return { parsed: { ...parsed, cells: [...cells, ...made.values()], diagnostics: [...parsed.diagnostics, ...diagnostics] }, glides };
}
