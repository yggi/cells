/**
 * A cell's braid as numbers in its own steps: references spliced in, picks and
 * shifts applied (`flatten`). What every reading of a braid starts from — the
 * plan, the live view, labels, Shorten.
 */
import type { Pick } from './ast';
import { ROOT, MAX_EVENTS, pickIndices, pickSteps, type CompileResult, type Shifts } from './program';
import { shiftedUnits } from './helix';

/** A cell's units as played: rotated by its shift (plus a [<<]/[>>] shift) — or, for a pick, as written. */
export function unitsFor(result: CompileResult, name: string, shifts: Shifts, pick: Pick | null, table?: string, extra = 0) {
  if (!pick) return shiftedUnits(result, name, shifts(name) + extra, table);
  const all = shiftedUnits(result, name, 0, table);
  return (pickIndices(all.length, pick) ?? []).map((i) => all[i]);
}

/** Steps taken by a (picked) cell. */
export const stepsOf = (result: CompileResult, name: string, pick: Pick | null) => pickSteps(result.cells.get(name)!, pick) ?? 0;

const pickKey = (p: Pick | null, shift = 0) => (!p ? `>${shift}` : p.kind === 'at' ? `@${p.i}` : `${p.from}:${p.to}`);

export interface StepEvent {
  readonly step: number;
  readonly duration: number;
  readonly value: number;
  readonly alter: number;
  /** Cell the number was written in. */
  readonly cell: string;
  /** Table it indexes (the cell's over=, else its player's), with that reference's shift. */
  readonly table: string;
  readonly tableShift: number;
  /** Grid steps it's transposed by (the ^n of every reference it was spliced through). */
  readonly transpose?: number;
  /** x?p: the probability it sounds (each time round, reproducibly). */
  readonly chance?: number;
  /** [a|b|c]: what it chooses from (value is the first, for drawing). */
  readonly options?: readonly { readonly value: number; readonly alter: number }[];
}

export class ExpansionLimit extends Error {}

/**
 * All numbers a cell plays, in its own steps, with &refs spliced in.
 * `&x+n` splices x shifted by n. A spliced cell without over= reads its
 * numbers through the table of whoever splices it.
 */
export function flatten(
  result: CompileResult,
  root: string,
  shifts: Shifts,
  rootPick: Pick | null = null,
  silent: (name: string) => boolean = () => false,
  rootShift = 0,
  rootCtx = ROOT,
): StepEvent[] {
  const memo = new Map<string, StepEvent[]>();
  const walk = (name: string, pick: Pick | null, extra: number, ctx: string, ctxShift: number): StepEvent[] => {
    const cell = result.cells.get(name)!;
    const table = cell.root ? name : (cell.over ?? ctx);
    const tShift = cell.root ? 0 : cell.over ? cell.overShift : ctxShift;
    const key = `${name}|${pickKey(pick, extra)}|${table}|${tShift}`;
    const hit = memo.get(key);
    if (hit) return hit;
    const out: StepEvent[] = [];
    if (!silent(name)) {
      let base = 0;
      for (const u of unitsFor(result, name, shifts, pick, table, extra)) {
        const a = u.atom;
        const unit = a.kind === 'ref' ? stepsOf(result, a.name, a.pick) || 1 : 1;
        const foot = unit * u.elongate;
        const dur = foot / u.subdivide;
        for (let r = 0; r < u.repeat; r++) {
          for (let s = 0; s < u.subdivide; s++) {
            const at = base + s * dur;
            const ev = { step: at, duration: dur, cell: name, table, tableShift: tShift };
            // x?p: its probability (a bare ? takes the cell's chance=)
            const odds = u.chance === undefined ? {} : { chance: u.chance === null ? (cell.chance ?? 0.5) : u.chance };
            if (a.kind === 'note') out.push({ ...ev, value: a.value, alter: a.alter, ...odds });
            else if (a.kind === 'chord') a.notes.forEach((v, j) => out.push({ ...ev, value: v, alter: a.alters[j], ...odds }));
            else if (a.kind === 'choice') out.push({ ...ev, value: a.values[0], alter: a.alters[0], ...odds, options: a.values.map((v, j) => ({ value: v, alter: a.alters[j] })) });
            else if (a.kind === 'ref') {
              const k = dur / (stepsOf(result, a.name, a.pick) || 1);
              const up = a.transpose ?? 0;
              // degree(…) / inverse(…): its values moved before its tables read them (accidentals mirrored with them)
              const m = a.values;
              const moved = (e: StepEvent): StepEvent =>
                !m
                  ? e
                  : {
                      ...e,
                      value: m.mul * e.value + m.add,
                      alter: m.mul * e.alter,
                      ...(e.options ? { options: e.options.map((o) => ({ value: m.mul * o.value + m.add, alter: m.mul * o.alter })) } : {}),
                    };
              for (const e of walk(a.name, a.pick, a.shift, table, tShift))
                out.push({ ...moved(e), step: at + e.step * k, duration: e.duration * k, ...(up || e.transpose ? { transpose: (e.transpose ?? 0) + up } : {}) });
            }
            if (out.length > MAX_EVENTS) throw new ExpansionLimit(name);
          }
          base += foot;
        }
      }
    }
    memo.set(key, out);
    return out;
  };
  return [...walk(root, rootPick, rootShift, rootCtx, 0)].sort((a, b) => a.step - b.step || a.value - b.value);
}
