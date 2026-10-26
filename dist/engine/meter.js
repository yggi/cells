import { scan as scanOf } from "../theory/modes.js";
export const stepsPerPulse = (m) => m.levels.length / Math.max(1, m.pulses);
export function noteValue(v) {
    const m = /^([1-9][0-9]*)(n\.?|t)$/.exec(v);
    if (!m)
        return null;
    const n = parseInt(m[1], 10);
    return m[2] === 'n.' ? 3 / (2 * n) : m[2] === 't' ? 2 / (3 * n) : 1 / n;
}
export function withPulse(m, whole) {
    const unit = 1 / whole;
    const per = unit / 4;
    if (!(per > 1))
        return { ...m, unit };
    const beats = [];
    for (let at = 0; at < m.pulses - 1e-9; at += per)
        beats.push(Math.min(per, m.pulses - at));
    return { ...m, unit, beats, counted: m.pulses / per };
}
export const beatCount = (m) => m.counted ?? Math.max(1, m.beats.length);
export function withBeats(m, n) {
    const k = Math.max(1, Math.round(n));
    const { counted: _, ...rest } = m;
    return { ...rest, beats: Array.from({ length: k }, () => m.pulses / k) };
}
export function withSwing(m, levels) {
    const leaning = levels.filter((l) => l.share !== 0.5);
    return leaning.length ? { ...m, swing: leaning } : m;
}
export function noteName(whole) {
    const near = (x) => Math.abs(x - Math.round(x)) < 1e-9 && Math.round(x) >= 1 && Number.isInteger(Math.log2(Math.round(x)));
    if (near(1 / whole))
        return `${Math.round(1 / whole)}n`;
    if (near(2 / (3 * whole)))
        return `${Math.round(2 / (3 * whole))}t`;
    if (near(3 / (2 * whole)))
        return `${Math.round(3 / (2 * whole))}n.`;
    return null;
}
export const bareSwingLevel = (m) => noteName(1 / (m.unit * stepsPerPulse(m)));
export function swingLevelProblem(m, whole) {
    const len = whole * m.unit;
    const fits = m.beats.some((b) => {
        const q = b / len;
        return Math.abs(q - Math.round(q)) < 1e-9 && Math.round(q) >= 2;
    });
    return fits
        ? null
        : `no beat of this meter divides into two or more of ${noteName(whole) ?? 'them'} (its beats: ${m.beats.map((b) => noteName(b / m.unit) ?? b).join(' ')}), and swing never moves a beat`;
}
export function pairsProblem(m, whole) {
    const len = whole * m.unit;
    const probe = { ...m, swing: [{ level: noteName(whole) ?? '', whole, share: 0.6, pairs: true }] };
    for (let i = 0; i * len < m.pulses - 1e-9; i++)
        if (Math.abs(swingAt(probe, i * len) - i * len) > 1e-9)
            return null;
    return `every group of ${noteName(whole) ?? 'them'} in it is three, and :pairs keeps those straight`;
}
const held = (v) => {
    for (let k = 0, x = v; k <= 6; k++, x *= 2)
        if (Math.abs(x - Math.round(x)) < 1e-9)
            return true;
    return false;
};
function knotsOf(parts, lean) {
    const even = Array.from({ length: parts + 1 }, (_, i) => i / parts);
    if (lean === null || (parts !== 2 && parts !== 3) || (parts === 3 && lean.pairs))
        return even;
    const { share } = lean;
    if (parts === 2)
        return [0, Math.min(0.95, Math.max(0.05, share)), 1];
    const second = Math.min(0.95, Math.max(0.05, share - 1 / 6));
    return [0, second, (second + 1) / 2, 1];
}
function swungIn(x, n, levels) {
    const finest = Math.min(...levels.map((l) => l.len));
    let from = 0;
    let len = n;
    let at = 0;
    let span = n;
    for (let guard = 0; guard < 16; guard++) {
        const q = len / finest;
        const qi = Math.round(q);
        if (Math.abs(q - qi) > 1e-9 || qi < 2)
            break;
        const parts = qi === 2 || qi === 3 ? qi : qi % 3 === 0 ? 3 : qi % 2 === 0 ? 2 : qi;
        const child = len / parts;
        const rel = ((x - from) / len) * parts;
        if (!held(rel))
            break;
        const knots = knotsOf(parts, levels.find((l) => Math.abs(l.len - child) < 1e-9) ?? null);
        const k = Math.min(parts - 1, Math.max(0, Math.floor(rel + 1e-9)));
        from += k * child;
        len = child;
        at += knots[k] * span;
        span *= knots[k + 1] - knots[k];
    }
    return at + ((x - from) / len) * span;
}
export function swingAt(m, p) {
    if (!m.swing?.length)
        return p;
    const levels = m.swing.map((l) => ({ len: l.whole * m.unit, share: l.share, ...(l.pairs ? { pairs: true } : {}) }));
    const P = m.pulses;
    const bar = Math.floor(p / P + 1e-9);
    const x = p - bar * P;
    let at = 0;
    let i = 0;
    while (i < m.beats.length - 1 && at + m.beats[i] <= x + 1e-9)
        at += m.beats[i++];
    const beat = m.beats[i] ?? P;
    return bar * P + at + swungIn(x - at, beat, levels);
}
export function swungKnots(m) {
    if (!m.swing?.length)
        return null;
    const grain = Math.min(...m.swing.map((l) => l.whole * m.unit));
    if (!(grain > 0))
        return null;
    const written = [];
    let at = 0;
    for (const beat of m.beats.length ? m.beats : [m.pulses]) {
        for (let x = 0; x < beat - 1e-9; x += grain)
            written.push(at + x);
        at += beat;
    }
    written.push(m.pulses);
    return { written, swung: written.map((w) => (w >= m.pulses - 1e-9 ? m.pulses : swingAt(m, w))) };
}
export function swungSteps(m) {
    const per = stepsPerPulse(m);
    const out = m.levels.map((_, i) => swingAt(m, i / per) * per);
    return out.some((p, i) => Math.abs(p - i) > 1e-12) ? out : null;
}
export function meterOfLevels(levels, signature) {
    const n = levels.length;
    const root = { level: 0, from: 0, to: n, groups: [] };
    const open = [root];
    for (let i = 1; i < n; i++) {
        const level = Math.max(1, levels[i]);
        while (open.length > 1 && open[open.length - 1].level >= level)
            open.pop();
        const group = { level, from: i, to: n, groups: [] };
        for (let j = i + 1; j < n; j++)
            if (Math.max(1, levels[j]) <= level)
                ((group.to = j), (j = n));
        open[open.length - 1].groups.push(group);
        open.push(group);
    }
    const shape = signature ?? signatureOfLevels(levels);
    return { tree: root, levels, positions: levels.map((_, i) => i), lap: n, written: 'meter', pulses: shape.pulses, unit: shape.unit, beats: shape.beats };
}
function signatureOfLevels(levels) {
    const starts = levels.flatMap((l, i) => (i === 0 || l <= 1 ? [i] : []));
    const beats = starts.map((s, i) => (starts[i + 1] ?? levels.length) - s);
    const per = levels.length / Math.max(1, beats.length);
    const unit = Number.isInteger(Math.log2(per)) ? 4 * per : 8;
    return { pulses: levels.length, unit, beats, sub: 1 };
}
export function meterOfScan(steps) {
    const { positions, lap } = scanOf(steps);
    const groups = positions.map((_, i) => ({ level: 1, from: i, to: i + 1, groups: [] }));
    const pulses = positions.length;
    return { tree: { level: 0, from: 0, to: pulses, groups }, levels: positions.map(() => 1), positions, lap, written: 'scan', pulses, unit: 4, beats: positions.map(() => 1) };
}
export function tapPositions(m, tap, bars = 1) {
    const out = [];
    const P = m.pulses;
    const lap = P * Math.max(1, bars);
    if (tap.kind === 'note') {
        const len = tap.whole * m.unit;
        for (let i = 0; i * len < lap - 1e-9; i++)
            out.push(i * len);
        return out;
    }
    for (let b = 0; b < Math.max(1, bars); b++) {
        if (tap.kind === 'bar')
            out.push(b * P);
        else if (tap.kind === 'pulse')
            for (let p = 0; p < P; p++)
                out.push(b * P + p);
        else {
            let at = 0;
            for (const len of m.beats)
                (out.push(b * P + at), (at += len));
        }
    }
    return out;
}
export function tapShare(m, tap, ratio) {
    const whole = (tap === 'pulse' ? 1 : tap === 'beat' ? Math.max(...m.beats) : tap === '1m' ? m.pulses : (noteValue(tap) ?? 0) * m.unit) / m.unit / ratio;
    const at = (m.legato ?? []).filter((l) => l.whole >= whole - 1e-9).sort((a, b) => a.whole - b.whole)[0];
    return at?.share ?? 1;
}
