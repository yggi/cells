import { isPositional } from "../program.js";
import { bareSwingLevel, noteValue, stepsPerPulse, swingAt, swingLevelProblem, swungSteps, tapPositions } from "../meter.js";
export const tapClockName = (meter, tap, bars) => `${meter}:${tap.written}${bars > 1 ? `:${bars}` : ''}`;
export function tapFor(meterSteps, pulses, unit, ratio) {
    const k = (ratio * meterSteps) / Math.max(1, pulses);
    const perBar = k * pulses;
    const whole = (x) => Math.abs(x - Math.round(x)) < 1e-9 && Math.round(x) > 0;
    const pow2 = (x) => whole(x) && Number.isInteger(Math.log2(Math.round(x))) && Math.round(x) <= 64;
    if (whole(1 / perBar))
        return Math.round(1 / perBar) === 1 ? '1m' : `1m/${Math.round(1 / perBar)}`;
    if (whole(perBar)) {
        if (pow2(k * unit) && Math.round(k * unit) > 1)
            return `${Math.round(k * unit)}n`;
        if (pow2((2 * k * unit) / 3))
            return `${Math.round((2 * k * unit) / 3)}t`;
    }
    return `pulse${chainOf(k)}`;
}
function chainOf(x) {
    if (Math.abs(x - 1) < 1e-9)
        return '';
    const r = fraction(x);
    return r ? (r[1] === 1 ? `*${r[0]}` : r[0] === 1 ? `/${r[1]}` : `*${r[0]}/${r[1]}`) : `*${+x.toFixed(6)}`;
}
const chainText = (chain) => chain.map((o) => `${o.op === '×' ? '*' : '/'}${o.n}`).join('');
function fraction(x) {
    for (let d = 1; d <= 64; d++) {
        const n = Math.round(x * d);
        if (n > 0 && Math.abs(n / d - x) < 1e-9)
            return [n, d];
    }
    return null;
}
export function clockCells(ctx, decls, given) {
    const { rateOf, error, warn, unknownCell, broken } = ctx;
    const cells = new Map(given);
    const clocks = new Map();
    for (const [name, d] of decls) {
        const c = cells.get(name);
        if (!c || c.voice || c.kit || (d.step?.kind !== 'rate' && d.step?.kind !== 'env'))
            continue;
        const r = rateOf(d.step);
        if (r === null)
            continue;
        if (typeof d.params.beat === 'number' && !c.meter)
            warn(`beat= says how many beats a meter(…) or scan(…) counts (alla breve: meter("4/4") beat=2); on &${name}, a list, it does nothing`, d.paramSpans?.beat ?? d.span);
        if (d.params.pulse !== undefined && (d.braid.kind !== 'scan' || typeof d.params.pulse !== 'string' || noteValue(d.params.pulse) === null))
            warn(`pulse= says the note value of a scan's entries (pulse=16n: sixteenths, its bpm counting quarters); ${d.braid.kind === 'scan' ? `${d.params.pulse} is not one (16n, 8t, 4n.)` : `on &${name}, not a scan, it does nothing`}`, d.paramSpans?.pulse ?? d.span);
        const perSecond = (d.step.whole ? r * Math.max(1, c.steps) : r) * (d.step.whole ? 1 : c.beat);
        const swingSpan = d.paramSpans?.swing ?? d.span;
        let swing;
        let swung = null;
        const share = (x) => String(x).replace(/^0\./, '.');
        if (typeof d.params.swing === 'number' && c.meter) {
            const m = c.meter;
            if (!d.swing) {
                const level = bareSwingLevel(m);
                const whole = level === null ? null : noteValue(level);
                const leans = whole !== null && swingLevelProblem(m, whole) === null;
                warn(leans
                    ? `swing=${share(d.params.swing)} leans the meter cell's own steps: name the level it leans, swing=${level}:${share(d.params.swing)} (Migrate rewrites it)`
                    : `swing=${share(d.params.swing)} leans the meter cell's own steps, and they are its beats, which swing never moves: name the level it leans, swing=8n:${share(d.params.swing)}`, swingSpan);
            }
            for (const l of d.swing ?? []) {
                const whole = noteValue(l.level);
                const problem = whole === null ? `${l.level} is not a note value (8n, 16n, 8t)` : swingLevelProblem(m, whole);
                if (problem)
                    warn(`swing=${l.level}:${share(l.share)} leans nothing on &${name}: ${problem}`, swingSpan);
            }
            swung = swungSteps(m);
        }
        else if (typeof d.params.swing === 'number' && d.swing)
            warn(`swing=${d.swing.map((l) => `${l.level}:${share(l.share)}`).join(',')} leans levels of a meter, and &${name} is not one: write swing=${share(d.params.swing)} (pairs of its steps)`, swingSpan);
        else if (typeof d.params.swing === 'number' && d.params.swing !== 0.5)
            swing = d.params.swing;
        clocks.set(name, { cell: name, perSecond, positional: isPositional(c), ...(swing !== undefined ? { swing } : {}), ...(swung ? { swung } : {}) });
    }
    const drivers = new Set([...decls.values()].flatMap((d) => (d.step?.kind === 'driven' ? [d.step.driver.name] : d.step?.kind === 'tap' && d.step.meter ? [d.step.meter.name] : [])));
    const timing = new Map();
    const stepping = [];
    let main;
    const tapped = new Map();
    const mainMeter = () => {
        if (main !== undefined)
            return main;
        const meters = [...decls.values()].filter((d) => clocks.has(d.name) && cells.get(d.name)?.meter);
        main = (meters.find((d) => !d.step?.whole) ?? meters[0])?.name ?? null;
        return main;
    };
    const meterOfTap = (st, spelled, broke) => {
        const meter = st.meter?.name ?? mainMeter();
        if (!meter) {
            error(`${spelled} taps the piece's main meter, and it has none: write one (&bar meter("4/4") step=100bpm)`, st.span);
            broke();
            return null;
        }
        if (!decls.has(meter)) {
            unknownCell(meter, st.meter.span);
            broke();
            return null;
        }
        if (stepping.includes(meter)) {
            error(`step= loops back: ${[...stepping.slice(stepping.indexOf(meter)), meter].map((n) => '&' + n).join(' → ')}`, st.span);
            return null;
        }
        const d = timeOf(meter);
        const m = cells.get(meter)?.meter;
        if (!m || !d || d.clock !== meter) {
            error(`${spelled}: &${meter} is not a meter that keeps time — a tap reads a meter(…) or scan(…) with a tempo (&${meter} meter("4/4") step=100bpm)`, st.meter?.span ?? st.span);
            broke();
            return null;
        }
        return meter;
    };
    const tapOf = (name, st) => {
        const spelled = `step=${st.meter ? `&${st.meter.name}:` : ''}${st.tap.written}`;
        const meter = meterOfTap(st, spelled, () => broken.add(name));
        if (!meter)
            return null;
        const m = cells.get(meter).meter;
        tapped.set(name, meter);
        const bars = Math.max(1, Math.round(decls.get(name)?.cycle ?? 1));
        const split = m.swing && Number.isInteger(st.ratio) && st.ratio > 1 ? st.ratio : 1;
        const key = tapClockName(meter, st.tap, bars) + (split > 1 ? `*${split}` : '');
        if (!clocks.has(key)) {
            const per = stepsPerPulse(m);
            const plain = tapPositions(m, st.tap, bars);
            const lapPulses = m.pulses * bars;
            const fine = plain.flatMap((p, i) => Array.from({ length: split }, (_, k) => p + (k * ((plain[i + 1] ?? lapPulses) - p)) / split));
            const positions = fine.map((p) => swingAt(m, p) * per);
            const lap = m.levels.length * bars;
            clocks.set(key, { cell: meter, perSecond: (clocks.get(meter).perSecond * positions.length) / lap, positional: false, tap: { meter, positions, lap } });
        }
        const ratio = st.ratio / split;
        const c = cells.get(name);
        if (c?.scan && drivers.has(name)) {
            clocks.set(name, { cell: name, perSecond: clocks.get(key).perSecond * ratio, positional: true });
            return { clock: name, rate: 1 };
        }
        if (c && typeof decls.get(name)?.params.belt === 'number') {
            clocks.set(name, { cell: name, perSecond: clocks.get(key).perSecond * ratio, positional: false, belt: { driver: key, rate: ratio } });
            return { clock: name, rate: 1 };
        }
        return { clock: key, rate: ratio };
    };
    const timeOf = (name) => {
        if (timing.has(name))
            return timing.get(name);
        if (clocks.has(name)) {
            timing.set(name, { clock: name, rate: 1 });
            return timing.get(name);
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
        let result = null;
        if (!decls.has(drv))
            unknownCell(drv, st.driver.span);
        else if (stepping.includes(drv) || drv === name)
            error(`${what} loops back: ${[...stepping.slice(stepping.indexOf(drv)), name, drv].map((n) => '&' + n).join(' → ')}`, st.span);
        else if (cells.get(drv)?.voice)
            error(`&${drv} is a voice: it moves at audio rate`, st.driver.span);
        else {
            stepping.push(name);
            const d = timeOf(drv);
            stepping.pop();
            const lap = cells.get(drv)?.steps ?? 0;
            const own = cells.get(name)?.steps ?? 0;
            if (d && !st.whole && !st.cycle && cells.get(drv)?.meter && clocks.has(drv)) {
                const m = cells.get(drv).meter;
                const tap = tapFor(m.levels.length, m.pulses, decls.get(drv)?.step?.kind === 'rate' ? m.unit : 0, st.ratio);
                warn(`step=&${drv}${chainText(st.chain)} steps by the meter cell's own steps: tap the meter by pulse, beat or a note value (step=${mainMeter() === drv ? '' : `&${drv}:`}${tap}; Migrate rewrites it)`, st.span);
            }
            if (!d)
                warn(`&${drv} never moves, so &${name} stands still — give &${drv} a rate (step=84bpm) or ${what}&cell`, st.driver.span);
            else if (st.cycle && lap === 0)
                error(`&${drv} has no cycle to count`, st.driver.span);
            else if (st.whole && own === 0)
                error(`&${name} has no steps to loop`, st.span);
            else {
                result = { clock: d.clock, rate: (d.rate * st.ratio * (st.whole ? own : 1)) / (st.cycle ? lap : 1) };
                const c = cells.get(name);
                if (c && c.scan && drivers.has(name) && !st.whole) {
                    clocks.set(name, { cell: name, perSecond: clocks.get(d.clock).perSecond * result.rate, positional: true });
                    result = { clock: name, rate: 1 };
                }
                else if (c && typeof decls.get(name)?.params.belt === 'number' && !st.whole) {
                    clocks.set(name, { cell: name, perSecond: clocks.get(d.clock).perSecond * result.rate, positional: false, belt: { driver: d.clock, rate: result.rate } });
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
        const meter = tapped.get(c.name);
        const step = st?.kind === 'tap' ? (t && meter ? { driver: meter, cycle: false, whole: false, chain: st.chain, tap: st.tap.written } : null) : c.step;
        if (t)
            cells.set(c.name, { ...c, clock: t.clock, rate: t.rate, step });
        else if (step !== c.step)
            cells.set(c.name, { ...c, step });
    }
    for (const d of decls.values())
        for (const [key, st] of Object.entries(d.paramClocks ?? {})) {
            if (st.kind === 'tap') {
                const c = cells.get(d.name);
                const meter = meterOfTap(st, `${key}=${st.meter ? `&${st.meter.name}:` : ''}${st.tap.written}`, () => { });
                if (!meter || !c)
                    continue;
                const m = cells.get(meter).meter;
                const barSeconds = m.levels.length / clocks.get(meter).perSecond;
                const step = st.tap.kind === 'note' ? (st.tap.whole * m.unit * barSeconds) / m.pulses : barSeconds / tapPositions(m, st.tap, 1).length;
                const perSecond = st.ratio / step;
                cells.set(d.name, {
                    ...c,
                    params: { ...c.params, [key]: +(1 / perSecond).toFixed(6) },
                    paramClocks: { ...c.paramClocks, [key]: { driver: meter, cycle: false, whole: false, chain: st.chain, tap: st.tap.written } },
                });
                continue;
            }
            if (st.kind !== 'driven')
                continue;
            const drv = timeOf(st.driver.name);
            const c = cells.get(d.name);
            if (!drv || !c) {
                error(`${key}=&${st.driver.name}: that cell keeps no time`, st.span);
                continue;
            }
            const perSecond = clocks.get(drv.clock).perSecond * drv.rate * st.ratio;
            cells.set(d.name, { ...c, params: { ...c.params, [key]: +(1 / perSecond).toFixed(6) } });
        }
    return { cells, clocks, mainMeter: mainMeter() };
}
