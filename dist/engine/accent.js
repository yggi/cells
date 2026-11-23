function factors(steps) {
    const out = [];
    let n = steps;
    while (n % 2 === 0 && n > 1)
        (out.push(2), (n /= 2));
    while (n % 3 === 0 && n > 1)
        (out.push(3), (n /= 3));
    return n === 1 ? out : null;
}
export function metricWeights(steps) {
    const fs = factors(steps);
    if (!fs)
        return null;
    const levels = fs.length;
    return Array.from({ length: steps }, (_, i) => {
        let size = steps;
        let depth = 0;
        for (const f of fs) {
            if (i % size === 0)
                break;
            size /= f;
            depth++;
        }
        return (levels + 1 - depth) / (levels + 1);
    });
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
        const [density, sync, peak, floor] = ['density', 'sync', 'peak', 'floor'].map((k) => number(args, k));
        if (!Number.isInteger(steps) || steps < 1)
            return { refused: `steps=${args.steps} is no count of steps` };
        if (steps > fuel)
            return { refused: `${steps} steps need more than its fuel, ${fuel}` };
        for (const [k, v] of Object.entries({ density, sync, peak, floor }))
            if (!(v >= 0 && v <= 1))
                return { refused: `${k}=${args[k]} is out of 0 to 1` };
        const w = metricWeights(steps);
        if (!w)
            return { refused: `a bar of ${steps} steps splits into neither twos nor threes` };
        const leaned = w.map((x, i) => (1 - sync) * x + sync * w[(i + 1) % steps]);
        return leaned.map((x) => (x >= 1 - density - 1e-9 ? level(floor + (peak - floor) * x) : '0')).join(' ');
    },
};
