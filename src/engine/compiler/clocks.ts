/** Phase 4: time — clocks (cells moved at a rate), every cell's steps per step of its clock, times given as clocks. */
import type { CellDecl } from '../ast';
import { isPositional, type Clock } from '../program';
import type { Cells, Ctx } from './context';

/** The clocks; each cell's clock, rate and times given as clocks, set on a copy of the cells it is given. */
export function clockCells(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, given: Cells): { cells: Cells; clocks: ReadonlyMap<string, Clock> } {
  const { rateOf, error, warn } = ctx;
  const cells = new Map(given);
  const clocks = new Map<string, Clock>();
  // ---- clocks: non-voice cells moved at a rate
  for (const [name, d] of decls) {
    const c = cells.get(name);
    if (!c || c.voice || c.kit || (d.step?.kind !== 'rate' && d.step?.kind !== 'env')) continue;
    const r = rateOf(d.step);
    if (r === null) continue;
    // the bpm counts beats: beat= steps a beat (given, or from meter(…)) — so a meter can step in
    // sixteenths and still read 96 for its quarter notes
    const beat = typeof d.params.beat === 'number' ? d.params.beat : ((d.braid as { perBeat?: number }).perBeat ?? 1);
    const perSecond = (d.step.whole ? r * Math.max(1, c.steps) : r) * (d.step.whole ? 1 : beat);
    const swing = typeof d.params.swing === 'number' && d.params.swing !== 0.5 ? d.params.swing : undefined;
    clocks.set(name, { cell: name, perSecond, positional: isPositional(c), ...(swing !== undefined ? { swing } : {}) });
  }

  // ---- step= / loop= chains: every cell's steps per step of its clock
  // (a driven meter — a scan that drives other cells, like swung eighths — becomes a clock of its own:
  //  its rate from its driver's, its positions bending its own lap)
  const drivers = new Set([...decls.values()].flatMap((d) => (d.step?.kind === 'driven' ? [d.step.driver.name] : [])));
  const timing = new Map<string, { clock: string; rate: number } | null>();
  const stepping: string[] = [];
  const timeOf = (name: string): { clock: string; rate: number } | null => {
    if (timing.has(name)) return timing.get(name)!;
    if (clocks.has(name)) {
      timing.set(name, { clock: name, rate: 1 });
      return timing.get(name)!;
    }
    const st = decls.get(name)?.step;
    if (!st || st.kind !== 'driven' || cells.get(name)?.voice) {
      timing.set(name, null);
      return null;
    }
    const drv = st.driver.name;
    const what = st.whole ? 'loop=' : 'step=';
    let result: { clock: string; rate: number } | null = null;
    if (!decls.has(drv)) error(`Unknown cell &${drv}`, st.driver.span);
    else if (stepping.includes(drv) || drv === name) error(`${what} loops back: ${[...stepping.slice(stepping.indexOf(drv)), name, drv].map((n) => '&' + n).join(' → ')}`, st.span);
    else if (cells.get(drv)?.voice) error(`&${drv} is a voice: it moves at audio rate`, st.driver.span);
    else {
      stepping.push(name);
      const d = timeOf(drv);
      stepping.pop();
      const lap = cells.get(drv)?.steps ?? 0;
      const own = cells.get(name)?.steps ?? 0;
      if (!d) warn(`&${drv} never moves, so &${name} stands still — give &${drv} a rate (step=84bpm) or ${what}&cell`, st.driver.span);
      else if (st.cycle && lap === 0) error(`&${drv} has no cycle to count`, st.driver.span);
      else if (st.whole && own === 0) error(`&${name} has no steps to loop`, st.span);
      else {
        result = { clock: d.clock, rate: (d.rate * st.ratio * (st.whole ? own : 1)) / (st.cycle ? lap : 1) };
        const c = cells.get(name);
        if (c && c.scan && drivers.has(name) && !st.whole) {
          clocks.set(name, { cell: name, perSecond: clocks.get(d.clock)!.perSecond * result.rate, positional: true });
          result = { clock: name, rate: 1 };
        }
        // a belt: the cell follows its driver through a spring — a clock of its own, to stretch and slip
        else if (c && typeof decls.get(name)?.params.belt === 'number' && !st.whole) {
          clocks.set(name, { cell: name, perSecond: clocks.get(d.clock)!.perSecond * result.rate, positional: false, belt: { driver: d.clock, rate: result.rate } });
          result = { clock: name, rate: 1 };
        }
      }
    }
    timing.set(name, result);
    return result;
  };
  for (const c of [...cells.values()]) {
    const t = timeOf(c.name);
    if (t) cells.set(c.name, { ...c, clock: t.clock, rate: t.rate });
  }
  // times given as a clock (delaytime=&bar/2): one step of it, in seconds, at the clock's tempo
  for (const d of decls.values())
    for (const [key, st] of Object.entries(d.paramClocks ?? {})) {
      if (st.kind !== 'driven') continue;
      const drv = timeOf(st.driver.name);
      const c = cells.get(d.name);
      if (!drv || !c) {
        error(`${key}=&${st.driver.name}: that cell keeps no time`, st.span);
        continue;
      }
      const perSecond = clocks.get(drv.clock)!.perSecond * drv.rate * st.ratio;
      cells.set(d.name, { ...c, params: { ...c.params, [key]: +(1 / perSecond).toFixed(6) } });
    }
  return { cells, clocks };
}
