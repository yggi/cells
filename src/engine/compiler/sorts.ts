/** The mix algebra's view of the cells (algebra.ts): what each cell is, from its own line; a mix's expressions typed. */
import { leaves } from '../subseq';
import { CV_LAPS } from '../program';
import type { Atom, Binding, CellDecl, Expr, Ref } from '../ast';
import { memberParams, VOICE_MAKERS } from '../attributes';
import { AlgebraError, distribute, type Sort } from '../algebra';
import { inlineNotes, inlineNumbers, notesProductOf, numberCellOf, valueSumOf } from '../valuesum';
import { syntax, type Syntax } from '../parser/syntax';
import type { Ctx } from './context';
import { noSound } from './band';

/** typed(atom): a mix chord's bindings, typed and distributed once (errors reported once). */
export type Typed = (atom: Extract<Atom, { kind: 'mix' }>) => Binding[];

/** What a rule may look at: the other cells' lines, and rates. */
interface Seen {
  readonly decls: ReadonlyMap<string, CellDecl>;
  readonly rateOf: Ctx['rateOf'];
}

const isMixDecl = (d: CellDecl | undefined) =>
  !!d && d.map?.kind !== 'sample' && d.map?.kind !== 'midi' && d.braid.kind === 'list' && d.braid.tokens.length === 1 && d.braid.tokens[0].atom.kind === 'mix';
const isKitDecl = (d: CellDecl | undefined, { decls }: Seen) =>
  !!d &&
  !Object.keys(d.params).some((k) => VOICE_MAKERS.has(k)) &&
  d.braid.kind === 'list' &&
  d.braid.tokens.length > 0 &&
  d.braid.tokens.every((t) => t.atom.kind === 'ref' && memberParams(decls.get(t.atom.name)?.params ?? {}));
