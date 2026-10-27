/**
 * Phase 1b: the built-in card (decision 028). A piece that writes no card (neither `map=sample` nor `map=midi`) is heard
 * through one of its own: every sound that nothing else reads goes to it, a fader each (at 1), and its master, postgain=,
 * Strudel's default gain, 0.8, applied where a written card's is (in the audio, after the mix).
 * It is a declaration the parser never saw, under a name no line can write, implicit (not drawn, never edited): the
 * phases after this one route, wire and play it as any card.
 */
import type { Atom, CellDecl, Expr, Token } from '../ast';
import { ATTRIBUTES } from '../attributes';
import type { Declared } from './declare';
import { IMPLICIT } from './tables';
import { sortOfCells } from './sorts';
import type { Ctx } from './context';

/** The built-in card's name: with a colon, which no cell's name can have, so it never meets one. */
const BUILTIN_CARD = 'card:builtin';
/** Its master, its postgain=: Strudel's default gain (superdough's `gain`, 0.8). */
const BUILTIN_POSTGAIN = 0.8;

/** The cells an expression in a mix names. */
const exprRefs = (e: Expr): string[] => (e.k === 'ref' ? [e.ref.name] : e.k === 'sum' ? e.items.flatMap((x) => exprRefs(x.e)) : e.k === 'prod' ? e.factors.flatMap(exprRefs) : []);
/** The cells a step names: splices, a mix's terms, inside subsequences too. */
const atomRefs = (a: Atom): string[] =>
  a.kind === 'ref' ? [a.name] : a.kind === 'mix' ? a.exprs.flatMap(exprRefs) : a.kind === 'seq' ? a.layers.flatMap((l) => l.flatMap((t: Token) => atomRefs(t.atom))) : [];

/** The cells a declaration's braid reads: its steps' splices, a mix's or a card's terms, inside subsequences too. */
export const braidReadsOf = (d: CellDecl): string[] => (d.braid.kind === 'list' ? d.braid.tokens.flatMap((t) => atomRefs(t.atom)) : []);

/**
 * Every other cell a declaration reads: over=, a key's tonic (`scale(…, &tonic)`), base=, a step=/loop= driver, a map= table, env= and pitch=, a parameter's
 * cells and clocks, and the parameters that take a cell (play= write= excite= couple= fm= …: attributes.ts). Not about=:
 * a note's links are annotation only, so a note that explains its oscillator (`&oscNote label="…" about=&a`) leaves it
 * heard.
 */
export function otherReadsOf(d: CellDecl): string[] {
  const out: string[] = [];
  for (const r of [
    d.over,
    d.tonic,
    d.swingFrom,
    d.base,
    d.env,
    d.pitch,
    d.map?.kind === 'table' ? d.map.table : null,
    d.step?.kind === 'driven' ? d.step.driver : d.step?.kind === 'tap' ? d.step.meter : null,
  ])
    if (r) out.push(r.name);
  for (const pc of Object.values(d.paramCells ?? {})) out.push(...pc.factors.map((f) => f.name));
  for (const st of Object.values(d.paramClocks ?? {})) if (st.kind === 'driven') out.push(st.driver.name);
  for (const [k, v] of Object.entries(d.params)) if (typeof v === 'string' && ATTRIBUTES[k]?.value === 'cell') out.push(v);
  if (d.gate) out.push(d.gate.notes, ...d.gate.levels.map((l) => l.name), ...d.gate.receivers);
  return out;
}

/** Every cell a declaration reads, in any position: its braid's (`braidReadsOf`) and the rest (`otherReadsOf`). */
const readsOf = (d: CellDecl): string[] => [...braidReadsOf(d), ...otherReadsOf(d)];

/**
 * The declarations with the built-in card added, when the piece writes no card and has a sound nothing reads: a sound
 * is what the mix algebra calls a signal or a wave (sorts.ts: a voice, a mix, a gate, a pattern read through a kit, a
 * tape's read head, a braid at audio rate). Otherwise as they were. A cell a `use` line gave (`used`, decision 054) isn't
 * heard: a piece using the General MIDI kit would hold its 47 voices.
 */
export function builtinCard(ctx: Ctx, declared: Declared, used: ReadonlySet<string> = new Set()): Declared & { readonly builtin: string | null } {
  const { decls, implicit } = declared;
  const none = { ...declared, builtin: null };
  if ([...decls.values()].some((d) => d.map?.kind === 'sample' || d.map?.kind === 'midi')) return none;
  const read = new Set<string>();
  for (const d of decls.values()) for (const n of readsOf(d)) if (n !== d.name) read.add(n);
  const sortOf = sortOfCells(ctx, decls);
  const sounds = [...decls.values()].filter(
    (d) => !implicit.has(d.name) && !used.has(d.name) && !d.lambda && !read.has(d.name) && !ctx.broken.has(d.name) && (sortOf(d.name) === 'signal' || sortOf(d.name) === 'wave'),
  );
  if (!sounds.length) return none;
  const span = IMPLICIT;
  // (each term on its sound's own line: what is said about it is said there)
  const exprs: Expr[] = sounds.map((d) => ({ k: 'ref', ref: { name: d.name, pick: null, shift: 0, span: d.span } }));
  const card: CellDecl = {
    name: BUILTIN_CARD,
    span,
    over: null,
    shift: null,
    off: false,
    step: null,
    map: { kind: 'sample', span },
    stride: null,
    cycle: null,
    params: { postgain: BUILTIN_POSTGAIN },
    paramSpans: {},
    braid: { kind: 'list', tokens: [{ atom: { kind: 'mix', exprs }, repeat: 1, subdivide: 1, elongate: 1, span }] },
  };
  return {
    ...declared,
    decls: new Map([...decls, [BUILTIN_CARD, card]]),
    implicit: new Set([...implicit, BUILTIN_CARD]),
    overOk: new Map([...declared.overOk, [BUILTIN_CARD, true]]),
    builtin: BUILTIN_CARD,
  };
}
