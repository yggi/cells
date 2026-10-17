import { PER_OCTAVE, byRow, reach } from "./wavelet.js";
function peaks(curve, near, from = 0, to = curve.length - 1) {
    const out = [];
    for (let c = Math.max(0, from); c <= Math.min(curve.length - 1, to); c++) {
        let top = true;
        for (let k = Math.max(0, c - near); k <= Math.min(curve.length - 1, c + near) && top; k++)
            if (curve[k] > curve[c] || (curve[k] === curve[c] && k < c))
                top = false;
        if (top)
            out.push(c);
    }
    return out;
}
export function cones(s, { fastest = 1, octaves = 1, merge = 1, loud = 1 } = {}) {
    const r = byRow(s);
    const { periods, window } = s;
    const cols = r[0]?.length ?? 0;
    const secondsOf = (c) => ((c + 0.5) / cols) * window;
    const maxima = r.map((row, i) => {
        if (periods[i] < fastest)
            return [];
        const edge = Math.ceil(cols * reach(periods[i], window));
        return peaks(row, Math.max(1, Math.round((0.25 * periods[i] * cols) / window)), edge, cols - edge - 1).filter((c) => row[c] >= loud);
    });
    const taken = maxima.map(() => new Set());
    const found = [];
    for (let i = r.length - 1; i >= 0; i--)
        for (const c0 of maxima[i]) {
            if (taken[i].has(c0))
                continue;
            let c = c0;
            let score = 10 * Math.log10(r[i][c]);
            const path = [[secondsOf(c), periods[i]]];
            let j = i;
            while (j > 0 && maxima[j - 1].length) {
                const within = (0.25 * periods[j] * cols) / window;
                let best = -1;
                for (const m of maxima[j - 1])
                    if (Math.abs(m - c) <= within && (best < 0 || Math.abs(m - c) < Math.abs(best - c)))
                        best = m;
                if (best < 0)
                    break;
                j--;
                c = best;
                taken[j].add(c);
                score += 10 * Math.log10(r[j][c]);
                if ((i - j) % 6 === 0)
                    path.push([secondsOf(c), periods[j]]);
            }
            path.push([secondsOf(c), periods[j]]);
            if ((i - j) / PER_OCTAVE >= octaves)
                found.push({ at: secondsOf(c), top: periods[i], bottom: periods[j], score, path });
        }
    found.sort((a, b) => b.score - a.score);
    const kept = [];
    for (const x of found)
        if (!kept.some((k) => Math.abs(k.at - x.at) <= merge))
            kept.push(x);
    return kept;
}
export function swells(ss, span) {
    const { window } = ss[0] ?? { window: 0 };
    const cols = ss[0]?.rows[0]?.length ?? 0;
    const curve = new Float64Array(cols);
    let n = 0;
    for (const s of ss)
        byRow(s).forEach((row, i) => {
            if (s.periods[i] < span / 8 || s.periods[i] > span / 2)
                return;
            n++;
            for (let c = 0; c < cols; c++)
                curve[c] += 10 * Math.log10(Math.max(1e-6, row[c]));
        });
    if (!n)
        return [];
    const edge = Math.ceil(cols * reach(span / 2, window));
    return peaks(curve, Math.max(1, Math.round((span / 4 / window) * cols)), edge, cols - edge - 1)
        .map((c) => {
        const at = ((c + 0.5) / cols) * window;
        return { at, top: span, bottom: span / 8, score: curve[c] / n, path: [[at, span]] };
    })
        .sort((a, b) => b.score - a.score);
}
export function novelty(ss, span) {
    const { window } = ss[0] ?? { window: 0 };
    const cols = ss[0]?.rows[0]?.length ?? 0;
    const half = Math.max(1, Math.round((span / 2 / window) * cols));
    const sums = [];
    for (const s of ss)
        byRow(s).forEach((row, i) => {
            if (s.periods[i] > span / 2)
                return;
            const acc = new Float64Array(cols + 1);
            for (let c = 0; c < cols; c++)
                acc[c + 1] = acc[c] + 10 * Math.log10(Math.max(1e-6, row[c]));
            sums.push(acc);
        });
    const curve = new Float64Array(cols);
    for (let c = half; c <= cols - half; c++) {
        let acc = 0;
        for (const s of sums)
            acc += ((s[c + half] - s[c]) / half - (s[c] - s[c - half]) / half) ** 2;
        curve[c] = Math.sqrt(acc / Math.max(1, sums.length));
    }
    return peaks(curve, Math.max(1, Math.round(half / 2)), half, cols - half)
        .filter((c) => curve[c] > 0)
        .map((c) => {
        const at = ((c + 0.5) / cols) * window;
        return { at, top: span, bottom: span, score: curve[c], path: [[at, span]] };
    })
        .sort((a, b) => b.score - a.score);
}
export function score(found, written, window, tolerance, tall = 0) {
    const best = found.filter((c) => c.top >= tall).slice(0, written.length);
    const near = (t) => written.some((b) => Math.abs(b - t) <= tolerance);
    const hits = new Set(best.filter((c) => near(c.at)));
    let covered = 0;
    for (let k = 0; k < 1000; k++)
        if (near(((k + 0.5) / 1000) * window))
            covered++;
    return {
        precision: best.length ? hits.size / best.length : 0,
        recall: written.length ? written.filter((b) => best.some((c) => Math.abs(b - c.at) <= tolerance)).length / written.length : 0,
        chance: covered / 1000,
        hits,
    };
}
export function sectionsOver(one, window) {
    if (one.length < 2)
        return [...one];
    const round = 2 * one[one.length - 1].at - one[one.length - 2].at - one[0].at;
    if (!(round > 0))
        return [...one];
    const out = [];
    for (let k = 0; k * round < window; k++)
        for (const x of one)
            if (x.at + k * round < window)
                out.push({ at: x.at + k * round, label: x.label });
    return out;
}
