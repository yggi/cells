import { gmDrumNote } from "../midi.js";
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
export function anchorsAmong(lines) {
    return lines.flatMap((line) => strikes(line, KICK) ? [{ line: line.name, reason: 'kick' }] : strikes(line, SNARE) && onBackbeat(line) ? [{ line: line.name, reason: 'backbeat' }] : []);
}