/** How often its braid turns: loop=r, or step=r over its k steps. */
const turns = (d: CellDecl, { rateOf }: Seen): number | null => {
  if (!d.step || d.step.kind === 'driven' || d.step.kind === 'tap') return null;
  const r = rateOf(d.step);
  const b = d.braid;
  const k = b.kind === 'list' ? b.tokens.length : b.kind === 'scan' ? b.steps.length : b.kind === 'wave' ? b.n : 1;
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

/** A read head of a sound tape: a tape that records a mix. */
const isSoundHead = (d: CellDecl, { decls }: Seen) => {
  const tape = typeof d.params.play === 'string' ? decls.get(d.params.play) : undefined;
  return !!tape && typeof tape.params.write === 'string' && isMixDecl(decls.get(tape.params.write));
};
/** Is a cell that is not a mix a sound in a mix: a voice, a gate, a pattern read through a kit, a tape's read head, a wave? */
const soundNotMix = (seen: Seen) => (n: string) => {
  const d = seen.decls.get(n);
  return !!d && (!!d.gate || Object.keys(d.params).some((k) => VOICE_MAKERS.has(k)) || isKitDecl(over(d, seen), seen) || isSoundHead(d, seen) || (turns(d, seen) ?? 0) >= CV_LAPS);
};
/** Notes with their levels (decision 087): a cell's one chord a product with no sound in it and a pitch. */
const isNotesDecl = (d: CellDecl, seen: Seen) => notesProductOf(d.name, seen.decls, soundNotMix(seen)) !== null;

/** What a cell is in a mix, from its own line — never from where it's written. The first rule that holds decides. */
export const SORT_RULES: readonly SortRule[] = [
  {
    sort: 'signal',
    is: 'A sound parameter (s=, lpf= …): a voice.',
    example: ['&lead s=saw loop=C4'],
    holds: (d) => Object.keys(d.params).some((k) => VOICE_MAKERS.has(k)),
  },
  {
    sort: 'pitch',
    is: 'A product with no sound in it and a pitch: notes with their levels (decision 087). In a product with a sound it is its own product, as written in parentheses: [&cycle * &glass] plays [(&notes * &level) * &glass].',
    example: ['&notes step=2 0 4', '&level map=amp step=2 1 .5', '&cycle [&notes * &level]'],
    holds: isNotesDecl,
  },
  {
    sort: 'signal',
    is: 'A mix: an instrument.',
    example: ['&a s=saw loop=C4', '&b s=sine loop=C3', '&organ [&a, &b]'],
    // (a mix of cells with no voice is a sum of values, no sound: decision 079)
    holds: (d, { decls }) => isMixDecl(d) && valueSumOf(d.name, decls) === null,
  },
  {
    sort: 'signal',
    is: 'A pattern read through a kit (a table of voices).',
    example: ['&bd s=sine loop=A1', '&hh s=white', '&kit &bd &hh', '&drums over=&kit step=4 0 1 0 1'],
    holds: (d, seen) => isKitDecl(over(d, seen), seen),
  },
  {
    sort: 'signal',
    is: 'A read head of a sound tape (a tape that records a mix).',
    example: ['&lead s=saw loop=C4', '&mix [&lead]', '&tape write=&mix step=1 length=4', '&head play=&tape at=1'],
    holds: isSoundHead,
  },
  {
    sort: 'wave',
    is: 'A braid turning at an audio rate (20 Hz and up) with no sound of its own. Alone in a product it is the sound (a waveform); in a pitch sum, or beside a sound, a pitch that moves at audio rate (FM). One that plays as a voice in the piece is a sound everywhere.',
    example: ['&square loop=220 0 1'],
    holds: (d, seen) => (turns(d, seen) ?? 0) >= CV_LAPS,
  },
  {
    sort: 'volume',
    is: 'map=amp, map=db or map=adsr (an envelope).',
    example: ['&accent map=amp step=2 1 .5'],
    holds: (d) => d.map?.kind === 'amp' || d.map?.kind === 'db' || d.map?.kind === 'adsr',
  },
  {
    sort: 'plain',
    is: 'A cell that is one number and nothing else (decision 088): named in a mix it is that number, a gain in a product, semitones in a sum.',
    example: ['&vol .5'],
    holds: (d) => numberCellOf(d) !== null,
  },
  {
    sort: 'plain',
    is: 'A sum of values (decision 079): in a product a level, its weighted sum held to 0…1 (decision 088).',
    example: ['&a map=amp step=1 1 .2', '&b map=amp step=2 1 0', '&fade [&a * .7 + &b * .3]'],
    holds: (d, { decls }) => isMixDecl(d) && valueSumOf(d.name, decls) !== null,
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

/** The cells an expression names. */
const refsIn = (e: Expr): Ref[] => (e.k === 'ref' ? [e.ref] : e.k === 'sum' ? e.items.flatMap((x) => refsIn(x.e)) : e.k === 'prod' ? e.factors.flatMap(refsIn) : []);
const refsOf = (e: Expr): string[] => refsIn(e).map((r) => r.name);

/** isNotes(name): is the cell notes with their levels (decision 087), a product a mix reads as its parentheses? */
export function notesCells(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>): (name: string) => boolean {
  const seen: Seen = { decls, rateOf: ctx.rateOf };
  return (name) => {
    const d = decls.get(name);
    return !!d && isNotesDecl(d, seen);
  };
}

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
    // a groove that was meant, with a number or a pick of a voice in it: it holds voices, rests and chords of voices only
    if (d.braid.kind === 'list') {
      const voiceRef = (t: { atom: Atom }) => t.atom.kind === 'ref' && Object.keys(decls.get(t.atom.name)?.params ?? {}).some((k) => VOICE_MAKERS.has(k));
      const odd = (t: { atom: Atom }) => t.atom.kind === 'note' || (t.atom.kind === 'ref' && voiceRef(t) && (t.atom.pick || t.atom.shift || t.atom.transpose || t.atom.values));
      const steps = d.braid.tokens.flatMap((t) => leaves(t.atom).map((atom) => ({ atom })));
      if (steps.some(voiceRef) && steps.some(odd))
        return `&${name} mixes voices with numbers or picks: a groove holds only voices, rests and chords of voices (&bd &hh ~ [&bd, &hh]); to play numbers through voices, read them with over= a kit`;
    }
    if (d.map?.kind === 'midi') return `&${name} is a MIDI card: it sends what it names to a device, and is no sound to mix or play`;
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
    // (a gate's kit receiver is its voice: the trigger's numbers pick the member, as a pattern read through it does)
    const sort = atom.gate ? (n: string) => (isKitDecl(decls.get(n), seen) ? 'signal' : sortOf(n)) : sortOf;
    // (a gate's notes and levels that are sounds: said by the port they were written on, not as the product it reads as)
    const spec = atom.gate ? decls.get(atom.gate)?.gate : undefined;
    const ref = (name: string) => atom.exprs.flatMap(refsIn).find((r) => r.name === name);
    // (a voice, a mix or a gate: a pattern read through a kit is a sound too, and the notes a gate plays may be one)
    const sound = (n: string) => {
      const d = decls.get(n);
      return !!d && (!!d.gate || (isMixDecl(d) && valueSumOf(n, decls) === null && !isNotesDecl(d, seen)) || Object.keys(d.params).some((k) => VOICE_MAKERS.has(k)));
    };
    // (a stack's lines, each: the stack itself is a chord, and a gate plays its lines one by one)
    const notes = spec ? (spec.lines?.map((l) => l.line) ?? [spec.notes]).map((name) => ({ name, port: spec.port })) : [];
    const sounding = spec && [...notes, ...spec.levels].find((x) => sound(x.name));
    if (spec && sounding) {
      const wants = notes.some((x) => x.name === sounding.name) ? 'the notes it plays (a melody, &tune)' : 'a level (a volume: a cell with map=amp, map=db or map=lin)';
      error(
        `${sounding.port}=&${sounding.name}: a gate's ${sounding.port}= takes ${wants}, and &${sounding.name} is a sound (${decls.get(sounding.name)?.gate ? 'a gate' : isMixDecl(decls.get(sounding.name)) ? 'a mix' : 'a voice'})`,
        ref(sounding.name)?.span ?? decls.get(atom.gate!)!.span,
      );
      typedMixes.set(atom, out);
      return out;
    }
    // (a role names gates: it is no sound, and its gates are what a mix or a gate wants)
    const role = (n: string) => decls.get(n)?.map?.kind === 'role';
    const roleIn = [...notes.map((x) => x.name), ...atom.exprs.flatMap(refsOf)].find(role);
    if (roleIn) {
      error(noSound(roleIn), ref(roleIn)?.span ?? decls.get(atom.gate ?? roleIn)!.span);
      typedMixes.set(atom, out);
      return out;
    }
    for (const written of atom.exprs)
      try {
        // (a name no line declares: that is what's wrong with the product, not its voice)
        const unknown = refsIn(written).filter((r) => !decls.has(r.name));
        if (unknown.length) {
          for (const r of unknown) ctx.unknownCell(r.name, r.span);
          continue;
        }
        // notes with their levels, named, are their product as in parentheses (decision 087): written so before typing
        const found: { named: string[]; moved: Extract<Expr, { k: 'ref' }>[] } = { named: [], moved: [] };
        // (a cell that is the number 0, as a factor: a gain of 0, said, since a note with no clock may have been meant)
        const zero = (x: Expr, factor: boolean): Ref | null =>
          x.k === 'ref'
            ? factor && !x.ref.pick && !x.ref.shift && numberCellOf(decls.get(x.ref.name)) === 0 && !decls.get(x.ref.name)?.frees?.length
              ? x.ref
              : null
            : x.k === 'prod'
              ? (x.factors.map((f) => zero(f, true)).find((r) => r) ?? null)
              : x.k === 'sum'
                ? (x.items.map((it) => zero(it.e, x.items.length === 1 && factor)).find((r) => r) ?? null)
                : null;
        const silent = zero(written, true);
        if (silent)
          ctx.warn(
            `&${silent.name} is the number 0: as a factor it is a gain of 0, silence (decision 088) — a note is a step of a line with a clock (&${silent.name} step=4n 0)`,
            silent.span,
          );
        const e = inlineNumbers(inlineNotes(written, decls, soundNotMix(seen), found), decls);
        if (found.moved.length) {
          for (const m of found.moved)
            error(`&${m.ref.name} is notes with their levels (a product with no voice): it is named whole in a mix, not picked, moved or given a level (decision 087)`, m.ref.span);
          continue;
        }
        let bs: Binding[];
        try {
          bs = distribute(e, sort, noVoice);
        } catch (x) {
          // (notes named and nothing to sound them on: say what they are)
          if (x instanceof AlgebraError && found.named.length && !refsIn(e).some((r) => sort(r.name) === 'signal' || sort(r.name) === 'wave'))
            throw new AlgebraError(
              `&${found.named[0]} is notes with their levels: multiply them by a voice ([&${found.named[0]} * &lead]) (decision 087)`,
              written.k === 'ref' ? written.ref.span : written.span,
            );
          throw x;
        }
        const kit = bs.flatMap((b) => b.pitches).find((t) => isKitDecl(decls.get(t.ref.name), seen));
        // (a sum of values is a level in a product, decision 088; as semitones it has no reading yet, and says so)
        const added = bs.flatMap((b) => b.pitches).find((t) => t.inSum && valueSumOf(t.ref.name, decls) !== null);
        if (kit) error(`&${kit.ref.name} is a kit, a table of voices: a pattern read through it is the sound — mix the pattern alone`, kit.ref.span);
        else if (added)
          error(
            `&${added.ref.name} is a sum of values: in a product it is a level (&theme * &${added.ref.name} * &lead), and a pitch sum adds lines, not it — add its terms there (decision 088)`,
            added.ref.span,
          );
        else out.push(...bs);
      } catch (x) {
        if (!(x instanceof AlgebraError)) throw x;
        // (a cell whose line failed has no sort to speak of: its own error says why)
        if (!refsOf(written).some((n) => ctx.broken.has(n))) error(x.message, x.span);
      }
    typedMixes.set(atom, out);
    return out;
  };
  return typed;
}
