/** Phase 1: the declarations — one per name, the default grid and scale() tables added, over= chains known and acyclic. */
import type { Atom, CellDecl, Expr, Ref, Span, Token } from '../ast';
import { MAX_SPLICE_DEPTH, ROOT } from '../program';
import { VOICE_PARAMS } from '../attributes';
import { IMPLICIT, isRootDecl, tableOf } from './tables';
import type { Ctx } from './context';

/** The declarations, as declare() hands them on. */
export interface Declared {
  /** Every cell's declaration by name, the implicit ones (the default grid, scale() tables) included. */
  readonly decls: ReadonlyMap<string, CellDecl>;
  /** Cells added for a scale(tonic, phase) shorthand, or the kit of a stepped braid of voices: not drawn. */
  readonly implicit: ReadonlySet<string>;
  /** The default grid wasn't declared, so it was added. */
  readonly implicitRoot: boolean;
  /** Which cells' over= chains are sound (known, acyclic). */
  readonly overOk: ReadonlyMap<string, boolean>;
  /**
   * Taps of a meter's bus (decision 016), each to its table: a stepped table of names (`&parts step=&bar &keys &drums`)
   * declares the names it doesn't find as its taps, each stepped as the table was; the table is then a table.
   */
  readonly taps: ReadonlyMap<string, string>;
}

export function declare(ctx: Ctx): Declared {
  const { parsed, error, unknownCell } = ctx;
  const decls = new Map<string, CellDecl>();
  const implicit = new Set<string>();
  for (const c of parsed.cells) {
    if (decls.has(c.name)) error(`&${c.name} is already defined on line ${decls.get(c.name)!.span.line}`, c.span);
    else decls.set(c.name, c);
  }
  const taps = tapTables(decls, error);
  gates(decls, error);
  const implicitRoot = !decls.has(ROOT);
  // scale(name, tonic): the key and the table it declares, unnamed and not drawn
  for (const name of decls.keys()) if (name.startsWith('key:') || name.startsWith('scale:')) implicit.add(name);
  // a stepped braid of voices (&groove step=&bar/4 &bd ~ &hh [&bd,&hh]) plays them, and so do the unstepped
  // braids of voices it splices (drum motifs: &groove … &fill &fill[::-1]): each is a pattern of numbers read
  // through one kit of all their voices, in the order first written (that kit unnamed, not drawn)
  const grooves = voiceGrooves(decls);
  if (grooves) {
    decls.set(VOICE_KIT, {
      name: VOICE_KIT,
      span: grooves.voices[0].span,
      over: null,
      shift: null,
      off: false,
      step: null,
      map: null,
      stride: null,
      cycle: null,
      params: {},
      paramSpans: {},
      braid: {
        kind: 'list',
        tokens: grooves.voices.map((v) => ({ atom: { kind: 'ref', name: v.name, pick: null, shift: 0 }, repeat: 1, subdivide: 1, elongate: 1, span: v.span })),
      },
    });
    for (const [name, tokens] of grooves.cells)
      decls.set(name, { ...decls.get(name)!, over: { name: VOICE_KIT, pick: null, shift: 0, span: decls.get(name)!.span }, braid: { kind: 'list', tokens } });
    implicit.add(VOICE_KIT);
  }
  if (implicitRoot)
    decls.set(ROOT, {
      name: ROOT,
      span: IMPLICIT,
      over: null,
      shift: null,
      off: false,
      step: null,
      map: { kind: 'edo', period: 2, span: IMPLICIT },
      stride: null,
      cycle: 12,
      params: {},
      paramSpans: {},
      braid: { kind: 'blank' },
    });
  const rootDecl = decls.get(ROOT)!;
  if (!isRootDecl(rootDecl)) error(`&${ROOT} is the default grid: give it only cycle= and shift=`, rootDecl.span);

  // ---- over= chains: known, acyclic
  const overOk = new Map<string, boolean>();
  const checkOver = (name: string, seen: string[]): boolean => {
    if (overOk.has(name)) return overOk.get(name)!;
    const d = decls.get(name)!;
    const o = tableOf(d);
    let ok = true;
    if (o !== null) {
      if (!decls.has(o)) {
        unknownCell(o, d.over!.span);
        ok = false;
      } else if (seen.includes(o)) {
        error(`over= loops: ${[...seen.slice(seen.indexOf(o)), name, o].map((n) => '&' + n).join(' → ')}`, d.over?.span ?? d.span);
        ok = false;
      } else ok = checkOver(o, [...seen, name]);
    }
    overOk.set(name, ok);
    return ok;
  };
  for (const name of decls.keys()) checkOver(name, []);
  return { decls, implicit, implicitRoot, overOk, taps };
}

/** The kit that grooves and their motifs read: every voice they name. */
const VOICE_KIT = 'kit:voices';

