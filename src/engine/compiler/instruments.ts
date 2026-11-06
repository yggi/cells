/**
 * Phase 7½: an instrument's sound parameters (decision 067). A mix used like a voice is a module after its voices: its
 * sound parameters process what its voices play, in series after each voice's own. The renderer plays each instrument's
 * filters as a stage of its own after the voice's (`render.ts`); its `pan=` is in the outputs' gains, a balance after the
 * voice's (`outputs.ts`). What isn't a processor (a wave, FM, a glide) belongs on a voice: an error here.
 *
 * A voice that plays only through instruments also takes, where it sets none, the linear parameters they write
 * (`ResolvedCell.inherited`): filtering a sum is the sum of the filtered, so a frontend that builds a voice's chain from
 * its cell alone plays the instrument's filter (Cell studio, until it builds an instrument's chain). cells' renderer
 * plays the instrument's stage instead, and leaves what a voice inherited out of the voice's own chain.
 */
import type { CellDecl, Span } from '../ast';
import { VOICE_PARAMS } from '../attributes';
import type { Output, ResolvedCell } from '../program';
import { refsOf } from '../readers';
import type { Cells, Ctx } from './context';

/** The parameters a voice takes from the instruments it plays only through: linear, so the sum's is each voice's. */
export const LINEAR: readonly string[] = ['lpf', 'lpq', 'hpf', 'hpq', 'bpf', 'bpq', 'room', 'delay', 'delaytime', 'delayfeedback'];
/** The sound parameters an instrument carries: the linear ones, its balance (in its outputs' gains), and grit (on its sum). */
const PROCESSORS: readonly string[] = [...LINEAR, 'pan', 'distort', 'crush'];

/** The mixes the outputs play through as instruments. */
export const instrumentsOf = (outputs: readonly Output[], cells: Cells): ReadonlySet<string> => new Set(outputs.flatMap((o) => o.through).filter((n) => !!cells.get(n)?.mix));

/** The sound parameters a cell's line writes, fixed, moving or a clock, each with where it is written. */
function soundKeys(d: CellDecl): Map<string, Span> {
  const out = new Map<string, Span>();
  for (const k of Object.keys(d.params)) if (VOICE_PARAMS.has(k)) out.set(k, d.paramSpans[k] ?? d.span);
  for (const [k, pc] of Object.entries(d.paramCells ?? {})) if (VOICE_PARAMS.has(k)) out.set(k, pc.span);
  for (const [k, st] of Object.entries(d.paramClocks ?? {})) if (VOICE_PARAMS.has(k)) out.set(k, st.span);
  return out;
}

const has = (c: ResolvedCell, k: string) => k in c.params || k in c.paramCells || k in c.paramClocks;

/** The cells, each voice that plays only through instruments with linear parameters given theirs where it sets none. */
export function instrumentParams(
  ctx: Ctx,
  decls: ReadonlyMap<string, CellDecl>,
  cells: Cells,
  outputs: readonly Output[],
  playings: ReadonlyMap<string, readonly (readonly string[])[]>,
): Cells {
  const { error } = ctx;
  const instruments = instrumentsOf(outputs, cells);
  // what each instrument writes: the linear parameters a voice may take from it (a voice's own sound is an error)
  const passes = new Map<string, readonly string[]>();
  for (const name of instruments) {
    const d = decls.get(name);
    if (!d) continue;
    const keys = soundKeys(d);
    for (const [k, span] of keys)
      if (!PROCESSORS.includes(k))
        error(
          `${k}= is a voice's: an instrument (&${name}) processes what its voices play, with ${LINEAR.slice(0, 4)
            .map((x) => `${x}=`)
            .join(' ')} …; put ${k}= on a voice`,
          span,
        );
    const linear = [...keys.keys()].filter((k) => LINEAR.includes(k));
    if (linear.length) passes.set(name, linear);
  }
  if (!passes.size) return cells;
  // (a sound a mix plays is a voice, a kit, or a pattern read through a kit: a kit's members are its voices)
  const voicesOf = (n: string): readonly string[] => {
    const c = cells.get(n);
    const over = decls.get(n)?.over?.name;
    const kit = c?.kit ? c : over && cells.get(over)?.kit ? cells.get(over) : null;
    return kit ? refsOf(kit) : [n];
  };
  // each way a voice is played: what it would take from the instruments it plays through, the innermost first, its own winning
  const takes = new Map<string, Map<string, string>[]>();
  for (const [sound, ways] of playings)
    for (const through of ways)
      for (const v of voicesOf(sound)) {
        const voice = cells.get(v);
        if (!voice) continue;
        const taken = new Map<string, string>();
        for (const inst of [...through].reverse()) for (const k of passes.get(inst) ?? []) if (!has(voice, k) && !taken.has(k)) taken.set(k, inst);
        if (!takes.has(v)) takes.set(v, []);
        takes.get(v)!.push(taken);
      }
  const same = (a: Map<string, string>, b: Map<string, string>) => a.size === b.size && [...a].every(([k, i]) => b.get(k) === i);
  const next = new Map(cells);
  for (const [v, ways] of takes) {
    const first = ways[0]!;
    // (played through it and without it too, a voice's one cell can't say both: it takes nothing)
    if (!first.size || !ways.every((p) => same(p, first))) continue;
    const c = cells.get(v)!;
    const params = { ...c.params };
    const paramCells = { ...c.paramCells };
    const paramClocks = { ...c.paramClocks };
    for (const [k, inst] of first) {
      const i = cells.get(inst)!;
      if (k in i.params) params[k] = i.params[k]!;
      if (k in i.paramCells) paramCells[k] = i.paramCells[k]!;
      if (k in i.paramClocks) paramClocks[k] = i.paramClocks[k]!;
    }
    next.set(v, { ...c, params, paramCells, paramClocks, voice: true, inherited: Object.fromEntries(first) });
  }
  return next;
}
