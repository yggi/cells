import { isPicked, period, shiftedUnits } from "./helix.js";
import { beltWarp, onReset, warpOf } from "./physics.js";
import { mod } from "../theory/modes.js";
export const EPS = 1e-9;
export function timeMap(result, clock, shifts) {
    if (clock.tap)
        return tapMap(clock.tap, plainMap(result, result.clocks.get(clock.tap.meter), shifts));
    const plain = plainMap(result, clock, shifts);
    return clock.swung ? swungMap(clock.swung, plain) : plain;
}
function swungMap(swung, inner) {
    const k = Math.max(1, swung.length);
    const at = (i) => (i < k ? swung[i] : k);
    const S = (s) => {
        const j = Math.floor(s);
        const b = Math.floor(j / k);
        const i = j - b * k;
        return b * k + at(i) + (s - j) * (at(i + 1) - at(i));
    };
    const back = (x) => {
        const b = Math.floor(x / k);
        const r = x - b * k;
        let i = 0;
        while (i + 1 < k && at(i + 1) <= r)
            i++;
        const span = at(i + 1) - at(i);
        return b * k + i + (span > 0 ? (r - at(i)) / span : 0);
    };
    return { beats: inner.beats, q: (s) => inner.q(S(s)), stepAt: (t) => back(inner.stepAt(t)), ...(inner.speed ? { speed: inner.speed } : {}) };
}
function plainMap(result, clock, shifts) {
    if (!clock.positional && clock.swing !== undefined) {
        const sw = Math.min(0.95, Math.max(0.05, clock.swing));
        const ps = clock.perSecond;
        const q = (s) => {
            const pair = Math.floor(s / 2);
            const f = s / 2 - pair;
            return (2 * pair + 2 * (f < 0.5 ? (f / 0.5) * sw : sw + ((f - 0.5) / 0.5) * (1 - sw))) / ps;
        };
        const stepAt = (t) => {
            const x = (t * ps) / 2;
            const pair = Math.floor(x);
            const f = x - pair;
            return 2 * (pair + (f < sw ? (f / sw) * 0.5 : 0.5 + ((f - sw) / (1 - sw)) * 0.5));
        };
        return { beats: 1, q, stepAt };
    }
    if (!clock.positional)
        return { beats: 1, q: (s) => s / clock.perSecond, stepAt: (t) => t * clock.perSecond };
    const name = clock.cell;
    const values = shiftedUnits(result, name, shifts(name)).flatMap((u) => (u.atom.kind === 'note' ? [u.atom.value + u.atom.alter] : []));
    const k = Math.max(1, values.length);
    const lap = period(result, name);
    const barSeconds = k / clock.perSecond;
    const ticks = (j) => values[mod(j, k)] + lap * Math.floor(j / k);
    const raw = (s) => {
        const j = Math.floor(s);
        const t0 = ticks(j);
        return ((t0 + (s - j) * (ticks(j + 1) - t0)) / lap) * barSeconds;
    };
    const origin = raw(0);
    const q = (s) => raw(s) - origin;
    const stepAt = (t) => {
        let j = Math.floor(t / barSeconds) * k;
        while (q(j + 1) <= t)
            j++;
        while (j > 0 && q(j) > t)
            j--;
        const a = q(j);
        const b = q(j + 1);
        return j + (b > a ? (t - a) / (b - a) : 0);
    };
    return { beats: k, q, stepAt };
}
function tapMap(tap, meter) {
    const { positions, lap } = tap;
    const k = Math.max(1, positions.length);
    if (positions.every((p, i) => Math.abs(p - (i * lap) / k) < 1e-9))
        return { beats: k, q: (j) => meter.q((j * lap) / k), stepAt: (t) => (meter.stepAt(t) * k) / lap, ...(meter.speed ? { speed: meter.speed } : {}) };
    const at = (i) => (i < k ? positions[i] : lap);
    const meterStep = (j) => {
        const n = Math.floor(j);
        const b = Math.floor(n / k);
        const i = n - b * k;
        return b * lap + at(i) + (j - n) * (at(i + 1) - at(i));
    };
    const stepAt = (t) => {
        const m = meter.stepAt(t);
        const b = Math.floor(m / lap);
        const r = m - b * lap;
        let i = 0;
        while (i + 1 < k && at(i + 1) <= r)
            i++;
        const span = at(i + 1) - at(i);
        return b * k + i + (span > 0 ? (r - at(i)) / span : 0);
    };
    return { beats: k, q: (j) => meter.q(meterStep(j)), stepAt, ...(meter.speed ? { speed: meter.speed } : {}) };
}
export function playedCells(result) {
    const out = new Set();
    const walk = (n) => {
        if (out.has(n))
            return;
        out.add(n);
        const c = result.cells.get(n);
        for (const k of c?.children.keys() ?? []) {
            const refs = c.units.flatMap((u) => (u.atom.kind === 'ref' && u.atom.name === k ? [u.atom] : []));
            if (!refs.length || !refs.every((r) => isPicked(result, k, r.pick)))
                walk(k);
        }
    };
    for (const o of result.outputs)
        for (const t of [...(o.drone ? [] : [o]), ...o.mods, ...o.levels])
            walk(t.cell);
    return out;
}
const belts = new WeakMap();
const built = new WeakMap();
onReset((r) => {
    belts.delete(r);
    built.delete(r);
});
export function physicsOf(result, statics, cell) {
    const c = result.cells.get(cell);
    if (!c)
        return null;
    if (typeof c.params.motor === 'number')
        return warpOf(result, cell);
    if (typeof c.params.belt === 'number' && result.clocks.get(cell)?.belt) {
        clocking(result, statics).map(cell);
        return belts.get(result)?.get(cell) ?? null;
    }
    return null;
}
export function varispeedOf(result, clock) {
    const v = result.cells.get(result.clocks.get(clock)?.cell ?? '')?.params.varispeed;
    return typeof v === 'number' ? v : 0;
}
export function clocking(result, statics, seconds = 0) {
    let byShifts = built.get(result);
    if (!byShifts)
        built.set(result, (byShifts = new WeakMap()));
    const maps = byShifts.get(statics) ?? new Map();
    byShifts.set(statics, maps);
    const map = (clock) => {
        let m = maps.get(clock);
        if (!m) {
            const info = result.clocks.get(clock);
            if (info.tap)
                m = tapMap(info.tap, base(info.tap.meter));
            else
                m = info.swung ? swungMap(info.swung, base(clock)) : base(clock);
            maps.set(clock, m);
        }
        return m;
    };
    const base = (clock) => {
        let m = maps.get(`${clock}\0plain`);
        if (!m) {
            const info = result.clocks.get(clock);
            if (info.belt) {
                const drv = result.clocks.get(info.belt.driver);
                const idealD = timeMap(result, drv, statics);
                const moving = map(info.belt.driver);
                const cell = result.cells.get(info.cell);
                const num = (key, dflt) => (typeof cell.params[key] === 'number' ? cell.params[key] : dflt);
                const k = Math.max(1e-3, num('belt', 200));
                const mass = Math.max(1e-3, num('mass', 1));
                const c = num('damping', 0.6 * Math.sqrt(k * mass));
                let byClock = belts.get(result);
                if (!byClock)
                    belts.set(result, (byClock = new Map()));
                let bw = byClock.get(clock);
                if (!bw)
                    byClock.set(clock, (bw = beltWarp(result, k, mass, c, num('slip', Infinity), (t) => idealD.q(moving.stepAt(t)))));
                const belt = bw;
                const rate = info.belt.rate;
                m = { beats: 1, q: (st) => belt.real(idealD.q(st / rate)), stepAt: (t) => idealD.stepAt(belt.nominal(t)) * rate, speed: (t) => belt.speed(t) };
            }
            else {
                const ideal = plainMap(result, info, statics);
                const w = warpOf(result, info.cell);
                m = w ? { beats: ideal.beats, q: (st) => w.real(ideal.q(st)), stepAt: (t) => ideal.stepAt(w.nominal(t)), speed: (t) => w.speed(t) } : ideal;
            }
            maps.set(`${clock}\0plain`, m);
        }
        return m;
    };
    return { map, stepOf: (clock) => map(clock).stepAt(Math.max(0, seconds)) };
}
export function shiftsAt(result, statics, seconds, played = playedCells(result)) {
    const clk = clocking(result, statics, seconds);
    const steps = new Map();
    return (name) => {
        const base = statics(name);
        const c = result.cells.get(name);
        if (!c || !c.step || !c.clock || played.has(name) || result.clocks.has(name) || selects(result, name) || c.loops)
            return base;
        let s = steps.get(c.clock);
        if (s === undefined)
            steps.set(c.clock, (s = clk.stepOf(c.clock)));
        const turns = Math.floor(c.rate * s + EPS) * c.stride;
        const wrap = c.wrap ?? (c.units.length || c.cycle);
        return base + (wrap > 0 ? mod(turns, wrap) : turns);
    };
}
export function selects(result, name) {
    const table = result.cells.get(name)?.over ?? '';
    const t = result.cells.get(table);
    return !!t && t.units.length > 0 && t.units.every((u) => u.atom.kind === 'ref' && result.taps?.get(u.atom.name) === table);
}
export function tapeMotion(result, clk, tape) {
    const tc = result.cells.get(tape);
    const info = tc?.clock ? result.clocks.get(tc.clock) : undefined;
    const moving = tc?.clock && info ? clk.map(tc.clock) : null;
    const per = info ? info.perSecond : 1;
    const pos = (x) => (moving ? moving.stepAt(Math.max(0, x)) / per : x);
    const real = (u) => (u <= 0 ? 0 : moving ? moving.q(u * per) : u);
    const speed = (x) => Math.max(1e-3, (pos(x + 0.01) - pos(Math.max(0, x - 0.01))) / (x + 0.01 - Math.max(0, x - 0.01)));
    return { pos, real, speed, moving };
}
