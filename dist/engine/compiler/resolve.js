import { isNote } from "../ast.js";
import { footOf, innerSteps, leaves } from "../subseq.js";
import { DEFAULT_FREQ, MAX_SPLICE_DEPTH, ROOT, pickProblem, pickSteps } from "../program.js";
import { VOICE_PARAMS } from "../attributes.js";
import { scan as scanOf } from "../../theory/modes.js";
import { beatCount, meterOfLevels, meterOfScan, noteValue, stepsPerPulse, withBeats, withPulse, withSwing, bareSwingLevel } from "../meter.js";
import { gridSteps, lengthOf as lengthIn, tableOf, unitsOf as unitsIn } from "./tables.js";
class Abort extends Error {
}
function meterOf(d) {
    const { braid: b, params } = d;
    const { beat, pulse } = params;
    const written = b.kind === 'scan'
        ? meterOfScan(b.steps)
        : b.kind === 'list' && b.perBeat !== undefined
            ? meterOfLevels(b.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : 0)), b.signature)
            : null;
    const whole = b.kind === 'scan' && typeof pulse === 'string' ? noteValue(pulse) : null;
    const m = written && whole ? withPulse(written, whole) : written;
    const beaten = m && typeof beat === 'number' && beat > 0 ? withBeats(m, beat) : m;
    const felt = beaten && d.legato ? { ...beaten, legato: d.legato.flatMap((l) => (noteValue(l.level) === null ? [] : [{ ...l, whole: noteValue(l.level) }])) } : beaten;
    if (!felt || typeof params.swing !== 'number')
        return felt;
    const levels = d.swing ?? [{ level: bareSwingLevel(felt) ?? '', share: params.swing }];
    return withSwing(felt, levels.flatMap((l) => {
        const whole = noteValue(l.level);
        return whole === null ? [] : [{ level: l.level, whole, share: l.share }];
    }));
}
export const stepsPerBeat = (m) => (m ? (stepsPerPulse(m) * m.pulses) / beatCount(m) : 1);
export function resolveCells(ctx, { decls, implicit, implicitRoot, overOk }, typed) {
    const { rateOf, error, warn, broken, unknownCell } = ctx;
    const cells = new Map();
    const lengthOf = (name) => lengthIn(decls, name);
    const unitsOf = (d) => unitsIn(decls, d);
    const visiting = [];
    const tooDeep = new Set();
    const resolve = (name, at) => {
        const done = cells.get(name);
        if (done)
            return done;
        if (tooDeep.has(name)) {
            for (const v of visiting)
                (tooDeep.add(v), broken.add(v));
            throw new Abort();
        }
        const d = decls.get(name);
        if (visiting.length >= MAX_SPLICE_DEPTH) {
            if (!tooDeep.size)
                error(`&${visiting[0]} splices cells into each other more than ${MAX_SPLICE_DEPTH} deep (&${visiting[0]} → &${visiting[1]} → … → &${name}): write a long chain as one braid`, at);
            for (const v of [...visiting, name])
                (tooDeep.add(v), broken.add(v));
            throw new Abort();
        }
        if (visiting.includes(name)) {
            error(`Circular reference: ${[...visiting.slice(visiting.indexOf(name)), name].map((n) => '&' + n).join(' → ')}`, at);
            throw new Abort();
        }
        visiting.push(name);
        const units = unitsOf(d);
        const children = new Map();
        const unitSteps = [];
        const toks = d.braid.kind === 'list' ? d.braid.tokens : [];
        const splice = (a, span, times) => {
            const ref = a.name;
            if (!decls.has(ref)) {
                if (broken.has(ref))
                    for (const v of visiting)
                        broken.add(v);
                unknownCell(ref, span);
                throw new Abort();
            }
            const child = resolve(ref, span);
            const picked = pickSteps(child, a.pick);
            if (picked === null) {
                error(pickProblem(ref, a.pick, child.units.length), span);
                throw new Abort();
            }
            children.set(ref, (children.get(ref) ?? 0) + times);
            return picked;
        };
        units.forEach((u, i) => {
            let unit = 1;
            const span = toks[i]?.span ?? d.span;
            if (u.atom.kind === 'ref')
                unit = splice(u.atom, span, u.repeat * u.subdivide);
            const inner = new Map();
            for (const t of innerSteps(u.atom))
                if (t.atom.kind === 'ref')
                    inner.set(t.atom, splice(t.atom, t.span ?? span, t.repeat * t.subdivide));
            if (u.atom.kind === 'seq')
                unit = footOf(u.atom, (x) => inner.get(x) || 1);
            unitSteps.push(unit * u.elongate * u.repeat);
        });
        const steps = unitSteps.reduce((a, b) => a + b, 0);
        visiting.pop();
        const o = tableOf(d);
        const b = d.braid;
        const cell = {
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
            ...(d.paramSpans?.show ? { showSpan: d.paramSpans.show } : {}),
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
            ...(d.base ? { base: { name: d.base.name, ...(d.base.transpose ? { transpose: d.base.transpose } : {}), ...(d.base.degree ? { degree: d.base.degree } : {}) } } : {}),
            beat: stepsPerBeat(meterOf(d)),
            meter: meterOf(d),
            label: d.label ?? null,
            note: isNote(d),
            env: d.env?.name ?? null,
            pitch: d.pitch?.name ?? null,
            braid: o === null ? 'blank' : b.kind,
            units,
            scan: b.kind === 'scan' ? { lap: scanOf(b.steps).lap, steps: b.steps } : null,
            shift: d.shift ?? 0,
            off: d.off,
            oneshot: !!d.oneshot,
            glide: typeof d.params.glide === 'number' && d.params.glide > 0 ? d.params.glide : 0,
            children,
            steps,
            unitSteps,
            hasValues: units.some((u) => leaves(u.atom).some((a) => a.kind === 'note' || a.kind === 'chord')),
            step: d.step?.kind === 'driven'
                ? {
                    driver: d.step.driver.name,
                    cycle: d.step.cycle,
                    whole: d.step.whole,
                    chain: d.step.chain,
                }
                : null,
            paramClocks: Object.fromEntries(Object.entries(d.paramClocks ?? {}).flatMap(([k, st]) => st.kind === 'driven' ? [[k, { driver: st.driver.name, cycle: st.cycle, whole: st.whole, chain: st.chain }]] : [])),
            map: d.map
                ? d.map.kind === 'table'
                    ? { kind: 'table', table: d.map.table.name }
                    : d.map.kind === 'edo'
                        ? { kind: 'edo', period: d.map.period }
                        : d.map.kind === 'ratios'
                            ? { kind: 'ratios', ratios: d.braid.kind === 'list' ? d.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : NaN)) : [] }
                            : d.map.kind === 'midi'
                                ? { kind: 'midi', channel: d.map.channel, port: d.map.port }
                                : { kind: d.map.kind }
                : null,
            mix: units.length > 0 && units.every((u) => u.atom.kind === 'mix') && (units.length === 1 || d.map?.kind === 'sample') && d.map?.kind !== 'midi'
                ? units.flatMap((u) => (u.atom.kind === 'mix' ? typed(u.atom) : []))
                : null,
            sink: d.map?.kind === 'sample',
            ...(d.map?.kind === 'midi' ? { chords: units.map((u) => (u.atom.kind === 'mix' ? typed(u.atom) : null)) } : {}),
            clock: null,
            rate: 0,
            stride: d.stride ?? 1,
            params: d.params,
            paramCells: Object.fromEntries(Object.entries(d.paramCells ?? {}).map(([k, v]) => [k, { range: v.range, factors: v.factors.map((f) => f.name) }])),
            voice: Object.keys(d.params).some((k) => VOICE_PARAMS.has(k)),
            freq: d.step?.kind === 'rate' || d.step?.kind === 'env'
                ? d.step.whole
                    ? (rateOf(d.step) ?? DEFAULT_FREQ)
                    : (rateOf(d.step) ?? DEFAULT_FREQ) / Math.max(1, steps)
                : DEFAULT_FREQ,
            kit: false,
            ...(d.gate ? { gate: d.gate } : {}),
        };
        cells.set(name, cell);
        return cell;
    };
    for (const [name, d] of decls) {
        if (!overOk.get(name))
            continue;
        try {
            resolve(name, d.span);
        }
        catch (e) {
            if (!(e instanceof Abort))
                throw e;
            visiting.length = 0;
        }
    }
    for (const [name, d] of decls) {
        const cell = cells.get(name);
        if (!cell || cell.root)
            continue;
        const o = cell.over ?? ROOT;
        if (!cells.get(o)?.root && d.braid.kind === 'list' && d.braid.tokens.some((t) => t.atom.kind === 'note' && !Number.isInteger(t.atom.value)))
            warn(`&${o} is a table, so decimal indexes are rounded down`, d.span);
    }
    return cells;
}
