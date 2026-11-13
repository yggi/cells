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
const GRAIN = 24;
function barSteps(p, clock) {
    const levels = p.result.cells.get(clock)?.meter?.levels.length;
    return Math.max(1, levels ?? clocking(p.result, p.statics).map(clock).beats);
}
function warped(before, was, after, now, b, bar) {
    const old = clocking(before.result, before.statics);
    const next = clocking(after.result, after.statics);
    if (old.map(was).speed || next.map(now).speed) {
        const bend = (p, clock) => JSON.stringify(p.result.cells.get(clock)?.bend ?? null);
        return JSON.stringify(old.swingOf(was, b)) !== JSON.stringify(next.swingOf(now, b)) || bend(before, was) !== bend(after, now);
    }
    const shares = (clk, clock) => {
        const map = clk.played(clock);
        const start = map.q(b * bar);
        const length = map.q((b + 1) * bar) - start;
        return Array.from({ length: bar * GRAIN - 1 }, (_, i) => (map.q(b * bar + (i + 1) / GRAIN) - start) / length);
    };
    const was$ = shares(old, was);
    const now$ = shares(next, now);
    return !was$.every((x, i) => Math.abs(x - now$[i]) < 1e-9);
}
export function keepBar(before, after, seconds) {
    const was = beatClock(before);
    const now = beatClock(after);
    if (!was || !now || !(seconds > 0))
        return null;
    const bar = barSteps(before, was);
    if (barSteps(after, now) !== bar)
        return null;
    const old = clocking(before.result, before.statics).map(was);
    const steps = old.stepAt(seconds);
    if (!Number.isFinite(steps))
        return null;
    const b = Math.floor(steps / bar + 1e-9);
    const next = (b + 1) * bar;
    if (Math.abs(steps - b * bar) < 1e-9)
        return null;
    if (!warped(before, was, after, now, b, bar))
        return null;
    const line = old.q(next);
    return Number.isFinite(line) && line > seconds ? { line, at: keepBeat(before, after, line) } : null;
}