/**
 * Grooves: stepped cells whose steps are voices, rests, chords of voices and drum motifs; drum motifs:
 * unstepped cells of the same, spliced by a groove (and read through nothing: a braid of voices read
 * with over= is a kit, by number). Their voices in the order first written, and each one's steps as
 * numbers into them — or null when the piece has none.
 */
export function voiceGrooves(decls: ReadonlyMap<string, CellDecl>): { voices: Ref[]; cells: Map<string, Token[]> } | null {
  const sounds = (d: CellDecl | undefined) => Object.keys(d?.params ?? {}).some((k) => VOICE_PARAMS.has(k));
  const isVoiceDecl = (n: string) => sounds(decls.get(n));
  const plain = (r: { pick: unknown; shift: number; transpose?: number; degree?: number; values?: unknown }) => !r.pick && !r.shift && !r.transpose && !r.degree && !r.values;
  const asTable = new Set([...decls.values()].flatMap((d) => (d.over ? [d.over.name] : [])));
  // what a cell may hold to be a groove or a motif: rests, voices, chords of voices, and references to motifs
  const shape = (d: CellDecl | undefined, seen: readonly string[]): boolean => {
    // (no deeper than a splice may go: past that it is an error of its own, and no groove)
    if (!d || d.over || d.map || sounds(d) || d.braid.kind !== 'list' || d.braid.tokens.length === 0 || seen.length > MAX_SPLICE_DEPTH || seen.includes(d.name)) return false;
    let voiced = false;
    for (const t of d.braid.tokens) {
      const a = t.atom;
      if (a.kind === 'rest') continue;
      if (a.kind === 'ref' && isVoiceDecl(a.name) && plain(a)) voiced = true;
      else if (a.kind === 'ref' && !a.shift && !a.transpose && !a.values && motif(a.name, [...seen, d.name])) voiced = true;
      else if (a.kind === 'mix' && a.exprs.every((e) => e.k === 'ref' && isVoiceDecl(e.ref.name) && plain(e.ref))) voiced = true;
      else return false;
    }
    return voiced;
  };
  const motifs = new Map<string, boolean>();
  const motif = (name: string, seen: readonly string[]): boolean => {
    if (motifs.has(name)) return motifs.get(name)!;
    const d = decls.get(name);
    // (one chord of voices and nothing else is a mix: &organ [&a, &b])
    const mix = d?.braid.kind === 'list' && d.braid.tokens.length === 1 && d.braid.tokens[0].atom.kind === 'mix';
    const is = !!d && !d.step && !mix && !asTable.has(name) && shape(d, seen);
    // (only a settled answer is kept: one cut short by a loop or the depth may differ from elsewhere)
    if (seen.length === 0 || is) motifs.set(name, is);
    return is;
  };
  const grooves = [...decls.values()].filter((d) => d.step && shape(d, []));
  if (!grooves.length) return null;
  const voices: Ref[] = [];
  const index = (name: string, span: Ref['span']) => {
    const i = voices.findIndex((v) => v.name === name);
    return i >= 0 ? i : voices.push({ name, pick: null, shift: 0, span }) - 1;
  };
  const cells = new Map<string, Token[]>();
  const rewrite = (d: CellDecl) => {
    if (cells.has(d.name) || d.braid.kind !== 'list') return;
    cells.set(d.name, []);
    const tokens = d.braid.tokens.map((t): Token => {
      const a = t.atom;
      let atom: Atom = a;
      if (a.kind === 'ref' && isVoiceDecl(a.name)) atom = { kind: 'note', value: index(a.name, t.span), alter: 0 };
      else if (a.kind === 'ref') rewrite(decls.get(a.name)!);
      else if (a.kind === 'mix') {
        const notes = a.exprs.map((e) => index((e as { ref: Ref }).ref.name, t.span));
        atom = { kind: 'chord', notes, alters: notes.map(() => 0) };
      }
      return { ...t, atom };
    });
    cells.set(d.name, tokens);
  };
  for (const d of [...decls.values()]) if (grooves.includes(d)) rewrite(d);
  return { voices, cells };
}

/**
 * Gates (#234, the gate node): a named junction. `&leadOut trigger=&tune velocity=&accent gate=&solo gain=.5 &lead`
 * plays its receivers (the voices in its braid) with each note of its trigger, at three levels of one family: the
 * velocity's (per note), the gate's (how open it is over time) and the gain (fixed). Exactly the product
 * `&leadOut [&tune * &accent * &solo * &lead * .5]`, which is what it is read as (one product per receiver).
 * So it sounds, routes and draws as that named mix does; the product stays its anonymous form.
 */
