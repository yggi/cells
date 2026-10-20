import { flatten } from "../flatten.js";
import { gmDrumNote } from "../midi.js";
import { codeShifts } from "../program.js";
import { tapWhole } from "./lines.js";
const KICK = 36;
const SNARE = 38;
export function backbeatOf(meter) {
    const beats = meter.beats.length;
    const starts = meter.beats.map((_, i) => meter.beats.slice(0, i).reduce((sum, b) => sum + b, 0) / meter.unit);
    return starts.filter((_, beat) => (beats <= 3 ? beat > 0 : beat % 2 === 1));
}
const near = (a, b) => Math.abs(a - b) < 1e-9;
function onBackbeat(line) {
    if (!line.meter || line.stepWhole === null)
        return false;
    const bar = line.meter.pulses / line.meter.unit;
    const backbeat = backbeatOf(line.meter);
    return line.notes.every((n) => {
        const at = (n.step * line.stepWhole) % bar;
        return backbeat.some((b) => near(at, b) || near(at, b + bar));
    });
}
const strikes = (line, note) => line.notes.length > 0 && line.notes.every((n) => gmDrumNote(n.voice.slice(1)) === note);
function changesOf(result, table) {
    const cell = result.cells.get(table);
    if (!cell?.step)
        return null;
    const whole = tapWhole(cell.step.tap, result.cells.get(cell.step.driver)?.meter ?? null);
    if (whole === null)
        return null;
    const chords = new Map();
    for (const e of flatten(result, table, codeShifts(result)))
        chords.set(e.step, [...(chords.get(e.step) ?? []), e.value + e.alter]);
    if (![...chords.values()].some((c) => c.length > 1))
        return null;
    const steps = [...chords.keys()].sort((a, b) => a - b);
    const sorted = (c) => [...c].sort((a, b) => a - b).join(',');
    const changes = steps.filter((s, k) => k === 0 || sorted(chords.get(s)) !== sorted(chords.get(steps[k - 1]))).map((s) => ({ at: s * whole, size: chords.get(s).length }));
    return { lap: cell.steps * whole, changes };
}
function rootsOf(line, result) {
    if (!line.pitched?.table || line.stepWhole === null)
        return [];
    const harmony = changesOf(result, line.pitched.table);
    if (!harmony)
        return [];
    const lap = line.steps * line.stepWhole;
    const round = (x) => near(x % harmony.lap, 0) || near(x % harmony.lap, harmony.lap);
    let laps = 1;
    while (laps < 64 && !round(laps * lap))
        laps++;
    return line.notes.flatMap((n) => {
        const p = n.pitch;
        if (typeof p.written !== 'number' || p.table !== `${line.pitched.table}:0` || p.alter || p.transpose)
            return [];
        const landed = Array.from({ length: laps }, (_, k) => (n.step * line.stepWhole + k * lap) % harmony.lap).flatMap((at) => harmony.changes.filter((c) => near(c.at, at) || near(c.at + harmony.lap, at)));
        const root = (size) => ((p.value % size) + size) % size === 0;
        return landed.length && landed.every((c) => root(c.size)) ? [{ line: line.name, step: n.step, reason: 'root' }] : [];
    });
}
export function anchorsAmong(lines, result) {
    return lines.flatMap((line) => line.pitched
        ? rootsOf(line, result)
        : strikes(line, KICK)
            ? [{ line: line.name, reason: 'kick' }]
            : strikes(line, SNARE) && onBackbeat(line)
                ? [{ line: line.name, reason: 'backbeat' }]
                : []);
}
