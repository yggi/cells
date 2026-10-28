import { clocking, EPS } from "./clocking.js";
export const PPQN = 24;
const meters = new WeakMap();
export function mainMeter(result) {
    if (meters.has(result))
        return meters.get(result);
    let found = null;
    const first = result.ok ? result.outputs.map((o) => result.cells.get(o.cell)?.clock).find((c) => !!c) : undefined;
    let name = first && result.clocks.get(first)?.tap ? result.clocks.get(first).tap.meter : first;
    for (let guard = 0; name && guard < 16; guard++) {
        const driver = result.cells.get(name)?.step?.driver;
        if (!driver || !result.clocks.has(driver))
            break;
        const by = result.clocks.get(driver);
        if (result.cells.get(name)?.meter && !result.cells.get(driver)?.meter && !by.positional && by.swing === undefined && !by.swung)
            break;
        name = driver;
    }
    const root = name ? result.clocks.get(name) : undefined;
    const cell = name ? result.cells.get(name) : undefined;
    if (root && cell && !root.belt) {
        const leads = [...result.cells.values()].some((c) => c.name !== cell.name && c.step?.driver === cell.name);
        if (root.positional || cell.meter || root.swing !== undefined || !!root.swung || cell.beat !== 1 || leads)
            found = { cell: cell.name, beat: cell.beat > 0 ? cell.beat : 1 };
    }
    meters.set(result, found);
    return found;
}
export function ticksBetween(p, from, to) {
    const meter = mainMeter(p.result);
    if (!meter || !(to > from))
        return null;
    const map = clocking(p.result, p.statics).map(meter.cell);
    const per = meter.beat / PPQN;
    const end = Math.min(to, p.end);
    const tick = (k) => (k < 0 ? -Infinity : map.q(k * per));
    const s = map.stepAt(Math.max(0, from));
    let k = Number.isFinite(s) ? Math.max(0, Math.floor(s / per - EPS) - 1) : 0;
    while (tick(k) < from && Number.isFinite(tick(k)))
        k++;
    while (k > 0 && tick(k - 1) >= from)
        k--;
    const at = [];
    for (let j = k; at.length < 100_000; j++) {
        const t = tick(j);
        if (!(t < end))
            break;
        at.push(t);
    }
    return at.length ? { first: k, at, before: tick(k - 1) } : null;
}
