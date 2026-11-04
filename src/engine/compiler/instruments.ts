/**
 * Phase 7½: an instrument's sound parameters (decision 067). A mix used like a voice is a module after its voices: the
 * linear parameters on it (a filter, a pan, a send) are each of its voices', where the voice sets none, since filtering
 * a sum is the sum of the filtered. What its own chain would sound (a parameter on both, in series; grit on the sum) is
 * said and not yet rendered; what isn't a processor (a wave, FM, a glide) belongs on a voice.
 */
import type { CellDecl, Span } from '../ast';
import { VOICE_PARAMS } from '../attributes';
import type { Output, ResolvedCell } from '../program';
import { refsOf } from '../readers';
import type { Cells, Ctx } from './context';
import { IMPLICIT } from './tables';

/** The parameters an instrument passes to its voices: linear, so the sum filtered is the sum of the filtered. */
export const LINEAR: readonly string[] = ['lpf', 'lpq', 'hpf', 'hpq', 'pan', 'room', 'delay', 'delaytime', 'delayfeedback'];
/** Grit: not linear, so on an instrument it acts on what its voices play together (its own chain, not yet built). */
const GRIT: readonly string[] = ['distort', 'crush'];

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

/** The cells, each voice that plays only through instruments with sound parameters given theirs where it sets none. */
export function instrumentParams(
  ctx: Ctx,
  decls: ReadonlyMap<string, CellDecl>,
  cells: Cells,
  outputs: readonly Output[],
  playings: ReadonlyMap<string, readonly (readonly string[])[]>,
): Cells {
  const { error, warn } = ctx;
  const instruments = instrumentsOf(outputs, cells);
  // what each instrument writes: the linear parameters it passes on (grit and the rest said once, on its line)
  const passes = new Map<string, Map<string, Span>>();
  for (const name of instruments) {
    const d = decls.get(name);
    if (!d) continue;
    const keys = soundKeys(d);
    const linear = new Map<string, Span>();
    for (const [k, span] of keys)
      if (LINEAR.includes(k)) linear.set(k, span);
      else if (GRIT.includes(k))
        warn(`${k}= on the instrument &${name} acts on what its voices play together, in a chain of its own: not rendered yet (decision 067), so it plays without it`, span);
      else
        error(
          `${k}= is a voice's: an instrument (&${name}) processes what its voices play, with ${LINEAR.slice(0, 4)
            .map((x) => `${x}=`)
            .join(' ')} …; put ${k}= on a voice`,
          span,
        );
    if (linear.size) passes.set(name, linear);
  }
  if (!passes.size) return cells;
  // each voice's playings: what it takes from the instruments it plays through, innermost first, its own winning
  const said = new Set<string>();
  const once = (key: string, f: () => void) => {
    if (!said.has(key)) (said.add(key), f());
  };
  // (a sound a mix plays is a voice, a kit, or a pattern read through a kit: a kit's members are its voices)
  const voicesOf = (n: string): readonly string[] => {
    const c = cells.get(n);
    const over = decls.get(n)?.over?.name;
    const kit = c?.kit ? c : over && cells.get(over)?.kit ? cells.get(over) : null;
    return kit ? refsOf(kit) : [n];
  };
  const takes = new Map<string, Map<string, string>[]>();
  for (const [sound, ways] of playings)
    for (const through of ways)
      for (const v of voicesOf(sound)) {
        const voice = cells.get(v);
        if (!voice) continue;
        const taken = new Map<string, string>();
        for (const inst of [...through].reverse()) {
          for (const [k, span] of passes.get(inst) ?? []) {
            if (has(voice, k))
              once(`${inst}:${k}:${v}`, () =>
                warn(`&${v} sets ${k}= and plays through &${inst}, which sets it too: the two in series aren't rendered yet (decision 067), so &${v}'s own plays`, span),
              );
            else if (taken.has(k))
              once(`${inst}:${k}:${taken.get(k)}`, () =>
                warn(`&${inst} and &${taken.get(k)} both set ${k}=, one after the other: the two in series aren't rendered yet (decision 067), so &${taken.get(k)}'s plays`, span),
              );
            else taken.set(k, inst);
          }
        }
        if (!takes.has(v)) takes.set(v, []);
        takes.get(v)!.push(taken);
      }
  const same = (a: Map<string, string>, b: Map<string, string>) => a.size === b.size && [...a].every(([k, i]) => b.get(k) === i);
  const next = new Map(cells);
  for (const [v, playings] of takes) {
    const first = playings[0]!;
    if (!playings.every((p) => same(p, first))) {
      const from = [...new Set(playings.flatMap((p) => [...p.values()]))];
      const d = decls.get(v);
      warn(
        `&${v} plays through ${from.map((i) => `&${i}`).join(' and ')} and elsewhere without ${from.length > 1 ? 'them' : 'it'}: a voice has one chain until an instrument has its own (decision 067), so ${from.length > 1 ? 'their' : 'its'} sound parameters aren't rendered on &${v}`,
        d?.span ?? IMPLICIT,
      );
      continue;
    }
    if (!first.size) continue;
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
