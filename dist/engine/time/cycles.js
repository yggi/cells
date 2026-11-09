export const LOW = 0.35;
export const TOGETHER = 0.02;
export const LONGEST = 8;
const BIN = 0.005;
export const BEAT = { shortest: 0.25, longest: 1.5 };
export const PREFERRED = { seconds: 0.55, octaves: 0.9 };
const NEAR = 0.035;
export function events(onsets) {
    const sorted = [...onsets].sort((a, b) => a.at - b.at);
    const all = sorted.flatMap((o) => (o.pitch === undefined ? [] : [o.pitch])).sort((a, b) => a - b);
    const middle = all.length ? all[Math.floor(all.length * LOW)] : -Infinity;
    const out = [];
    let group = [];
    const weigh = (o) => (o.weight ?? 1) * (1 + Math.min(1, (o.dur ?? 0) / 0.5));
    const flush = () => {
        if (!group.length)
            return;
        const pitches = group.flatMap((o) => (o.pitch === undefined ? [] : [o.pitch]));
        const accent = group.reduce((s, o) => s + weigh(o), 0);
        const low = group.reduce((s, o) => s + (o.pitch !== undefined && o.pitch < middle ? weigh(o) : 0), 0);
        out.push({ at: group[0].at, accent, low, bass: pitches.length ? Math.min(...pitches) : 0, pitches, long: Math.max(0, ...group.map((o) => o.dur ?? 0)) });
        group = [];
    };
    for (const o of sorted) {
        if (group.length && o.at - group[0].at > TOGETHER)
            flush();
        group.push(o);
    }
    flush();
    return out;
}
export function periodicity(es, longest = LONGEST) {
    const n = Math.ceil(longest / BIN) + 1;
    const raw = new Float64Array(n);
    for (let i = 0; i < es.length; i++)
        for (let j = i + 1; j < es.length; j++) {
            const lag = es[j].at - es[i].at;
            if (lag >= longest)
                break;
            const b = lag / BIN;
            const lo = Math.floor(b);
            const w = es[i].accent * es[j].accent;
            raw[lo] = raw[lo] + w * (1 - (b - lo));
            if (lo + 1 < n)
                raw[lo + 1] = raw[lo + 1] + w * (b - lo);
        }
    const out = new Float64Array(n);
    const sd = 2;
    for (let i = 0; i < n; i++) {
        let s = 0;
        let z = 0;
        for (let k = -3 * sd; k <= 3 * sd; k++) {
            const g = Math.exp(-(k * k) / (2 * sd * sd));
            z += g;
            if (i + k >= 0 && i + k < n)
                s += raw[i + k] * g;
        }
        out[i] = s / z;
    }
    const zero = es.reduce((s, e) => s + e.accent * e.accent, 0) || 1;
    const span = Math.max(1e-9, (es.at(-1)?.at ?? 0) - (es[0]?.at ?? 0));
    for (let i = 0; i < n; i++)
        out[i] = out[i] / zero / Math.max(0.25, 1 - (i * BIN) / span);
    return out;
}
const at = (h, seconds) => {
    const b = seconds / BIN;
    const lo = Math.floor(b);
    if (lo + 1 >= h.length)
        return 0;
    return h[lo] * (1 - (b - lo)) + h[lo + 1] * (b - lo);
};
const prior = (seconds) => Math.exp(-0.5 * (Math.log2(seconds / PREFERRED.seconds) / PREFERRED.octaves) ** 2);
function onGrid(es, period, phase, near = NEAR) {
    let on = 0;
    let all = 0;
    for (const e of es) {
        const x = ((((e.at - phase) / period) % 1) + 1) % 1;
        const d = Math.min(x, 1 - x);
        all += e.accent;
        if (d <= near)
            on += e.accent;
    }
    return all ? on / all : 0;
}
export function beatOf(es, h = periodicity(es)) {
    if (es.length < 8)
        return null;
    let best = { period: 0, score: -1 };
    const scores = [];
    for (let p = BEAT.shortest; p <= BEAT.longest; p += BIN / 2) {
        let s = 0;
        let k = 1;
        for (; k * p < LONGEST && k <= 8; k++)
            s += at(h, k * p);
        const score = (s / (k - 1)) * prior(p);
        scores.push({ period: p, score });
        if (score > best.score)
            best = { period: p, score };
    }
    if (best.score <= 0)
        return null;
    let period = best.period;
    let phase = 0;
    for (let round = 0; round < 3; round++) {
        let top = -1;
        for (let i = 0; i < 64; i++) {
            const ph = es[0].at + (i / 64) * period;
            const s = onGrid(es, period, ph);
            if (s > top)
                [top, phase] = [s, ph];
        }
        const near = es.filter((e) => {
            const x = (e.at - phase) / period;
            return Math.abs(x - Math.round(x)) <= NEAR;
        });
        if (near.length < 4)
            break;
        const ks = near.map((e) => Math.round((e.at - phase) / period));
        const n = near.length;
        const mk = ks.reduce((a, b) => a + b, 0) / n;
        const mt = near.reduce((a, e) => a + e.at, 0) / n;
        const sxx = ks.reduce((a, k) => a + (k - mk) ** 2, 0);
        if (sxx === 0)
            break;
        const sxy = ks.reduce((a, k, i) => a + (k - mk) * (near[i].at - mt), 0);
        period = sxy / sxx;
        phase = mt - period * mk;
    }
    const second = Math.max(0, ...scores.filter((s) => Math.abs(Math.log2(s.period / best.period)) > 0.2).map((s) => s.score));
    return { period, phase: phase - Math.floor((phase - es[0].at) / period) * period, confidence: 1 - second / best.score };
}
function groupings(n) {
    if (n === 0)
        return [[]];
    if (n < 2)
        return [];
    return [...groupings(n - 2).map((g) => [2, ...g]), ...groupings(n - 3).map((g) => [3, ...g])];
}
function pulseAccents(es, pulse, phase, places, low = false) {
    const last = es.at(-1).at;
    const n = Math.max(1, Math.ceil((last - phase) / pulse) + 1);
    const acc = new Float64Array(n);
    for (const e of es) {
        const k = Math.round((e.at - phase) / pulse);
        if (k < 0 || k >= n)
            continue;
        if (Math.abs(e.at - (phase + places(k))) > pulse / 3)
            continue;
        acc[k] = acc[k] + (low ? e.low : e.accent);
    }
    return acc;
}
export const CUES = { harmony: 0.5, long: 0.5 };
function lineCues(es, pulse, phase, places, n) {
    const out = new Float64Array(n);
    if (!CUES.harmony && !CUES.long)
        return out;
    const on = new Array(n);
    for (const e of es) {
        const k = Math.round((e.at - phase) / pulse);
        if (k >= 0 && k < n && Math.abs(e.at - (phase + places(k))) <= pulse / 3)
            on[k] = e;
    }
    const lengths = es
        .map((e) => e.long)
        .filter((x) => x > 0)
        .sort((a, b) => a - b);
    const median = lengths.length ? lengths[Math.floor(lengths.length / 2)] : 0;
    const window = Math.min(1, Math.max(0.3, 4 * pulse));
    let j0 = 0;
    for (let k = 0; k < n; k++) {
        const t = phase + places(k);
        const e = on[k];
        if (CUES.harmony) {
            while (j0 < es.length && es[j0].at < t - window)
                j0++;
            const before = new Set();
            const after = new Set();
            for (let j = j0; j < es.length && es[j].at < t + window; j++)
                for (const p of es[j].pitches)
                    (es[j].at < t - 1e-6 ? before : after).add(((Math.round(p) % 12) + 12) % 12);
            const fresh = [...after].filter((p) => !before.has(p)).length;
            out[k] = out[k] + (CUES.harmony * fresh) / Math.max(1, after.size);
        }
        if (!e)
            continue;
        if (CUES.long && median)
            out[k] = out[k] + CUES.long * Math.min(2, Math.log2(1 + e.long / median));
    }
    return out;
}
export const BAR_PRIOR = { seconds: 2.4, octaves: 1 };
const BEATS_PRIOR = { 1: 0.5, 2: 0.85, 3: 1, 4: 1, 5: 0.6, 6: 0.5, 7: 0.5, 8: 0.25 };
export function barOf(es, pulse, phase, places, first = es[0]?.at ?? 0) {
    const acc = pulseAccents(es, pulse, phase, places);
    if (acc.length < 16)
        return null;
    const mean = acc.reduce((a, b) => a + b, 0) / acc.length || 1;
    const lows = pulseAccents(es, pulse, phase, places, true);
    const cues = lineCues(es, pulse, phase, places, acc.length);
    const cueMean = cues.reduce((a, b) => a + b, 0) / (cues.length || 1);
    const line = acc.map((a, k) => Math.max(0, lows[k] + 0.25 * a + (cues[k] - cueMean) * mean));
    const lineMean = line.reduce((a, b) => a + b, 0) / line.length || 1;
    const recur = (n) => {
        let s = 0;
        let c = 0;
        for (let k = 0; k + n < line.length; k++)
            [s, c] = [s + line[k] * line[k + n], c + 1];
        return c ? s / c / (lineMean * lineMean) : 0;
    };
    const at = (n, off) => {
        let s = 0;
        let c = 0;
        for (let k = off; k < line.length; k += n)
            [s, c] = [s + line[k], c + 1];
        return c ? s / c / lineMean : 0;
    };
    const firstPulse = Math.round((first - phase) / pulse);
    const longest = Math.min(64, Math.floor(6 / pulse), Math.floor(acc.length / 3));
    const beatsOf = (n, off) => {
        const candidates = [];
        for (let size = 1; size <= n; size++)
            if (n % size === 0 && n / size <= 7)
                candidates.push(Array.from({ length: n / size }, () => size));
        for (const unit of [1, 2, 4].filter((u) => u * pulse >= 0.1 && u * pulse <= 0.4 && n % u === 0 && n / u <= 12))
            for (const g of groupings(n / unit))
                if (new Set(g).size > 1)
                    candidates.push(g.map((x) => x * unit));
        let best = null;
        for (const g of candidates) {
            const beatSeconds = (n * pulse) / g.length;
            if (beatSeconds < BEAT.shortest * 0.9 || beatSeconds > BEAT.longest * 1.4)
                continue;
            const starts = g.reduce((s, x, i) => [...s, i ? s[i - 1] + g[i - 1] : 0], []);
            let on = 0;
            let offBeat = 0;
            let c = 0;
            for (let b = off; b + n <= acc.length; b += n, c++)
                for (let k = 1; k < n; k++)
                    starts.includes(k) ? (on += acc[b + k] / (starts.length - 1 || 1)) : (offBeat += acc[b + k] / (n - starts.length || 1));
            if (!c)
                continue;
            const contrast = starts.length > 1 && starts.length < n ? (on + mean * 0.1) / (offBeat + mean * 0.1) : 1;
            const score = Math.sqrt(contrast) * prior(beatSeconds) * (BEATS_PRIOR[g.length] ?? 0.2) * (new Set(g).size > 1 ? 0.8 : 1);
            if (!best || score > best.score)
                best = { groups: g, score };
        }
        return best;
    };
    const bars = [];
    for (let n = 2; n <= longest; n++) {
        const r = Math.sqrt(Math.max(0, recur(n)));
        const smooth = [2, 3].reduce((m, f) => {
            while (m % f === 0)
                m /= f;
            return m;
        }, n) === 1;
        const p = Math.exp(-0.5 * (Math.log2((n * pulse) / BAR_PRIOR.seconds) / BAR_PRIOR.octaves) ** 2) * (smooth ? 1 : 0.7);
        for (let off = 0; off < n; off++) {
            const onFirst = (((firstPulse - off) % n) + n) % n === 0;
            bars.push({ n, off, score: at(n, off) * r * p * (onFirst ? 1.15 : 1) });
        }
    }
    bars.sort((a, b) => b.score - a.score);
    let best = null;
    const totals = [];
    for (const b of bars.slice(0, 24)) {
        const beats = beatsOf(b.n, b.off);
        if (!beats)
            continue;
        const score = b.score * beats.score;
        totals.push(score);
        if (!best || score > best.score)
            best = { n: b.n, off: b.off, groups: beats.groups, score };
    }
    if (!best)
        return null;
    if (best.n % 2 === 0 && best.n >= 8) {
        const h = best.n / 2;
        const off = best.off % h;
        const half = beatsOf(h, off);
        if (half && new Set(half.groups).size > 1 && at(h, off) >= 0.97 * at(best.n, best.off) && recur(h) >= 0.97 * recur(best.n))
            best = { n: h, off, groups: half.groups, score: best.score };
    }
    const others = totals.filter((x) => x < best.score).sort((a, b) => b - a);
    return { pulse, groups: best.groups, start: phase + places(best.off), confidence: others.length ? 1 - others[0] / best.score : 1 };
}
const NAMED = {
    '2+2': '2/4',
    '2+2+2': '3/4',
    '2+2+2+2': '4/4',
    '2+2+2+2+2': '5/4',
    '3+3': '6/8',
    '3+3+3': '9/8',
    '3+3+3+3': '12/8',
    '3': '3/8',
    '4+4': '2/2',
    '4+4+4': '3/2',
    '3+2': '5/8',
    '3+2+2': '7/8',
    '3+2+3+2': '10/8',
};
const tolerance = (pulse) => (played ? Math.min(0.045, Math.max(0.02, 0.2 * pulse)) : Math.min(0.03, Math.max(0.012, 0.08 * pulse)));
let played = false;
function coverage(es, pulse, phase, share = 0.5) {
    const tol = tolerance(pulse);
    const pair = 2 * pulse;
    let on = 0;
    let all = 0;
    for (const e of es) {
        all += e.accent;
        const x = (((e.at - phase) % pair) + pair) % pair;
        const d = Math.min(x, pair - x, Math.abs(x - share * pair));
        if (d <= tol)
            on += e.accent;
    }
    return all ? on / all : 0;
}
export function gridOf(es, enough = 0.9) {
    if (es.length < 8)
        return null;
    const strongest = [...es].sort((a, b) => b.accent - a.accent).slice(0, 12);
    const best = (pulse, share) => {
        let top = { phase: 0, covered: -1 };
        for (const e of strongest) {
            const c = coverage(es, pulse, e.at, share);
            if (c > top.covered)
                top = { phase: e.at, covered: c };
        }
        return top;
    };
    const beat = played ? beatOf(es) : null;
    const clusters = [...gaps(es), ...(beat ? [beat.period, beat.period * 2] : [])];
    const straight = [...new Set(clusters.flatMap((c) => [1, 2, 3, 4, 6].map((k) => +(c / k).toFixed(6))))].filter((p) => p >= 0.06 && p <= 1).sort((x, y) => y - x);
    const leaning = [];
    for (const long of clusters)
        for (const short of clusters)
            if (long > short && long / (long + short) <= 0.8 && long / (long + short) >= 0.52)
                leaning.push({ pulse: (long + short) / 2, share: long / (long + short) });
    leaning.sort((x, y) => y.pulse - x.pulse);
    const all = [...straight.map((pulse) => ({ pulse, share: 0.5 })), ...leaning].sort((x, y) => y.pulse - x.pulse || Math.abs(x.share - 0.5) - Math.abs(y.share - 0.5));
    for (const need of [enough, enough - 0.1, enough - 0.2])
        for (const { pulse, share } of all) {
            const b = best(pulse, share);
            if (b.covered >= need)
                return refine(es, { pulse, phase: b.phase, share, covered: b.covered });
        }
    let top = null;
    for (const p of straight) {
        const b = best(p, 0.5);
        if (!top || b.covered > top.covered * 1.05)
            top = { pulse: p, phase: b.phase, share: 0.5, covered: b.covered };
    }
    return top && refine(es, top);
}
function gaps(es) {
    const ds = es
        .slice(1)
        .map((e, i) => e.at - es[i].at)
        .filter((d) => d >= 0.05 && d <= 2)
        .sort((a, b) => a - b);
    const out = [];
    let run = [];
    const flush = () => run.length && out.push({ mean: run.reduce((a, b) => a + b, 0) / run.length, n: run.length });
    for (const d of ds) {
        if (run.length && d > run[0] * 1.03) {
            flush();
            run = [];
        }
        run.push(d);
    }
    flush();
    return out
        .sort((a, b) => b.n - a.n)
        .slice(0, 8)
        .map((c) => c.mean);
}
function refine(es, g) {
    const pair = 2 * g.pulse;
    const tol = tolerance(g.pulse);
    const starts = [];
    const seconds = [];
    for (const e of es) {
        const k = Math.round((e.at - g.phase) / pair);
        const x = e.at - g.phase - k * pair;
        if (Math.abs(x) <= tol)
            starts.push({ k, at: e.at });
        const k2 = Math.floor((e.at - g.phase) / pair);
        const y = (e.at - g.phase - k2 * pair) / pair;
        if (Math.abs(y - g.share) * pair <= tol)
            seconds.push(y);
    }
    if (starts.length < 4)
        return g;
    const n = starts.length;
    const mk = starts.reduce((a, s) => a + s.k, 0) / n;
    const mt = starts.reduce((a, s) => a + s.at, 0) / n;
    const sxx = starts.reduce((a, s) => a + (s.k - mk) ** 2, 0);
    if (!sxx)
        return g;
    const slope = starts.reduce((a, s) => a + (s.k - mk) * (s.at - mt), 0) / sxx;
    const share = g.share === 0.5 || !seconds.length ? g.share : seconds.reduce((a, b) => a + b, 0) / seconds.length;
    const phase = mt - slope * mk;
    return { pulse: slope / 2, phase: phase - Math.floor((phase - es[0].at) / slope) * slope, share, covered: coverage(es, slope / 2, phase, share) };
}
function leaningGroups(es, fine) {
    const strongest = [...es].sort((a, b) => b.accent - a.accent).slice(0, 12);
    const loose = fine.share === 0.5;
    const tried = new Set();
    for (const c of gaps(es)
        .flatMap((g) => [g, g / 2, g / 3])
        .sort((a, b) => b - a)) {
        if (c < (loose ? 0.97 : 1.8) * fine.pulse || c > 0.45 || [...tried].some((t) => Math.abs(t - c) < 0.01 * c))
            continue;
        tried.add(c);
        let top = { phase: 0, covered: -1 };
        for (const e of strongest) {
            const cov = coverage(es, c, e.at);
            if (cov > top.covered)
                top = { phase: e.at, covered: cov };
        }
        if (top.covered < COARSE)
            continue;
        const found = leaningOn(es, fine, refine(es, { pulse: c, phase: top.phase, share: 0.5, covered: top.covered }));
        if (found)
            return found;
    }
    return null;
}
function leaningOn(es, fine, coarse) {
    const straight = (k) => k * coarse.pulse;
    const bar = barOf(es, coarse.pulse, coarse.phase, straight);
    if (!bar || !bar.groups.includes(2) || bar.groups.some((g) => g !== 2 && g !== 3))
        return null;
    const n = bar.groups.reduce((a, b) => a + b, 0);
    const starts = bar.groups.reduce((s, x, i) => [...s, i ? s[i - 1] + bar.groups[i - 1] : 0], []);
    const pair = 2 * coarse.pulse;
    const seconds = [];
    for (const e of es) {
        const k = Math.floor((e.at - bar.start) / coarse.pulse + 1e-9);
        const inBar = ((k % n) + n) % n;
        const g = groupAt(starts, inBar);
        if (bar.groups[g] !== 2)
            continue;
        const x = (e.at - bar.start - (k - (inBar - starts[g])) * coarse.pulse) / pair;
        if (x > 0.3 && x < 0.85)
            seconds.push(x);
    }
    if (seconds.length < 4)
        return null;
    seconds.sort((a, b) => a - b);
    const share = seconds[Math.floor(seconds.length / 2)];
    if (Math.abs(share - 0.5) <= 0.02)
        return null;
    const places = (k) => {
        const inBar = ((k % n) + n) % n;
        const g = groupAt(starts, inBar);
        const at = k - (inBar - starts[g]);
        return (at + (bar.groups[g] === 2 && inBar - starts[g] === 1 ? 2 * share : inBar - starts[g])) * coarse.pulse;
    };
    let on = 0;
    let all = 0;
    const tol = tolerance(coarse.pulse);
    for (const e of es) {
        all += e.accent;
        const k = Math.round((e.at - bar.start) / coarse.pulse);
        if ([k - 1, k, k + 1].some((j) => Math.abs(e.at - bar.start - places(j)) <= tol))
            on += e.accent;
    }
    if (!all || on / all < fine.covered - 0.02 || on / all < 0.85)
        return null;
    const key = bar.groups.join('+');
    const length = n * coarse.pulse;
    return {
        bpm: (60 * bar.groups.length) / length,
        signature: NAMED[key] ?? key,
        groups: bar.groups,
        swing: [{ level: '8n', share }],
        start: bar.start,
        bar: length,
        confidence: { beat: on / all, division: on / all, bar: bar.confidence },
    };
}
function groupAt(starts, pulse) {
    let g = 0;
    while (g + 1 < starts.length && starts[g + 1] <= pulse)
        g++;
    return g;
}
const COARSE = 0.75;
export function findMeter(onsets) {
    const written = findOn(onsets, false);
    if (written && written.confidence.beat >= 0.85)
        return written;
    const loose = findOn(onsets, true);
    return loose && (!written || loose.confidence.beat > written.confidence.beat) ? loose : written;
}
function findOn(onsets, asPlayed) {
    played = asPlayed;
    try {
        return findGrid(onsets);
    }
    finally {
        played = false;
    }
}
function findGrid(onsets) {
    const es = events(onsets);
    const grid = gridOf(es);
    if (!grid)
        return null;
    const aksak = leaningGroups(es, grid);
    if (aksak)
        return aksak;
    const places = (k) => {
        const b = Math.floor(k / 2);
        return (b * 2 + (k - b * 2 ? 2 * grid.share : 0)) * grid.pulse;
    };
    const bar = barOf(es, grid.pulse, grid.phase, places);
    if (!bar)
        return null;
    const b = Math.min(...bar.groups);
    const per = b <= 1 ? 0.5 : b <= 3 ? 1 : b <= 6 ? 2 : 4;
    let eighths = bar.groups.map((g) => g / per);
    let swing8 = per === 1 ? grid.share : 0.5;
    const swing16 = per === 2 ? grid.share : 0.5;
    if (per === 1 && bar.groups.every((g) => g === 3)) {
        const acc = pulseAccents(es, grid.pulse, grid.phase, places);
        let mid = 0;
        let last = 0;
        for (let k = 0; k < acc.length; k++) {
            const i = (((k - Math.round((bar.start - grid.phase) / grid.pulse)) % 3) + 3) % 3;
            if (i === 1)
                mid += acc[k];
            if (i === 2)
                last += acc[k];
        }
        if (mid <= 0.05 * last && last > 0) {
            eighths = bar.groups.map(() => 2);
            swing8 = 2 / 3;
        }
    }
    const whole = eighths.every((g) => Number.isInteger(g));
    const key = (whole ? eighths : bar.groups).join('+');
    const seconds = bar.pulse * bar.groups.reduce((a, c) => a + c, 0);
    const swing = [
        ...(Math.abs(swing8 - 0.5) > 0.02 ? [{ level: '8n', share: swing8 }] : []),
        ...(Math.abs(swing16 - 0.5) > 0.02 ? [{ level: '16n', share: swing16 }] : []),
    ];
    return {
        bpm: (60 * bar.groups.length) / seconds,
        signature: NAMED[key] ?? key,
        groups: whole ? eighths : bar.groups,
        swing,
        start: bar.start,
        bar: seconds,
        confidence: { beat: grid.covered, division: grid.covered, bar: bar.confidence },
    };
}
export function meterText(f) {
    const sig = `meter("${f.signature}")`;
    const args = [
        ...(f.signature === '4/4' ? [] : [`grouping=${sig}`]),
        ...(f.swing.length ? [`swing=${f.swing.map((s) => `${s.level}:${String(+s.share.toFixed(2)).replace(/^0\./, '.')}`).join(',')}`] : []),
    ];
    return `&bar from meter${args.length ? `(${args.join(', ')})` : ''} &tempo\n&tempo step=${Math.round(f.bpm)}bpm`;
}
