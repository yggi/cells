import { FIVETO12 } from "./fiveto12.js";
export const BUILT_IN = new Map([[FIVETO12.id, FIVETO12]]);
export const lawOf = (params) => (typeof params?.law === 'string' && BUILT_IN.get(params.law)) || null;
export const unitOf = (f) => Math.min(...Object.values(f.holes).flatMap((h) => (h.lap !== undefined && !h.mark ? [h.lap] : [])));
export function marksOf(f) {
    return Object.entries(f.holes).flatMap(([name, h]) => h.mark && h.lap ? Array.from({ length: Math.round(f.cycle / h.lap) }, (_, k) => ({ at: k * h.lap * f.stepSeconds, label: f.fill(name, k, {}) })) : []);
}
export function filledAt(f, unitLap, args = {}) {
    const unit = unitOf(f);
    const laps = Math.round(f.cycle / unit);
    const k = ((unitLap % laps) + laps) % laps;
    return f.block
        .split('\n')
        .map((line) => {
        const m = /^&([A-Za-z_][A-Za-z0-9_]*)\b/.exec(line);
        const h = m && f.holes[m[1]];
        if (!h || !line.includes('fill()'))
            return line;
        return line.replace('fill()', f.fill(m[1], h.lap ? Math.floor((k * unit) / h.lap) : 0, args));
    })
        .join('\n');
}
