import { compileSource } from "./compile.js";
import { codeShifts, DEFAULT_ENV } from "./program.js";
import { plan } from "./realize.js";
import { levelSeries, valueThen } from "./series.js";
import { AXES, STYLE } from "./style.js";
const probe = (i) => `styleAtAxis${i}`;
let last = null;
function planned(source, cell, env, options) {
    const key = [source, cell, env, ...Object.entries(options).flat()];
    if (last && last.key.length === key.length && last.key.every((k, i) => k === key[i]))
        return last.plan;
    const lines = AXES.map((a, i) => `&${probe(i)} lpf=0..1 * &${cell}[${a.name}]`).join('\n');
    const result = compileSource(`${source.replace(/\n*$/, '')}\n${lines}\n`, env, options);
    const p = result.ok ? plan(result, codeShifts(result), result.off) : null;
    last = { key, plan: p };
    return p;
}
export function styleAt(source, seconds, options = {}) {
    const { env = DEFAULT_ENV, cell = STYLE, ...compile } = options;
    const p = planned(source, cell, env, compile);
    if (!p)
        return null;
    const at = Math.max(0, seconds);
    return AXES.map((_, i) => {
        const factor = p.result.cells.get(probe(i))?.paramCells.lpf?.factors[0];
        return factor === undefined ? NaN : valueThen(levelSeries(p, p.seriesOf(factor), at, at + 1), at, (x) => x.level);
    });
}
