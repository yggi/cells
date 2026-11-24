import { groupingOf, meterLevels } from "./parser/generators.js";
const WEIGHT = { '*': 1, '+': 0.8, '-': 0.6, ':': 0.6, ';': 0.6, '.': 0.4, ',': 0.2 };
const GRADE = '*+-.,';
function gradesOfLevels(levels, steps) {
    const n = levels.length;
    const total = steps || n * (levels.includes(3) ? 2 : 4);
    const k = total / n;
    if (!Number.isInteger(k) || (k & (k - 1)) !== 0)
        return null;
    const depth = Math.log2(k);
    return levels
        .flatMap((v) => Array.from({ length: k }, (_, j) => {
        if (j === 0)
            return GRADE[v];
        const d = depth - Math.log2(j & -j);
        return GRADE[Math.max(v + 1, 4 - (depth - d))];
    }))
        .join('');
}
export function meterGrades(meter, steps = 0) {
    const levels = meter.trim().split(/\s+/);
    if (levels.every((v) => /^[0-4]$/.test(v)))
        return gradesOfLevels(levels.map(Number), steps);
    const g = groupingOf(meter.trim());
    if (!g)
        return null;
    const total = steps || (g.pulses * 16) / g.unit;
    const sub = total / g.pulses;
    if (!Number.isInteger(sub) || sub < 1)
        return null;
    const grades = meterLevels(meter.trim(), sub);
    return grades.length === total ? grades : null;
}
export function metricWeights(meter, steps = 0) {
    const grades = meterGrades(meter, steps);
    return grades ? [...grades].map((g) => WEIGHT[g]) : null;
}
const FUEL = 64;
const number = (args, name) => Number(args[name]);
const level = (x) => String(+x.toFixed(3));
export const METRIC_ACCENT = {
    id: 'metric_accent',
    fragment: 'metric_accent',
    fills: { accent: { fuel: FUEL } },
    origin: 0,
    cycle: 0,
    stepSeconds: 0,
    fill(name, _lap, args, fuel = FUEL) {
        if (name !== 'accent')
            return { refused: `it has no fill ${name}` };
        const steps = number(args, 'steps');
        const meter = args.meter ?? '4/4';
        const [density, sync, peak, floor] = ['density', 'sync', 'peak', 'floor'].map((k) => number(args, k));
        if (!Number.isInteger(steps) || steps < 0)
            return { refused: `steps=${args.steps} is no count of steps` };
        for (const [k, v] of Object.entries({ density, sync, peak, floor }))
            if (!(v >= 0 && v <= 1))
                return { refused: `${k}=${args[k]} is out of 0 to 1` };
        const w = metricWeights(meter, steps);
        if (!w)
            return {
                refused: `meter=${meter} is no meter it can weigh at ${steps ? `${steps} step${steps === 1 ? '' : 's'}` : 'a sixteenth a step'}: a signature (7/8), sizes (2+2+3) or a meter cell (&bar), its steps a whole number a pulse`,
            };
        if (w.length > fuel)
            return { refused: `${w.length} steps need more than its fuel, ${fuel}` };
        const leaned = w.map((x, i) => (1 - sync) * x + sync * w[(i + 1) % w.length]);
        return leaned.map((x) => (x >= 1 - density - 1e-9 ? level(floor + (peak - floor) * x) : '0')).join(' ');
    },
};
