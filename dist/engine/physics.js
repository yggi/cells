const HAND = 0.15;
const HOLD = 0.35;
const handAt = (hand, t) => {
    let h = null;
    for (const x of hand)
        if (x.t <= t)
            h = x;
    return h && h.speed !== null && t <= h.t + HOLD ? h.speed : null;
};
const family = new WeakMap();
const join = (result, w) => {
    let set = family.get(result);
    if (!set)
        family.set(result, (set = new Set()));
    set.add(w);
    return w;
};
export function grab(result, w, t, speed) {
    w.grab(t, speed);
    for (const other of family.get(result) ?? [])
        if (other !== w)
            other.cut(t);
}
export function resetPhysics(result) {
    warps.delete(result);
    family.delete(result);
    resets.forEach((f) => f(result));
}
const resets = [];
export const onReset = (f) => resets.push(f);
const DT = 0.002;
const HORIZON = 3600;
const warps = new WeakMap();
export function warpOf(result, clock) {
    let byClock = warps.get(result);
    if (!byClock)
        warps.set(result, (byClock = new Map()));
    if (!byClock.has(clock))
        byClock.set(clock, makeWarp(result, clock));
    return byClock.get(clock);
}
function makeWarp(result, clock) {
    const c = result.cells.get(clock);
    const num = (k, d) => (typeof c?.params[k] === 'number' ? c.params[k] : d);
    if (!c || typeof c.params.motor !== 'number')
        return null;
    const motor = Math.max(1e-6, num('motor', 1));
    let mass = Math.max(1e-6, num('mass', 1));
    let friction = Math.max(0, num('friction', 0));
    for (const d of result.cells.values()) {
        if (d.name === clock || d.step?.driver !== clock)
            continue;
        if (typeof d.params.mass === 'number')
            mass += d.params.mass;
        if (typeof d.params.friction === 'number')
            friction += d.params.friction;
    }
    const wind = num('wind', Infinity);
    const wow = num('wow', 0);
    const tau = [0];
    const vs = [0];
    let v = 0;
    let stopped = false;
    const hand = [];
    const extend = (until) => {
        while (!stopped && (tau.length - 1) * DT < Math.min(until, HORIZON)) {
            const t = (tau.length - 1) * DT;
            const spring = Number.isFinite(wind) ? Math.max(0, 1 - Math.pow(t / wind, 4)) : 1;
            const target = 1 + wow * Math.sin(2 * Math.PI * 0.55 * t);
            const held = handAt(hand, t);
            v += ((motor * (target - v) * spring - friction * v) / mass) * DT;
            if (held !== null)
                v += (held - v) * HAND;
            if (!Number.isFinite(v))
                v = 0;
            if (v < 0 && held === null)
                v = 0;
            tau.push(tau[tau.length - 1] + v * DT);
            vs.push(v);
            if (spring === 0 && held === null && v < 0.02)
                stopped = true;
        }
    };
    const cut = (t) => {
        const k = Math.max(1, Math.floor(t / DT));
        if (k >= tau.length)
            return;
        tau.length = k + 1;
        vs.length = k + 1;
        v = vs[k];
        stopped = false;
    };
    const last = () => ({ t: (tau.length - 1) * DT, s: tau[tau.length - 1] });
    return join(result, {
        grab(t, speed) {
            cut(t);
            hand.push({ t, speed });
        },
        cut,
        speed(t) {
            const h = 0.01;
            return Math.max(0, (this.nominal(t + h) - this.nominal(Math.max(0, t - h))) / (t + h - Math.max(0, t - h)));
        },
        stopsAt() {
            if (!Number.isFinite(wind))
                return null;
            extend(HORIZON);
            return stopped ? (tau.length - 1) * DT : null;
        },
        nominal(t) {
            if (t <= 0)
                return 0;
            extend(t + DT);
            const i = t / DT;
            if (i >= tau.length - 1) {
                const l = last();
                return stopped ? l.s : l.s + (t - l.t) * v;
            }
            const k = Math.floor(i);
            return tau[k] + (tau[k + 1] - tau[k]) * (i - k);
        },
        real(s) {
            if (s <= 0)
                return 0;
            const cap = (tau.length - 1) * DT + 60;
            while (!stopped && tau[tau.length - 1] < s && (tau.length - 1) * DT < Math.min(HORIZON, cap))
                extend((tau.length - 1) * DT + 10);
            if (tau[tau.length - 1] < s) {
                if (stopped || v <= 1e-9)
                    return Infinity;
                const l = last();
                return l.t + (s - l.s) / v;
            }
            let lo = 0;
            let hi = tau.length - 1;
            while (hi - lo > 1) {
                const mid = (lo + hi) >> 1;
                if (tau[mid] < s)
                    lo = mid;
                else
                    hi = mid;
            }
            const span = tau[hi] - tau[lo];
            return (lo + (span > 0 ? (s - tau[lo]) / span : 0)) * DT;
        },
    });
}
export function beltWarp(result, k, m, c, slip, x) {
    const ys = [0];
    const st = [{ y: 0, v: 0, off: 0, px: 0, stretch: 0, slipping: false }];
    let still = 0;
    let stopped = false;
    const hand = [];
    const extend = (until) => {
        while (!stopped && (ys.length - 1) * DT < Math.min(until, HORIZON)) {
            const t = (ys.length - 1) * DT;
            const prev = st[st.length - 1];
            let { y, v, off } = prev;
            const xt = x(t + DT);
            const xv = (xt - prev.px) / DT;
            let stretch = xt - off - y;
            let slipping = false;
            if (k * Math.abs(stretch) > slip) {
                const keep = (Math.sign(stretch) * slip) / k;
                off += stretch - keep;
                stretch = keep;
                slipping = true;
            }
            const held = handAt(hand, t);
            v += ((k * stretch + c * (xv - v)) / m) * DT;
            if (held !== null)
                v += (held - v) * HAND;
            if (!Number.isFinite(v))
                v = 0;
            y += v * DT;
            ys.push(Math.max(ys[ys.length - 1], y));
            st.push({ y, v, off, px: xt, stretch, slipping });
            still = Math.abs(xv) < 1e-6 && Math.abs(v) < 1e-4 && Math.abs(stretch) < 1e-4 && held === null ? still + DT : 0;
            if (still > 0.5)
                stopped = true;
        }
    };
    const cut = (t) => {
        const kk = Math.max(1, Math.floor(t / DT));
        if (kk >= ys.length)
            return;
        ys.length = kk + 1;
        st.length = kk + 1;
        still = 0;
        stopped = false;
    };
    const nominal = (t) => {
        if (t <= 0)
            return 0;
        extend(t + DT);
        const i = Math.min(t / DT, ys.length - 1);
        const kk = Math.floor(i);
        return kk >= ys.length - 1 ? ys[ys.length - 1] : ys[kk] + (ys[kk + 1] - ys[kk]) * (i - kk);
    };
    const w = {
        nominal,
        real(s) {
            if (s <= 0)
                return 0;
            const cap = (ys.length - 1) * DT + 60;
            while (!stopped && ys[ys.length - 1] < s && (ys.length - 1) * DT < Math.min(HORIZON, cap))
                extend((ys.length - 1) * DT + 10);
            if (ys[ys.length - 1] < s)
                return Infinity;
            let lo = 0;
            let hi = ys.length - 1;
            while (hi - lo > 1) {
                const mid = (lo + hi) >> 1;
                if (ys[mid] < s)
                    lo = mid;
                else
                    hi = mid;
            }
            const span = ys[hi] - ys[lo];
            return (lo + (span > 0 ? (s - ys[lo]) / span : 0)) * DT;
        },
        stopsAt: () => null,
        speed(t) {
            const h = 0.01;
            return Math.max(0, (nominal(t + h) - nominal(Math.max(0, t - h))) / (t + h - Math.max(0, t - h)));
        },
        grab(t, speed) {
            cut(t);
            hand.push({ t, speed });
        },
        cut,
        state(t) {
            if (t <= 0)
                return { stretch: 0, slipping: false };
            extend(t + DT);
            const i = Math.min(Math.floor(t / DT), st.length - 1);
            let slipping = false;
            for (let j = Math.max(0, i - 50); j <= i; j++)
                if (st[j].slipping)
                    slipping = true;
            return { stretch: st[i].stretch, slipping };
        },
    };
    return result ? join(result, w) : w;
}
