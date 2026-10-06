/** The mix algebra's view of the cells (algebra.ts): what each cell is, from its own line; a mix's expressions typed. */
import type { Atom, Binding, CellDecl } from '../ast';
import { VOICE_PARAMS } from '../attributes';
import { AlgebraError, distribute, type Sort } from '../algebra';
import { syntax, type Syntax } from '../parser/syntax';
import type { Ctx } from './context';

/** typed(atom): a mix chord's bindings, typed and distributed once (errors reported once). */
export type Typed = (atom: Extract<Atom, { kind: 'mix' }>) => Binding[];

/** What a rule may look at: the other cells' lines, and rates. */
interface Seen {
  readonly decls: ReadonlyMap<string, CellDecl>;
  readonly rateOf: Ctx['rateOf'];
}

const isMixDecl = (d: CellDecl | undefined) => !!d && d.map?.kind !== 'sample' && d.braid.kind === 'list' && d.braid.tokens.length === 1 && d.braid.tokens[0].atom.kind === 'mix';
const isKitDecl = (d: CellDecl | undefined, { decls }: Seen) =>
  !!d &&
  !Object.keys(d.params).some((k) => VOICE_PARAMS.has(k)) &&
  d.braid.kind === 'list' &&
  d.braid.tokens.length > 0 &&
  d.braid.tokens.every((t) => t.atom.kind === 'ref' && Object.keys(decls.get(t.atom.name)?.params ?? {}).length > 0);
/** How often its braid turns: loop=r, or step=r over its k steps. */
const turns = (d: CellDecl, { rateOf }: Seen): number | null => {
  if (!d.step || d.step.kind === 'driven') return null;
  const r = rateOf(d.step);
  const b = d.braid;
  const k = b.kind === 'list' ? b.tokens.length : b.kind === 'scan' ? b.steps.length : b.kind === 'sin' ? b.n : 1;
  return r === null ? null : d.step.whole ? r : r / Math.max(1, k);
};
const over = (d: CellDecl, { decls }: Seen) => (d.over ? decls.get(d.over.name) : undefined);

export interface SortRule {
  readonly sort: Sort;
  /** What makes a cell this sort, in words. */
  readonly is: string;
  /** A cell of this sort: the last line; the lines before it are what it needs (checked). */
  readonly example: readonly string[];
  readonly holds: (d: CellDecl, seen: Seen) => boolean;
}

/** What a cell is in a mix, from its own line — never from where it's written. The first rule that holds decides. */
export const SORT_RULES: readonly SortRule[] = [
  {
    sort: 'signal',
    is: 'A sound parameter (s=, lpf= …): a voice.',
    example: ['&lead s=saw loop=C4'],
    holds: (d) => Object.keys(d.params).some((k) => VOICE_PARAMS.has(k)),
  },
  {
    sort: 'signal',
    is: 'A mix: an instrument.',
    example: ['&a s=saw loop=C4', '&b s=sine loop=C3', '&organ [&a, &b]'],
    holds: (d) => isMixDecl(d),
  },
  {
    sort: 'signal',
    is: 'A pattern read through a kit (a table of voices).',
    example: ['&bd s=sine loop=A1', '&hh s=white', '&kit &bd &hh', '&drums over=&kit step=4 0 1 0 1'],
    holds: (d, seen) => isKitDecl(over(d, seen), seen),
  },
  {
    sort: 'signal',
    is: 'A selector: a cell reading a table of mixes, each step choosing one.',
    example: ['&lead s=saw loop=C4', '&a [&lead]', '&b [&lead * 0.5]', '&parts &a &b', '&pick over=&parts step=1 0 1'],
    holds: (d, seen) => {
      const t = over(d, seen);
      return t?.braid.kind === 'list' && t.braid.tokens.length > 0 && t.braid.tokens.every((x) => x.atom.kind === 'ref' && isMixDecl(seen.decls.get(x.atom.name)));
    },
  },
  {
    sort: 'signal',
    is: 'A read head of a sound tape (a tape that records a mix).',
    example: ['&lead s=saw loop=C4', '&mix [&lead]', '&tape write=&mix step=1 length=4', '&head play=&tape at=1'],
    holds: (d, { decls }) => {
      const tape = typeof d.params.play === 'string' ? decls.get(d.params.play) : undefined;
      return !!tape && typeof tape.params.write === 'string' && isMixDecl(decls.get(tape.params.write));
    },
  },
  {
    sort: 'wave',
    is: 'A braid turning at an audio rate (20 Hz and up) with no sound of its own. Alone in a product it is the sound (a waveform); in a pitch sum, or beside a sound, a pitch that moves at audio rate (FM). One that plays as a voice in the piece is a sound everywhere.',
    example: ['&square loop=220 0 1'],
    holds: (d, seen) => (turns(d, seen) ?? 0) >= 20,
  },
  {
    sort: 'volume',
    is: 'map=amp, map=db or map=adsr (an envelope).',
    example: ['&accent map=amp step=2 1 .5'],
    holds: (d) => d.map?.kind === 'amp' || d.map?.kind === 'db' || d.map?.kind === 'adsr',
  },
  {
    sort: 'plain',
    is: "map=lin: as a number, it takes its operator's sort — a volume in a product, a pitch in a sum.",
    example: ['&swell map=lin loop=.25 .2 1'],
    holds: (d) => d.map?.kind === 'lin',
  },
  {
    sort: 'pitch',
    is: 'Anything else: a melody, a cell reading a table, a loop below hearing (a vibrato). In semitones.',
    example: ['&vibrato loop=5 0 .1 -.1'],
    holds: () => true,
  },
];

/** The rules as reference entries (docs/language/reference.md). */
export const SORT_SYNTAX: readonly Syntax[] = SORT_RULES.map((r) => syntax('sort', r.sort, r.is, [r.example[r.example.length - 1]], 'mix.md'));

/** sortOf(name): what the cell is in a mix (SORT_RULES). */
export function sortOfCells(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>): (name: string) => Sort {
  const seen: Seen = { decls, rateOf: ctx.rateOf };
  return (name) => {
    const d = decls.get(name);
    return d ? SORT_RULES.find((r) => r.holds(d, seen))!.sort : 'pitch';
  };
}

export function sorts(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>): Typed {
  const { error } = ctx;
  const seen: Seen = { decls, rateOf: ctx.rateOf };
  const sortOf = sortOfCells(ctx, decls);
  // why a product has no voice: the cell that was probably meant as one
  const noVoice = (names: readonly string[]): string | null => {
    const name = names[names.length - 1];
    const d = decls.get(name);
    if (!d) return null;
    if (isKitDecl(d, seen)) return `&${name} is a kit, a table of voices: read a pattern through it (&drums over=&${name}) and mix that`;
    const r = turns(d, seen);
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
        const kit = bs.flatMap((b) => b.pitches).find((t) => isKitDecl(decls.get(t.ref.name), seen));
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
