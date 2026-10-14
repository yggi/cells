/**
 * A cell's braid as numbers in its own steps: references spliced in, picks and
 * shifts applied (`flatten`). What every reading of a braid starts from — the
 * plan, the live view, labels, Shorten.
 */
import { pickLabel, type Atom, type Pick } from './ast';
import { ROOT, MAX_EVENTS, pickIndices, pickSteps, type CompileResult, type Shifts } from './program';
import { isTap, positionOf, rootOf, shiftedUnits } from './helix';
import { placed, whole, type Chosen, type Hit, type Laps, type Leaf } from './subseq';

/** What a slot holds as flatten reads it: a leaf, or a note of a cell spliced in (by the reference that splices it). */
type Held = Leaf | { readonly kind: 'spliced'; readonly e: StepEvent; readonly ref: Extract<Atom, { kind: 'ref' }> };

/**
 * A cell's units as played: rotated by its shift (plus a [<<]/[>>] shift); a pick takes from them as they are turned
 * (wrapped entries climbing a lap), or as written (`$`).
 */
export function unitsFor(result: CompileResult, name: string, shifts: Shifts, pick: Pick | null, table?: string, extra = 0) {
  if (!pick) return shiftedUnits(result, name, shifts(name) + extra, table);
  const all = shiftedUnits(result, name, pick.abs ? 0 : shifts(name), table);
  // (a pick's indices are in range: pickIndices counts them over `all`)
  return (pickIndices(all.length, pick) ?? []).map((i) => all[i]!);
}

/** Steps taken by a (picked) cell. */
export const stepsOf = (result: CompileResult, name: string, pick: Pick | null) => pickSteps(result.cells.get(name)!, pick) ?? 0;

