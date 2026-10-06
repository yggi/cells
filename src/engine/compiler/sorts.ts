/** The mix algebra's view of the cells (algebra.ts): what each cell is, from its own line; a mix's expressions typed. */
import type { Atom, Binding, CellDecl } from '../ast';
import { VOICE_PARAMS } from '../attributes';
import { AlgebraError, distribute, type Sort } from '../algebra';
import type { Ctx } from './context';

/** typed(atom): a mix chord's bindings, typed and distributed once (errors reported once). */
export type Typed = (atom: Extract<Atom, { kind: 'mix' }>) => Binding[];

export function sorts(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>): Typed {
  const { rateOf, error } = ctx;
  // ---- the mix algebra (algebra.ts): what each cell is, from its own line — never from where it's written
  const isMixDecl = (d: CellDecl | undefined) =>
    !!d && d.map?.kind !== 'sample' && d.braid.kind === 'list' && d.braid.tokens.length === 1 && d.braid.tokens[0].atom.kind === 'mix';
  const isKitDecl = (d: CellDecl | undefined) =>
    !!d &&
    !Object.keys(d.params).some((k) => VOICE_PARAMS.has(k)) &&
    d.braid.kind === 'list' &&
    d.braid.tokens.length > 0 &&
    d.braid.tokens.every((t) => t.atom.kind === 'ref' && Object.keys(decls.get(t.atom.name)?.params ?? {}).length > 0);
  // its braid turns at an audio rate: loop=r, or step=r over its k steps
  const turns = (d: CellDecl): number | null => {
    if (!d.step || d.step.kind === 'driven') return null;
    const r = rateOf(d.step);
    const b = d.braid;
    const k = b.kind === 'list' ? b.tokens.length : b.kind === 'scan' ? b.steps.length : b.kind === 'sin' ? b.n : 1;
    return r === null ? null : d.step.whole ? r : r / Math.max(1, k);
  };
  const audioRate = (d: CellDecl) => (turns(d) ?? 0) >= 20;
  const sortOf = (name: string): Sort => {
    const d = decls.get(name);
    if (!d) return 'pitch';
    const over = d.over ? decls.get(d.over.name) : undefined;
    const tape = typeof d.params.play === 'string' ? decls.get(d.params.play) : undefined;
    if (
      Object.keys(d.params).some((k) => VOICE_PARAMS.has(k)) || // a sound parameter
      isMixDecl(d) || // a mix (an instrument)
      isKitDecl(over) || // a pattern read through a kit
      (over?.braid.kind === 'list' && over.braid.tokens.length > 0 && over.braid.tokens.every((t) => t.atom.kind === 'ref' && isMixDecl(decls.get(t.atom.name)))) || // a selector of mixes
      (tape && typeof tape.params.write === 'string' && isMixDecl(decls.get(tape.params.write))) // a read head of a sound tape
    )
      return 'signal';
    // a braid turning at an audio rate, with no sound of its own: a sound alone, a pitch beside one
    if (audioRate(d)) return 'wave';
    const m = d.map?.kind;
    return m === 'amp' || m === 'db' || m === 'adsr' ? 'volume' : m === 'lin' ? 'plain' : 'pitch';
  };
  // why a product has no voice: the cell that was probably meant as one
  const noVoice = (names: readonly string[]): string | null => {
    const name = names[names.length - 1];
    const d = decls.get(name);
    if (!d) return null;
    if (isKitDecl(d)) return `&${name} is a kit, a table of voices: read a pattern through it (&drums over=&${name}) and mix that`;
    const r = turns(d);
    if (r !== null && r < 20) return `&${name} loops at ${+r.toFixed(2)} Hz, below hearing: a pitch. A voice loops at an audio rate (loop=C4) or has a sound (s=saw)`;
    if (!d.step) return `&${name} has no loop=: a voice loops at an audio rate (loop=C4) or has a sound (s=saw)`;
    return null;
  };
  const typedMixes = new WeakMap<object, Binding[]>();
  const typed = (atom: Extract<Atom, { kind: 'mix' }>): Binding[] => {
    let out = typedMixes.get(atom);
    if (out) return out;
    out = [];
    for (const e of atom.exprs)
      try {
        const bs = distribute(e, sortOf, noVoice);
        const kit = bs.flatMap((b) => b.pitches).find((t) => isKitDecl(decls.get(t.ref.name)));
        if (kit) error(`&${kit.ref.name} is a kit, a table of voices: a pattern read through it is the sound — mix the pattern alone`, kit.ref.span);
        else out.push(...bs);
      } catch (x) {
        if (!(x instanceof AlgebraError)) throw x;
        error(x.message, x.span);
      }
    typedMixes.set(atom, out);
    return out;
  };
  return typed;
}
