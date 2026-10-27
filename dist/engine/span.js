import { pieceTime } from "./duration.js";
export const LONGEST = 3600;
export const UNBOUNDED = 60;
export const TAIL = 2;
export function spanOf(result, plan, options = {}) {
    const from = Math.max(0, options.from ?? 0);
    const longest = options.longest ?? LONGEST;
    const tail = Math.max(0, options.tail ?? TAIL);
    const [length, why] = (() => {
        if (options.seconds !== undefined)
            return [Math.max(0, options.seconds), 'given'];
        if (Number.isFinite(plan.end))
            return [Math.max(0, plan.end - from), 'ends'];
        const t = pieceTime(result);
        if (t.ends !== null)
            return [Math.max(0, t.ends - from), 'ends'];
        if (t.cycle !== null && Number.isFinite(t.cycle) && t.cycle <= 1800)
            return [t.cycle, 'cycle'];
        if (t.longest !== null)
            return [t.longest, 'layer'];
        return [UNBOUNDED, 'unbounded'];
    })();
    const capped = length > longest;
    return { from, to: from + (capped ? longest : length), tail, why, capped };
}
