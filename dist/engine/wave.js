import { flatten } from "./flatten.js";
import { lookup } from "./helix.js";
export function waveform(result, voice, shifts, samples = 256) {
    const c = result.cells.get(voice);
    const total = Math.max(1, c.steps);
    const events = flatten(result, voice, shifts);
    const map = c.map ?? { kind: 'amp' };
    const raw = (e) => (map.kind === 'table' ? lookup(result, map.table, e.value, shifts).value : e.value) + e.alter;
    const points = [...new Set(events.map((e) => e.step))]
        .sort((a, b) => a - b)
        .map((step) => {
        const at = events.filter((e) => Math.abs(e.step - step) < 1e-9);
        return { step, value: at.reduce((a, e) => a + raw(e), 0) / at.length };
    });
    const ramped = (p) => {
        let i = points.length - 1;
        for (let k = 0; k < points.length; k++)
            if (points[k].step <= p + 1e-9)
                i = k;
        const a = points[i];
        const b = points[(i + 1) % points.length];
        const from = a.step > p + 1e-9 ? a.step - total : a.step;
        const to = b.step <= from + 1e-9 ? b.step + total : b.step;
        return a.value + ((b.value - a.value) * (p - from)) / Math.max(1e-9, to - from);
    };
    const vals = Array.from({ length: samples }, (_, n) => {
        const p = (n / samples) * total;
        if (map.kind === 'lin' && points.length > 1)
            return ramped(p);
        const here = events.filter((e) => p >= e.step - 1e-9 && p < e.step + e.duration - 1e-9);
        return here.length ? here.reduce((a, e) => a + raw(e), 0) / here.length : null;
    });
    const out = new Float32Array(samples);
    const present = vals.filter((v) => v !== null);
    const lo = Math.min(...present);
    const hi = Math.max(...present);
    vals.forEach((v, n) => (out[n] = v === null || hi === lo ? 0 : ((v - lo) / (hi - lo)) * 2 - 1));
    return out;
}
export function harmonics(x, count = 64) {
    const N = x.length;
    const real = new Float32Array(count + 1);
    const imag = new Float32Array(count + 1);
    for (let k = 1; k <= count; k++) {
        let a = 0;
        let b = 0;
        for (let n = 0; n < N; n++) {
            const th = (2 * Math.PI * k * n) / N;
            a += x[n] * Math.cos(th);
            b += x[n] * Math.sin(th);
        }
        real[k] = (2 * a) / N;
        imag[k] = (2 * b) / N;
    }
    return { real, imag };
}
