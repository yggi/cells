import { fft, pow2 } from "./fft.js";
const W0 = 6;
const FOURIER = (4 * Math.PI) / (W0 + Math.sqrt(2 + W0 * W0));
export const PER_OCTAVE = 12;
export const MOST_RATE = 50;
const MOST_SAMPLES = 2 ** 18;
const FINE = 4096;
export function grid(window, most = MOST_RATE, periodic = false) {
    let rate = Math.min(most, MOST_SAMPLES / window);
    if (periodic)
        rate = Math.min(pow2(Math.ceil(window * rate)), MOST_SAMPLES) / window;
    const periods = [];
    for (let p = rate < MOST_RATE ? 8 / rate : 1 / 16; p <= window / 3; p *= Math.pow(2, 1 / PER_OCTAVE))
        periods.push(p);
    return { window, rate, periods, ...(periodic ? { periodic } : {}) };
}
export function transform(x, g) {
    const n = g.periodic ? x.length : pow2(x.length * 2);
    const xr = new Float64Array(n);
    const xi = new Float64Array(n);
    const mean = x.reduce((a, v) => a + v, 0) / (x.length || 1);
    for (let i = 0; i < x.length; i++)
        xr[i] = x[i] - mean;
    fft(xr, xi);
    const columns = Math.max(1, Math.min(x.length, FINE));
    const rows = g.periods.map((p) => {
        const s = p / FOURIER;
        const re = new Float64Array(n);
        const im = new Float64Array(n);
        for (let k = 1; k < n / 2; k++) {
            const w = (2 * Math.PI * k * g.rate) / n;
            const h = Math.pow(Math.PI, -0.25) * Math.sqrt((2 * Math.PI * s * g.rate) / n) * Math.exp(-((s * w - W0) ** 2) / 2);
            re[k] = xr[k] * h;
            im[k] = xi[k] * h;
        }
        fft(re, im, true);
        const row = new Float32Array(columns);
        for (let c = 0; c < columns; c++) {
            const i = Math.floor(((c + 0.5) / columns) * x.length);
            row[c] = (re[i] ** 2 + im[i] ** 2) / n ** 2 / s;
        }
        return row;
    });
    return { window: g.window, periods: g.periods, rows, ...(g.periodic ? { periodic: true } : {}) };
}
export const sum = (a, b) => ({ ...a, rows: a.rows.map((r, i) => r.map((v, c) => v + b.rows[i][c])) });
export const reach = (period, window, k = 1) => Math.min(0.5, (k * Math.SQRT2 * (period / FOURIER)) / window);
export function byRow(s) {
    return s.rows.map((r, i) => {
        const edge = Math.min(Math.floor(r.length * reach(s.periods[i], s.window, 2)), Math.floor(r.length / 2) - 1);
        let acc = 0;
        for (let c = edge; c < r.length - edge; c++)
            acc += r[c];
        const mean = acc / (r.length - 2 * edge) || 1;
        return r.map((v) => v / mean);
    });
}
export function fold(s, cycle, rounds) {
    if (rounds <= 1)
        return s;
    const cols = s.rows[0]?.length ?? 0;
    const per = Math.max(1, Math.round((cols * cycle) / s.window));
    const rows = s.rows.map((r, i) => {
        const edge = s.periodic ? 0 : reach(s.periods[i], s.window, 2) * cols;
        const out = new Float32Array(per);
        for (let c = 0; c < per; c++) {
            let acc = 0;
            let n = 0;
            for (let k = 0; k < rounds; k++) {
                const at = k * per + c;
                if (at < cols && at >= edge && at < cols - edge) {
                    acc += r[at];
                    n++;
                }
            }
            out[c] = n ? acc / n : NaN;
        }
        return out;
    });
    return { window: cycle, periods: s.periods, rows, ...(s.periodic ? { periodic: true } : {}) };
}
export function ridges(s, most = 4) {
    const mean = s.rows.map((r, i) => {
        const edge = s.periodic ? 0 : Math.min(Math.floor(r.length * reach(s.periods[i], s.window, 2)), Math.floor(r.length / 2) - 1);
        let acc = 0;
        let n = 0;
        for (let c = edge; c < r.length - edge; c++)
            if (Number.isFinite(r[c])) {
                acc += r[c];
                n++;
            }
        return n ? acc / n : 0;
    });
    const top = Math.max(0, ...mean);
    const longest = s.window / 6;
    const found = [];
    for (let i = 1; i < mean.length - 1; i++)
        if (s.periods[i] <= longest && mean[i] > mean[i - 1] && mean[i] >= mean[i + 1] && mean[i] > 0.05 * top)
            found.push({ period: s.periods[i], strength: mean[i] / top });
    return found.sort((a, b) => b.strength - a.strength).slice(0, most);
}
