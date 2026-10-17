/** Phase 4: time — clocks (cells moved at a rate), every cell's steps per step of its clock, times given as clocks. */
import type { CellDecl, Tap } from '../ast';
import { isPositional, type Clock } from '../program';
import { bareSwingLevel, noteValue, stepsPerPulse, swingAt, swingLevelProblem, swungSteps, tapPositions } from '../meter';
import type { Cells, Ctx } from './context';

/** A tap's clock's name: the meter's, the tap and its bars (`bar:16n`, `bar:1n:4`); no cell can be called that. */
export const tapClockName = (meter: string, tap: Tap, bars: number) => `${meter}:${tap.written}${bars > 1 ? `:${bars}` : ''}`;

/**
 * The tap that says what `step=&bar<chain>` says on a meter of `meterSteps` steps and `pulses` pulses of note value `unit`
 * (decision 040): the bar (`1m`, `1m/4`), a note value where a bar holds a whole number of them (`8n`, `4t`), else the
 * pulse with the chain (`pulse*3/4`). Exact: each steps where the raw step did.
 */
export function tapFor(meterSteps: number, pulses: number, unit: number, ratio: number): string {
  const k = (ratio * meterSteps) / Math.max(1, pulses); // (steps a pulse)
  const perBar = k * pulses;
  const whole = (x: number) => Math.abs(x - Math.round(x)) < 1e-9 && Math.round(x) > 0;
  const pow2 = (x: number) => whole(x) && Number.isInteger(Math.log2(Math.round(x))) && Math.round(x) <= 64;
  if (whole(1 / perBar)) return Math.round(1 / perBar) === 1 ? '1m' : `1m/${Math.round(1 / perBar)}`;
  if (whole(perBar)) {
    if (pow2(k * unit) && Math.round(k * unit) > 1) return `${Math.round(k * unit)}n`;
    if (pow2((2 * k * unit) / 3)) return `${Math.round((2 * k * unit) / 3)}t`;
  }
  return `pulse${chainOf(k)}`;
}

/** A ratio as a chain: '' for 1, *2, /4, *3/2. */
function chainOf(x: number): string {
  if (Math.abs(x - 1) < 1e-9) return '';
  const r = fraction(x);
  return r ? (r[1] === 1 ? `*${r[0]}` : r[0] === 1 ? `/${r[1]}` : `*${r[0]}/${r[1]}`) : `*${+x.toFixed(6)}`;
}

/** A chain as written: *3/2. */
const chainText = (chain: readonly { op: '×' | '÷'; n: number }[]) => chain.map((o) => `${o.op === '×' ? '*' : '/'}${o.n}`).join('');

/** x as a small fraction n/d (d ≤ 64), or null. */
function fraction(x: number): [number, number] | null {
  for (let d = 1; d <= 64; d++) {
    const n = Math.round(x * d);
    if (n > 0 && Math.abs(n / d - x) < 1e-9) return [n, d];
  }
  return null;
}

