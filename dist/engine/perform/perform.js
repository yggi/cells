import { midiNote, routesOf } from "../midi.js";
import { CONTRACT_WIDTHS, played } from "./feel.js";
import { meterOfFrame, swungPlace, writtenPlace } from "../meter.js";
const CHANNELS = new Set([1, 2, 3, 10]);
export function perform(e, route, at, read = () => null, widths = () => CONTRACT_WIDTHS) {
    const reading = read(e.output);
    const r = routesOf(route(e)).find((x) => CHANNELS.has(x.channel));
    const sent = r && midiNote(e, r);
    if (!reading || e.held || !sent)
        return { event: e, performance: null };
    const { frame } = at;
    const meter = meterOfFrame(frame.groups, [frame.swing]);
    const steps = 2 * meter.pulses;
    const stepsOf = (seconds) => ((seconds - at.start) / at.seconds) * steps;
    const writtenStep = (s) => 2 * writtenPlace(meter, s / 2);
    const onset = writtenStep(stepsOf(e.at));
    const step = Math.round(onset);
    const length = writtenStep(stepsOf(e.at + Math.max(0, e.dur))) - onset;
    const p = played(frame, { ...reading, step, note: sent.note, velocity: sent.velocity, length }, undefined, widths(e.output));
    const amp = (e.levels[0]?.level ?? 1) * Math.abs(r.gain ?? Math.max(Math.abs(e.gains[0]), Math.abs(e.gains[1])));
    const k = amp > 0 ? (p.velocity / 127) ** 2 / amp : 1;
    const levels = e.levels.length ? e.levels.map((l) => ({ ...l, level: l.level * k })) : [{ at: e.at, level: k }];
    const end = at.start + ((2 * swungPlace(meter, (step + p.length) / 2)) / steps) * at.seconds;
    const dur = end > e.at ? end - e.at : e.dur;
    return { event: { ...e, levels, dur }, performance: { bar: at.bar, ...reading, step, note: sent.note, velocity: p.velocity, length: p.length } };
}
export function widthsOf(result) {
    const byOutput = new Map();
    for (const o of result.outputs)
        for (const name of [...o.via, ...o.through]) {
            const params = result.cells.get(name)?.params;
            if (!params || (typeof params.licence !== 'number' && typeof params.accents !== 'number'))
                continue;
            byOutput.set(o.id, {
                licence: typeof params.licence === 'number' ? params.licence : CONTRACT_WIDTHS.licence,
                accents: typeof params.accents === 'number' ? params.accents : CONTRACT_WIDTHS.accents,
            });
            break;
        }
    return (output) => (output !== undefined && byOutput.get(output)) || CONTRACT_WIDTHS;
}
