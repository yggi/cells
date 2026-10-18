import { parse } from "../engine/parser/index.js";
import { tapPositions } from "../engine/meter.js";
import { MAIN_KEY } from "../engine/program.js";
export const INTERFACE_NAMES = ['&bar', 'key', '&harm'];
const UNKNOWN_CELL = /^Unknown cell &([A-Za-z_][A-Za-z0-9_]*)$/;
const WHOLE = 1e-9;
const isWhole = (x) => Math.abs(x - Math.round(x)) < WHOLE;
export const lapMeets = (need, taps) => need.steps > 0 && isWhole((taps * need.rate) / need.steps);
function fewestBar(need) {
    for (let k = 1; k <= 4096; k++)
        if (lapMeets(need, k * need.bars))
            return k;
    return 0;
}
export const meterMeets = (need, meter, tap) => lapMeets(need, tapPositions(meter, tap, need.bars).length);
export function clockNeeds(text, result, of, own) {
    const decls = parse(text).cells;
    const mine = own ?? new Set(decls.map((d) => d.name));
    const mainIsMine = result.mainMeter !== undefined && mine.has(result.mainMeter);
    return decls.flatMap((d) => {
        const step = d.step;
        if (step?.kind !== 'tap' || (of && !of.has(d.name)))
            return [];
        if (step.meter ? mine.has(step.meter.name) : mainIsMine)
            return [];
        const cell = result.cells.get(d.name);
        if (!cell || cell.voice || cell.steps <= 0)
            return [];
        const bars = Math.max(1, Math.round(d.cycle ?? 1));
        const base = { cell: `&${d.name}`, meter: step.meter ? `&${step.meter.name}` : null, tap: step.tap.written, bars, steps: cell.steps, rate: step.ratio };
        return [{ need: { ...base, bar: fewestBar(base) }, tap: step.tap }];
    });
}
export function holesOf(text, compiled) {
    const decls = parse(text).cells.filter((d) => !d.lambda);
    const result = compiled(text);
    const unknown = result.diagnostics.flatMap((d) => {
        const m = UNKNOWN_CELL.exec(d.message);
        return m ? [`&${m[1]}`] : [];
    });
    const readsKey = decls.some((d) => d.over?.name === MAIN_KEY) && !result.mainKey;
    return {
        uses: [...new Set([...unknown, ...(readsKey ? ['key'] : [])])].sort(),
        defines: [...new Set(decls.map((d) => `&${d.name}`))],
        clock: clockNeeds(text, result).map((t) => t.need),
    };
}