/** The clocks; each cell's clock, rate and times given as clocks, set on a copy of the cells it is given. */
export function clockCells(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, given: Cells): { cells: Cells; clocks: ReadonlyMap<string, Clock>; mainMeter: string | null } {
  const { rateOf, error, warn, unknownCell, broken } = ctx;
  const cells = new Map(given);
  const clocks = new Map<string, Clock>();
  // ---- clocks: non-voice cells moved at a rate
  for (const [name, d] of decls) {
    const c = cells.get(name);
    if (!c || c.voice || c.kit || (d.step?.kind !== 'rate' && d.step?.kind !== 'env')) continue;
    const r = rateOf(d.step);
    if (r === null) continue;
    // (decision 040: beat= states a meter's beats; its old meaning, steps a beat, is gone)
    if (typeof d.params.beat === 'number' && !c.meter)
      warn(`beat= says how many beats a meter(…) or scan(…) counts (alla breve: meter("4/4") beat=2); on &${name}, a list, it does nothing`, d.paramSpans?.beat ?? d.span);
    if (d.params.pulse !== undefined && (d.braid.kind !== 'scan' || typeof d.params.pulse !== 'string' || noteValue(d.params.pulse) === null))
      warn(
        `pulse= says the note value of a scan's entries (pulse=16n: sixteenths, its bpm counting quarters); ${d.braid.kind === 'scan' ? `${d.params.pulse} is not one (16n, 8t, 4n.)` : `on &${name}, not a scan, it does nothing`}`,
        d.paramSpans?.pulse ?? d.span,
      );
    // the bpm counts beats (decision 040): a meter's steps a beat, from its pulses and beats (beat= on it, or meter(…)) —
    // so a meter can step in eighths and still read 96 for its quarter notes, and 7/8 at 90 is a bar of 2 s
    const perSecond = (d.step.whole ? r * Math.max(1, c.steps) : r) * (d.step.whole ? 1 : c.beat);
    // swing= (#18): on a meter, levels of its bar (a bare one, the level of its own steps); on a list, pairs of its steps
    const swingSpan = d.paramSpans?.swing ?? d.span;
    let swing: number | undefined;
    let swung: number[] | null = null;
    const share = (x: number) => String(x).replace(/^0\./, '.');
    if (typeof d.params.swing === 'number' && c.meter) {
      const m = c.meter;
      if (!d.swing) {
        const level = bareSwingLevel(m);
        const whole = level === null ? null : noteValue(level);
        const leans = whole !== null && swingLevelProblem(m, whole) === null;
        warn(
          leans
            ? `swing=${share(d.params.swing)} leans the meter cell's own steps: name the level it leans, swing=${level}:${share(d.params.swing)}`
            : `swing=${share(d.params.swing)} leans the meter cell's own steps, and they are its beats, which swing never moves: name the level it leans, swing=8n:${share(d.params.swing)}`,
          swingSpan,
        );
      }
      for (const l of d.swing ?? []) {
        const whole = noteValue(l.level);
        const problem = whole === null ? `${l.level} is not a note value (8n, 16n, 8t)` : swingLevelProblem(m, whole);
        if (problem) warn(`swing=${l.level}:${share(l.share)} leans nothing on &${name}: ${problem}`, swingSpan);
      }
      swung = swungSteps(m);
    } else if (typeof d.params.swing === 'number' && d.swing)
      warn(
        `swing=${d.swing.map((l) => `${l.level}:${share(l.share)}`).join(',')} leans levels of a meter, and &${name} is not one: write swing=${share(d.params.swing)} (pairs of its steps)`,
        swingSpan,
      );
    else if (typeof d.params.swing === 'number' && d.params.swing !== 0.5) swing = d.params.swing;
    clocks.set(name, { cell: name, perSecond, positional: isPositional(c), ...(swing !== undefined ? { swing } : {}), ...(swung ? { swung } : {}) });
  }

  // ---- step= / loop= chains: every cell's steps per step of its clock
  // (a driven meter — a scan that drives other cells, like swung eighths — becomes a clock of its own:
  //  its rate from its driver's, its positions bending its own lap)
  const drivers = new Set(
    [...decls.values()].flatMap((d) => (d.step?.kind === 'driven' ? [d.step.driver.name] : d.step?.kind === 'tap' && d.step.meter ? [d.step.meter.name] : [])),
  );
  const timing = new Map<string, { clock: string; rate: number } | null>();
  const stepping: string[] = [];
  // the piece's main meter, which a tap that names none reads (decision 040): the first meter in the text with a tempo
  // of its own (a lap of a day, loop=1d, only when there is no other)
  let main: string | null | undefined;
  // (each tapped cell's meter: its step names it)
  const tapped = new Map<string, string>();
  const mainMeter = (): string | null => {
    if (main !== undefined) return main;
    const meters = [...decls.values()].filter((d) => clocks.has(d.name) && cells.get(d.name)?.meter);
    main = (meters.find((d) => !d.step?.whole) ?? meters[0])?.name ?? null;
    return main;
  };
  // a tap of a meter (decision 040): a clock of its own, its steps where the tap puts them in the bar, through the
  // meter's time map; its chain steps it as a chain steps any clock
  const tapOf = (name: string, st: Extract<NonNullable<CellDecl['step']>, { kind: 'tap' }>): { clock: string; rate: number } | null => {
    const meter = st.meter?.name ?? mainMeter();
    const spelled = `step=${st.meter ? `&${st.meter.name}:` : ''}${st.tap.written}`;
    if (!meter) {
      error(`${spelled} taps the piece's main meter, and it has none: write one (&bar meter("4/4") step=100bpm)`, st.span);
      broken.add(name); // (said once: what plays it isn't told again that nothing starts notes)
      return null;
    }
    if (!decls.has(meter)) {
      unknownCell(meter, st.meter!.span);
      broken.add(name);
      return null;
    }
    if (stepping.includes(meter)) {
      error(`step= loops back: ${[...stepping.slice(stepping.indexOf(meter)), meter].map((n) => '&' + n).join(' → ')}`, st.span);
      return null;
    }
    const d = timeOf(meter);
    const m = cells.get(meter)?.meter;
    if (!m || !d || d.clock !== meter) {
      error(
        `${spelled}: &${meter} is not a meter that keeps time — a tap reads a meter(…) or scan(…) with a tempo (&${meter} meter("4/4") step=100bpm)`,
        st.meter?.span ?? st.span,
      );
      broken.add(name);
      return null;
    }
    tapped.set(name, meter);
    const bars = Math.max(1, Math.round(decls.get(name)?.cycle ?? 1));
    // (a swung meter, #18: a chain of k on the tap is k steps between each two of its own, each placed through the swing,
    //  so step=pulse*2 swings as step=8n does)
    const split = m.swing && Number.isInteger(st.ratio) && st.ratio > 1 ? st.ratio : 1;
    const key = tapClockName(meter, st.tap, bars) + (split > 1 ? `*${split}` : '');
    if (!clocks.has(key)) {
      const per = stepsPerPulse(m);
      const plain = tapPositions(m, st.tap, bars);
      const lapPulses = m.pulses * bars;
      const fine = plain.flatMap((p, i) => Array.from({ length: split }, (_, k) => p + (k * ((plain[i + 1] ?? lapPulses) - p)) / split));
      const positions = fine.map((p) => swingAt(m, p) * per);
      const lap = m.levels.length * bars;
      clocks.set(key, { cell: meter, perSecond: (clocks.get(meter)!.perSecond * positions.length) / lap, positional: false, tap: { meter, positions, lap } });
    }
    const ratio = st.ratio / split;
    // (a scan tapped that drives others, scan(2 1) step=8n: a meter of its own, as one stepped by &bar is)
    const c = cells.get(name);
    if (c?.scan && drivers.has(name)) {
      clocks.set(name, { cell: name, perSecond: clocks.get(key)!.perSecond * ratio, positional: true });
      return { clock: name, rate: 1 };
    }
    // (a belt on a tap: the cell follows the tap through a spring, as it follows a meter's steps)
    if (c && typeof decls.get(name)?.params.belt === 'number') {
      clocks.set(name, { cell: name, perSecond: clocks.get(key)!.perSecond * ratio, positional: false, belt: { driver: key, rate: ratio } });
      return { clock: name, rate: 1 };
    }
    return { clock: key, rate: ratio };
  };
  const timeOf = (name: string): { clock: string; rate: number } | null => {
    if (timing.has(name)) return timing.get(name)!;
    if (clocks.has(name)) {
      timing.set(name, { clock: name, rate: 1 });
      return timing.get(name)!;
    }
    const st = decls.get(name)?.step;
    if (st?.kind === 'tap' && !cells.get(name)?.voice) {
      stepping.push(name);
      const t = tapOf(name, st);
      stepping.pop();
      timing.set(name, t);
      return t;
    }
    if (!st || st.kind !== 'driven' || cells.get(name)?.voice) {
      timing.set(name, null);
      return null;
    }
    const drv = st.driver.name;
    const what = st.whole ? 'loop=' : 'step=';
    let result: { clock: string; rate: number } | null = null;
    if (!decls.has(drv)) unknownCell(drv, st.driver.span);
    else if (stepping.includes(drv) || drv === name) error(`${what} loops back: ${[...stepping.slice(stepping.indexOf(drv)), name, drv].map((n) => '&' + n).join(' → ')}`, st.span);
    else if (cells.get(drv)?.voice) error(`&${drv} is a voice: it moves at audio rate`, st.driver.span);
    else {
      stepping.push(name);
      const d = timeOf(drv);
      stepping.pop();
      const lap = cells.get(drv)?.steps ?? 0;
      const own = cells.get(name)?.steps ?? 0;
      if (d && !st.whole && !st.cycle && cells.get(drv)?.meter && clocks.has(drv)) {
        // (decision 040: a line taps the meter, never its cell's own steps; the tap named says the same)
        const m = cells.get(drv)!.meter!;
        // (a meter stepped by another, scan(2 1) step=&bar: its pulses are its steps, no note value)
        const tap = tapFor(m.levels.length, m.pulses, decls.get(drv)?.step?.kind === 'rate' ? m.unit : 0, st.ratio);
        warn(
          `step=&${drv}${chainText(st.chain)} steps by the meter cell's own steps: tap the meter by pulse, beat or a note value (step=${mainMeter() === drv ? '' : `&${drv}:`}${tap})`,
          st.span,
        );
      }
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
    const st = decls.get(c.name)?.step;
    // (a tap's step names its meter: the graph draws it as a step of the meter)
    const meter = tapped.get(c.name);
    const step = st?.kind === 'tap' ? (t && meter ? { driver: meter, cycle: false, whole: false, chain: st.chain, tap: st.tap.written } : null) : c.step;
    if (t) cells.set(c.name, { ...c, clock: t.clock, rate: t.rate, step });
    else if (step !== c.step) cells.set(c.name, { ...c, step });
  }
  // times given as a clock (delaytime=&bar*2): one step of it, in seconds, at the clock's tempo
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
  return { cells, clocks, mainMeter: mainMeter() };
}
