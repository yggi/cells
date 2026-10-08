/** Phase 2: the cells — each declaration resolved as a helix over its table, &refs followed (cycles caught). */
import type { Span } from '../ast';
import { DEFAULT_FREQ, MAX_SPLICE_DEPTH, ROOT, pickSteps, pickText, type ResolvedCell } from '../program';
import { VOICE_PARAMS } from '../attributes';
import { scan as scanOf } from '../../theory/modes';
import { gridSteps, lengthOf as lengthIn, tableOf, unitsOf as unitsIn } from './tables';
import type { Cells, Ctx } from './context';
import type { Declared } from './declare';
import type { Typed } from './sorts';

class Abort extends Error {}

export function resolveCells(ctx: Ctx, { decls, implicit, implicitRoot, overOk }: Declared, typed: Typed): Cells {
  const { rateOf, error, warn, broken, unknownCell } = ctx;
  const cells = new Map<string, ResolvedCell>();
  const lengthOf = (name: string) => lengthIn(decls, name);
  const unitsOf = (d: Parameters<typeof unitsIn>[1]) => unitsIn(decls, d);
  // ---- &refs (time structure), with cycle detection
  const visiting: string[] = [];
  // (cells on a chain spliced too deep: said once, at the link that goes over, and not walked again from each link)
  const tooDeep = new Set<string>();
  const resolve = (name: string, at: Span): ResolvedCell => {
    const done = cells.get(name);
    if (done) return done;
    if (tooDeep.has(name)) {
      for (const v of visiting) (tooDeep.add(v), broken.add(v));
      throw new Abort();
    }
    const d = decls.get(name)!;
    if (visiting.length >= MAX_SPLICE_DEPTH) {
      // (once: a chain of thousands would otherwise be reported once per 256 of its links)
      if (!tooDeep.size)
        error(
          `&${visiting[0]} splices cells into each other more than ${MAX_SPLICE_DEPTH} deep (&${visiting[0]} → &${visiting[1]} → … → &${name}): write a long chain as one braid`,
          at,
        );
      for (const v of [...visiting, name]) (tooDeep.add(v), broken.add(v));
      throw new Abort();
    }
    if (visiting.includes(name)) {
      error(`Circular reference: ${[...visiting.slice(visiting.indexOf(name)), name].map((n) => '&' + n).join(' → ')}`, at);
      throw new Abort();
    }
    visiting.push(name);
    const units = unitsOf(d);
    const children = new Map<string, number>();
    const unitSteps: number[] = [];
    const toks = d.braid.kind === 'list' ? d.braid.tokens : [];
    units.forEach((u, i) => {
      let unit = 1;
      if (u.atom.kind === 'ref') {
        const ref = u.atom.name;
        const span = toks[i]?.span ?? d.span;
        if (!decls.has(ref)) {
          // (a cell whose line failed: what uses it can't resolve either, and says nothing more)
          if (broken.has(ref)) for (const v of visiting) broken.add(v);
          unknownCell(ref, span);
          throw new Abort();
        }
        const child = resolve(ref, span);
        const picked = pickSteps(child, u.atom.pick);
        if (picked === null) {
          error(`&${ref}${pickText(u.atom.pick)} picks nothing — &${ref} has ${child.units.length} steps`, span);
          throw new Abort();
        }
        unit = picked;
        children.set(ref, (children.get(ref) ?? 0) + u.repeat * u.subdivide);
      }
      unitSteps.push(unit * u.elongate * u.repeat);
    });
    const steps = unitSteps.reduce((a, b) => a + b, 0);
    visiting.pop();
    const o = tableOf(d);
    const b = d.braid;
    const cell: ResolvedCell = {
      name,
      span: d.span,
      root: o === null,
      implicit: (name === ROOT && implicitRoot) || implicit.has(name),
      over: o === null ? null : (d.over?.name ?? null),
      overShift: d.over?.shift ?? 0,
      context: o ?? name,
      cycle: o === null ? gridSteps(d) : lengthOf(name),
      wrap: d.cycle ?? null,
      lambda: d.lambda ?? null,
      frees: d.frees ?? [],
      show: d.show ?? null,
      laps: d.laps ?? null,
      loops: !!d.step?.whole,
      chance: d.chance ?? 0.5,
      seed: d.seed ?? 0,
      size: d.size ?? 1,
      tags: (d.tags ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      about: (d.about ?? []).map((r) => r.name),
      beat: typeof d.params.beat === 'number' ? d.params.beat : ((d.braid as { perBeat?: number }).perBeat ?? 1),
      leveled: (d.braid as { perBeat?: number }).perBeat !== undefined,
      label: d.label ?? null,
      note:
        !!(d.label || d.title) &&
        d.braid.kind === 'blank' &&
        d.over === null &&
        d.step === null &&
        d.map === null &&
        d.cycle === null &&
        d.shift === null &&
        d.stride === null &&
        !d.off &&
        !d.frees?.length &&
        !d.env &&
        !d.pitch &&
        Object.keys(d.params).length === 0,
      env: d.env?.name ?? null,
      pitch: d.pitch?.name ?? null,
      braid: o === null ? 'blank' : b.kind,
      units,
      scan: b.kind === 'scan' ? { lap: scanOf(b.steps).lap, steps: b.steps } : null,
      shift: d.shift ?? 0,
      off: d.off,
      children,
      steps,
      unitSteps,
      hasValues: units.some((u) => u.atom.kind === 'note' || u.atom.kind === 'chord'),
      step:
        d.step?.kind === 'driven'
          ? {
              driver: d.step.driver.name,
              cycle: d.step.cycle,
              whole: d.step.whole,
              chain: d.step.chain,
            }
          : null,
      paramClocks: Object.fromEntries(
        Object.entries(d.paramClocks ?? {}).flatMap(([k, st]) =>
          st.kind === 'driven' ? [[k, { driver: st.driver.name, cycle: st.cycle, whole: st.whole, chain: st.chain }]] : [],
        ),
      ),
      map: d.map
        ? d.map.kind === 'table'
          ? { kind: 'table', table: d.map.table.name }
          : d.map.kind === 'edo'
            ? { kind: 'edo', period: d.map.period }
            : d.map.kind === 'ratios'
              ? { kind: 'ratios', ratios: d.braid.kind === 'list' ? d.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : NaN)) : [] }
              : { kind: d.map.kind }
        : null,
      // a mix: one chord of sounds — or, on a sound card, its channels written in place (all their voices)
      mix:
        units.length > 0 && units.every((u) => u.atom.kind === 'mix') && (units.length === 1 || d.map?.kind === 'sample')
          ? units.flatMap((u) => (u.atom.kind === 'mix' ? typed(u.atom) : []))
          : null,
      sink: d.map?.kind === 'sample',
      clock: null,
      rate: 0,
      stride: d.stride ?? 1,
      params: d.params,
      paramCells: Object.fromEntries(Object.entries(d.paramCells ?? {}).map(([k, v]) => [k, { range: v.range, factors: v.factors.map((f) => f.name) }])),
      // a sound parameter makes a voice; a physical cell's (motor=, write=, level= on the sound card …) doesn't
      voice: Object.keys(d.params).some((k) => VOICE_PARAMS.has(k)),
      freq:
        d.step?.kind === 'rate' || d.step?.kind === 'env'
          ? d.step.whole
            ? (rateOf(d.step) ?? DEFAULT_FREQ)
            : (rateOf(d.step) ?? DEFAULT_FREQ) / Math.max(1, steps)
          : DEFAULT_FREQ,
      kit: false,
    };
    cells.set(name, cell);
    return cell;
  };
  for (const [name, d] of decls) {
    if (!overOk.get(name)) continue;
    try {
      resolve(name, d.span);
    } catch (e) {
      if (!(e instanceof Abort)) throw e;
      visiting.length = 0;
    }
  }

  for (const [name, d] of decls) {
    const cell = cells.get(name);
    if (!cell || cell.root) continue;
    const o = cell.over ?? ROOT;
    if (!cells.get(o)?.root && d.braid.kind === 'list' && d.braid.tokens.some((t) => t.atom.kind === 'note' && !Number.isInteger(t.atom.value)))
      warn(`&${o} is a table, so decimal indexes are rounded down`, d.span);
  }
  return cells;
}
