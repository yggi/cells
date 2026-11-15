import { FIVETO12 } from "./fiveto12.js";
export const BUILT_IN = new Map([[FIVETO12.id, FIVETO12]]);
export const lawOf = (params) => (typeof params?.law === 'string' && BUILT_IN.get(params.law)) || null;
export const unitOf = (f) => Math.min(...Object.values(f.fills).flatMap((x) => (x.lap !== undefined && !x.mark ? [x.lap] : [])));
export function marksOf(f) {
    return Object.entries(f.fills).flatMap(([name, x]) => x.mark && x.lap ? Array.from({ length: Math.round(f.cycle / x.lap) }, (_, k) => ({ at: k * x.lap * f.stepSeconds, label: f.fill(name, k, {}) })) : []);
}
export function filledAt(f, unitLap, args = {}) {
    const unit = unitOf(f);
    const laps = Math.round(f.cycle / unit);
    const k = ((unitLap % laps) + laps) % laps;
    return f.block
        .split('\n')
        .map((line) => {
        const m = /^&([A-Za-z_][A-Za-z0-9_]*)\b/.exec(line);
        const x = m && f.fills[m[1]];
        if (!x || !line.includes('fill()'))
            return line;
        return line.replace('fill()', f.fill(m[1], x.lap ? Math.floor((k * unit) / x.lap) : 0, args));
    })
        .join('\n');
}
