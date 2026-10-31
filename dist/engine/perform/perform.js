import { midiNote, routesOf } from "../midi.js";
import { CONTRACT_WIDTHS, played, readingOf } from "./feel.js";
import { swungAt, writtenAt } from "./swing.js";
const CHANNELS = new Set([1, 2, 3, 10]);
export function perform(e, route, at, read = readingOf, widths = () => CONTRACT_WIDTHS) {
    const reading = read(e.output);
    const r = routesOf(route(e)).find((x) => CHANNELS.has(x.channel));
    const sent = r && midiNote(e, r);
    if (!reading || e.held || !sent)
        return { event: e, performance: null };
    const { frame } = at;
    const groups = frame.groups;
    const swing = [frame.swing];
    const steps = 2 * groups.reduce((a, b) => a + b, 0);
    const stepsOf = (seconds) => ((seconds - at.start) / at.seconds) * steps;
    const onset = writtenAt(stepsOf(e.at), groups, swing);
    const step = Math.round(onset);
    const length = writtenAt(stepsOf(e.at + Math.max(0, e.dur)), groups, swing) - onset;
    const p = played(frame, { ...reading, step, note: sent.note, velocity: sent.velocity, length }, undefined, widths(e.output));
    const amp = (e.levels[0]?.level ?? 1) * Math.abs(r.gain ?? Math.max(Math.abs(e.gains[0]), Math.abs(e.gains[1])));
    const k = amp > 0 ? (p.velocity / 127) ** 2 / amp : 1;
    const levels = e.levels.length ? e.levels.map((l) => ({ ...l, level: l.level * k })) : [{ at: e.at, level: k }];
    const end = at.start + (swungAt(step + p.length, groups, swing) / steps) * at.seconds;
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