const pickKey = (p: Pick | null, shift = 0) => (!p ? `>${shift}` : pickLabel(p));

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
  /** Grid steps it's transposed by (the ^$n of every reference it was spliced through). */
  readonly transpose?: number;
  /**
   * A relative pick's tap: the value is entry `index` of `cell` turned as it stands when it sounds (read in `ctx`,
   * for its lap), times mul plus add (degree(…), inverse(…)); `value` is that entry as the code has it.
   */
  readonly via?: { readonly cell: string; readonly index: number; readonly ctx: string; readonly mul: 1 | -1; readonly add: number };
  /** x?p: the probability it is dropped (each time round, reproducibly). */
  readonly chance?: number;
  /** &x:0:g: its gain, times every level it was spliced at. */
  readonly level?: number;
  /** [a|b|c]: what it chooses from (value is the first, for drawing). */
  readonly options?: readonly { readonly value: number; readonly alter: number }[];
  /** `<a b>`, `x/n`: it plays on the laps (of the cell played) where lap mod `of` is `is`; absent, on every lap. */
  readonly laps?: Laps;
  /** `[a b|c]`: the choices it is in; it plays when each draws its option (realize.ts `thrown`). */
  readonly chosen?: readonly Chosen[];
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
      // a relative pick of plain numbers: which entry each is, looked up again as the cell turns (StepEvent.via)
      const taps = isTap(result, name, pick) ? pickIndices(result.cells.get(name)!.units.length, pick) : null;
      const units = unitsFor(result, name, shifts, pick, table, extra);
      const unit = (x: Leaf) => (x.kind === 'ref' ? stepsOf(result, x.name, x.pick) || 1 : 1);
      // (a splice's own notes, as hits in its step's frame: what holds it — <…>, /n, *n, (k,n,r) — plays them as it does a note)
      const leaf = (x: Leaf, at: number, dur: number): readonly Hit<Held>[] => {
        if (x.kind !== 'ref') return whole<Held>(x, at, dur);
        const k = dur / unit(x);
        return walk(x.name, x.pick, x.shift, table, tShift).map((e) => ({
          atom: { kind: 'spliced', e, ref: x },
          at: at + e.step * k,
          dur: e.duration * k,
          of: e.laps?.of ?? 1,
          is: e.laps?.is ?? 0,
          chances: [],
          picks: (e.chosen ?? []).map((c) => ({ ...c, at: at + c.at * k })),
        }));
      };
      // (each leaf where it plays: a subsequence's steps squeezed into its one, on the laps it plays: subseq.ts)
      for (const { atom: a, at, dur, chances, top, level, laps, chosen } of placed(units, unit, leaf, `${name}:`)) {
        const ev = {
          step: at,
          duration: dur,
          cell: name,
          table,
          tableShift: tShift,
          ...(taps ? { via: { cell: name, index: taps[top], ctx: table, mul: 1 as const, add: 0 } } : {}),
          // <a b>, x/n: the laps it plays on; [a b|c]: the choices it is in
          ...(laps ? { laps } : {}),
          ...(chosen ? { chosen } : {}),
        };
        // x?p: the probability it is dropped (a bare ? takes the cell's chance=; inside a subsequence, each bracket's too: it sounds if none drops it)
        const drop = chances.map((c) => (c === null ? (cell.chance ?? 0.5) : c));
        const odds = {
          ...(!drop.length ? {} : { chance: drop.length === 1 ? drop[0] : 1 - drop.reduce((keep, c) => keep * (1 - c), 1) }),
          // &x:0:g: its gain
          ...(level === undefined ? {} : { level }),
        };
        // (a note by name is a pitch: a place on the grid at the root of its tables, not an index into them)
        const pitch = (semis: number) => ({
          ...ev,
          table: rootOf(result, table),
          tableShift: 0,
          value: Math.round(positionOf(result, rootOf(result, table), semis) * 1e6) / 1e6,
          alter: 0,
        });
        if (a.kind === 'note') out.push(a.pitched ? { ...pitch(a.value), ...odds } : { ...ev, value: a.value, alter: a.alter, ...odds });
        else if (a.kind === 'chord')
          a.notes.forEach((v, j) => {
            // (a member's own gain, [&bd, &hh:0:.4], times the step's)
            const own = a.levels?.[j];
            const lv = own === undefined ? {} : { level: own * (level ?? 1) };
            out.push(a.pitched?.[j] ? { ...pitch(v), ...odds, ...lv } : { ...ev, value: v, alter: a.alters[j], ...odds, ...lv });
          });
        else if (a.kind === 'choice') out.push({ ...ev, value: a.values[0], alter: a.alters[0], ...odds, options: a.values.map((v, j) => ({ value: v, alter: a.alters[j] })) });
        else if (a.kind === 'spliced') {
          const { e, ref } = a;
          const up = ref.transpose ?? 0;
          // degree(…) / inverse(…): its values moved before its tables read them (accidentals mirrored with them)
          const m = ref.values;
          // (its laps and choices are the ones placed() worked out, through what holds it)
          const { laps: _laps, chosen: _chosen, ...own } = e;
          out.push({
            ...own,
            ...(m
              ? {
                  value: m.mul * e.value + m.add,
                  alter: m.mul * e.alter,
                  ...(e.options ? { options: e.options.map((o) => ({ value: m.mul * o.value + m.add, alter: m.mul * o.alter })) } : {}),
                  ...(e.via ? { via: { ...e.via, mul: (m.mul * e.via.mul) as 1 | -1, add: m.mul * e.via.add + m.add } } : {}),
                }
              : {}),
            step: at,
            duration: dur,
            ...(laps ? { laps } : {}),
            ...(chosen ? { chosen } : {}),
            ...(up || e.transpose ? { transpose: (e.transpose ?? 0) + up } : {}),
            // (a splice at a gain, &fill:0:.5: every step of it at that gain too)
            ...(level !== undefined ? { level: (e.level ?? 1) * level } : {}),
          });
        }
        if (out.length > MAX_EVENTS) throw new ExpansionLimit(name);
      }
    }
    memo.set(key, out);
    return out;
  };
  return [...walk(root, rootPick, rootShift, rootCtx, 0)].sort((a, b) => a.step - b.step || a.value - b.value);
}

/** A step event's value and accidental: a relative pick's entry as its cell stands now (StepEvent.via), else as written. */
export function tapped(result: CompileResult, e: StepEvent, shifts: Shifts): { value: number; alter: number } {
  if (!e.via) return { value: e.value, alter: e.alter };
  const u = shiftedUnits(result, e.via.cell, shifts(e.via.cell), e.via.ctx)[e.via.index];
  // (the entry under the tap now, its accidental with it: mirrored with it by inverse(…))
  return u?.atom.kind === 'note' ? { value: e.via.mul * u.atom.value + e.via.add, alter: e.via.mul * u.atom.alter } : { value: e.value, alter: e.alter };
}
