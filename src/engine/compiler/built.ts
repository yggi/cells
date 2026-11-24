/**
 * A number read from a cell as the piece is built (decision 105, after 093 and 101): the one reader of a cell's value
 * where a text reads one before it plays, and the one phase that fills the attributes that read it. A place that fills
 * cells (`NUMBER_PLACES`, `fills`) records `seed=&s` as a hole the scanner left a placeholder in; this reads the cell,
 * a cell that is one number or a sum of numbers alone (`constantOf`), checks the place's own limits, and sets the
 * attribute, so a place reads a cell exactly as it reads the number written. A generator's argument (decision 101,
 * `meters`) and `even`'s (093, `evens`) read the same way, through `builtNumber`.
 */
import type { CellDecl, Ref } from '../ast';
import { NUMBER_PLACES, type NumberPlace } from '../parser/numbers';
import { constantOf } from '../valuesum';
import type { Ctx } from './context';

/**
 * What a place that reads a cell as the piece is built reads, or why not: said once, wherever a place asks. `read` is
 * how the message names the place (`seed=`, `even(…)'s phase`).
 */
export function builtProblem(read: string, c: CellDecl): string {
  return c.step
    ? `&${c.name} is read as ${read}: a stepped one is not yet a form; write one number (&${c.name} 3)`
    : `&${c.name} is read as ${read}: a cell that is one number, filled as the piece is built (&${c.name} 3)`;
}

/**
 * The number a cell holds, read as the piece is built: null, said as it is where the cell is unknown (a hole the text
 * that uses a fragment fills), a stepped cell or no constant. A fill not answered yet, a fragment read alone, is null
 * and silent (its plugin answers it in a piece, #792).
 */
export function builtNumber(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, ref: Ref, read: string): { readonly value: number; readonly cell: CellDecl } | null {
  const c = decls.get(ref.name);
  if (!c) {
    ctx.unknownCell(ref.name, ref.span);
    return null;
  }
  if (c.fill && c.braid.kind === 'blank') return null;
  const value = constantOf(decls, c.name);
  if (value === null) {
    ctx.error(builtProblem(read, c), c.span);
    return null;
  }
  return { value, cell: c };
}

/** What a place's own limits say of a value, or null where it holds: a count is whole, a share within its range. */
export function placeProblem(place: NumberPlace, value: number): string | null {
  if (place.whole && !place.rounds && !Number.isInteger(value)) return `it takes a whole number, not ${value}`;
  if ((place.min !== undefined && value < place.min) || (place.max !== undefined && value > place.max))
    return `it takes ${place.min ?? 'any'} to ${place.max ?? 'any'}, not ${value}`;
  return null;
}

/** The places that fill cells, by the attribute each sets. */
const FILLING = new Map(Object.values(NUMBER_PLACES).flatMap((p: NumberPlace) => (p.fills ? [[p.fills.field, p] as const] : [])));

/**
 * Every attribute that read a cell (`seed=&s`, `cycle=&n`) set to the cell's value: the first phase to fill, before the
 * generators' and `even`'s, so a cell they read is read once as the same number. A hole whose cell is not one number is
 * an error that says what is read; the attribute keeps its placeholder, and the piece does not compile.
 */
export function builtHoles(ctx: Ctx, decls: Map<string, CellDecl>): void {
  for (const [name, d] of decls) {
    if (!d.holes) continue;
    let next: CellDecl = d;
    const reads: string[] = [];
    for (const h of d.holes) {
      const got = builtNumber(ctx, decls, h.ref, `${h.field}=`);
      if (!got) continue;
      const place = FILLING.get(h.field)!;
      const value = place.rounds || place.whole ? Math.round(got.value) : got.value;
      const problem = placeProblem(place, got.value);
      if (problem) {
        ctx.error(`&${h.ref.name} is read as ${h.field}=: ${problem} (${place.form})`, h.ref.span);
        continue;
      }
      next = {
        ...next,
        [h.field]: value,
        paramSpans: { ...next.paramSpans, ...(h.field === 'shift' || h.field === 'stride' || h.field === 'cycle' ? { [h.field]: h.ref.span } : {}) },
      };
      reads.push(h.ref.name);
    }
    if (next !== d) decls.set(name, { ...next, valueReads: [...(d.valueReads ?? []), ...reads] });
  }
}