function gates(decls: Map<string, CellDecl>, error: Ctx['error']): void {
  for (const d of [...decls.values()]) {
    const trigger = d.params.trigger;
    if (typeof trigger !== 'string') continue;
    const tokens = d.braid.kind === 'list' ? d.braid.tokens : [];
    const receivers = tokens.flatMap((t) => (t.atom.kind === 'ref' && !t.atom.pick ? [{ name: t.atom.name, span: t.span }] : []));
    if (!receivers.length || receivers.length !== tokens.length) {
      error(`&${d.name} is a gate (trigger=): its braid lists what it plays, voices (&${d.name} trigger=&${trigger} &lead)`, d.span);
      continue;
    }
    const ref = (name: string, span: Span): Expr => ({ k: 'ref', ref: { name, pick: null, shift: 0, span } });
    const velocity = d.params.velocity;
    const open = d.params.gate;
    const gain = d.params.gain;
    const exprs: Expr[] = receivers.map((r) => ({
      k: 'prod',
      span: r.span,
      factors: [
        ref(trigger, d.paramSpans.trigger ?? d.span),
        ...(typeof velocity === 'string' ? [ref(velocity, d.paramSpans.velocity ?? d.span)] : []),
        ...(typeof open === 'string' ? [ref(open, d.paramSpans.gate ?? d.span)] : []),
        ref(r.name, r.span),
        ...(typeof gain === 'number' ? [{ k: 'num', value: gain, span: d.paramSpans.gain ?? d.span } as Expr] : []),
      ],
    }));
    decls.set(d.name, { ...d, braid: { kind: 'list', tokens: [{ atom: { kind: 'mix', exprs }, repeat: 1, subdivide: 1, elongate: 1, span: d.span }] } });
  }
}

/**
 * Tables of taps (decision 016): a stepped cell whose steps are plain names, each one either not declared, declared
 * bare (a line of attributes only, no steps and no clock: `&hookBar off`, where the editor writes a tap's off, label=,
 * show=), or a cell stepped by something (a tap written out: its own line wins), at least one not declared or bare and
 * one something is stepped by. Each undeclared or bare name is a tap, stepped as the table was (one step, a clock),
 * keeping its own line's attributes; the table loses its step= and is a table. A name not declared is an error
 * otherwise, and a bare line was a cell of no steps, so no piece that compiled before changes meaning. Each tap, to its
 * table.
 */
function tapTables(decls: Map<string, CellDecl>, error: Ctx['error']): Map<string, string> {
  const taps = new Map<string, string>();
  // (the names something is stepped by: a table of taps needs one of them, so a stepped braid of a mistyped name is
  // still "Unknown cell", as before)
  const clocks = new Set([...decls.values()].flatMap((d) => (d.step?.kind === 'driven' ? [d.step.driver.name] : [])));
  // (a line of attributes only: `&hookBar off`; a shift= turns its one step, which changes nothing, and the sheet's turn
  // writes one)
  const bare = (k: CellDecl | undefined) => !!k && !k.step && !k.over && !k.map && (k.braid.kind === 'blank' || (k.braid.kind === 'list' && !k.braid.tokens.length));
  for (const d of [...decls.values()]) {
    if (!d.step || d.over || d.map || d.braid.kind !== 'list' || !d.braid.tokens.length) continue;
    const names: string[] = [];
    for (const t of d.braid.tokens) {
      const a = t.atom;
      if (a.kind !== 'ref' || a.pick || a.shift || a.transpose || a.values || t.repeat !== 1 || t.subdivide !== 1 || t.elongate !== 1) break;
      const known = decls.get(a.name);
      if (known && !bare(known) && (!known.step || taps.has(a.name))) {
        // (a tap given a line of steps or a table: the table would be a braid of unknown names — say which line)
        const rest = d.braid.tokens.map((x) => (x.atom.kind === 'ref' ? x.atom.name : '')).filter((n) => n !== a.name);
        if (!known.step && rest.some((n) => n && !decls.has(n) && clocks.has(n)))
          error(`&${a.name} is a tap of &${d.name}, so its line can carry attributes only (off, label=, tags=, show=), not steps or a table of its own`, known.span);
        break;
      }
      names.push(a.name);
    }
    if (names.length !== d.braid.tokens.length || names.every((n) => decls.has(n) && !bare(decls.get(n))) || !names.some((n) => clocks.has(n))) continue;
    for (const [i, name] of names.entries()) {
      taps.set(name, d.name);
      const own = decls.get(name);
      if (own && !bare(own)) continue;
      const span = d.braid.tokens[i].span;
      const braid: CellDecl['braid'] = { kind: 'list', tokens: [{ atom: { kind: 'note', value: 0, alter: 0 }, repeat: 1, subdivide: 1, elongate: 1, span }] };
      decls.set(
        name,
        own
          ? { ...own, step: d.step, braid }
          : { name, span, over: null, shift: null, off: false, step: d.step, map: null, stride: null, cycle: null, params: {}, paramSpans: {}, braid },
      );
    }
    decls.set(d.name, { ...d, step: null });
  }
  return taps;
}
