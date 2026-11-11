import { clocking } from "./clocking.js";
import { mainMeter } from "./midiclock.js";
function beatClock(p) {
    if (!p.result.ok)
        return null;
    const meter = mainMeter(p.result);
    if (meter)
        return meter.cell;
    const first = p.tracks[0]?.clock;
    return first && p.result.clocks.has(first) ? first : null;
}
export function keepBeat(before, after, seconds) {
    const was = beatClock(before);
    const now = beatClock(after);
    if (!was || !now || !(seconds > 0))
        return seconds;
    const steps = clocking(before.result, before.statics).map(was).stepAt(seconds);
    const at = clocking(after.result, after.statics).map(now).q(steps);
    return Number.isFinite(at) && at >= 0 ? at : seconds;
}
