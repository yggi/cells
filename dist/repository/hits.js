import { declarations, unionOf } from "./fit.js";
import { holesOf } from "./holes.js";
import { setAttr } from "../engine/edit.js";
import { clocking } from "../engine/clocking.js";
import { compileSource } from "../engine/compile.js";
import { planOf } from "../engine/host.js";
import { mainMeter } from "../engine/midiclock.js";
import { notesOf } from "../engine/notesof.js";
import { bodyOf } from "../engine/use.js";
const KIT_CHANNEL = 10;
const whole = (x) => (Math.abs(x - Math.round(x)) < 1e-6 ? Math.round(x) : x);
export function hitsOf(fragment, bench, { resolve, grid = 16 }) {
    const body = bodyOf(fragment);
    const union = unionOf(body, bench).text;
    const mix = declarations(union).find((l) => /^&\w+ \[.*\]$/.test(l.code));
    if (!mix)
        return null;
    const plan = planOf(setAttr(union, mix.name, 'map', `midi(${KIT_CHANNEL})`), undefined, { resolve });
    const meter = mainMeter(plan.result);
    if (!meter)
        return null;
    const clock = clocking(plan.result, plan.statics).played(meter.cell);
    const bar = plan.result.cells.get(meter.cell)?.meter;
    if (!bar)
        return null;
    const cellSteps = bar.levels.length;
    const stepWhole = bar.pulses / (cellSteps * bar.unit);
    const bars = Math.max(1, ...holesOf(body, (text) => compileSource(text, undefined, { resolve }), resolve).clock.map((need) => need.bars));
    const read = notesOf(plan, { to: clock.q(cellSteps * bars) }).filter((n) => n.channel === KIT_CHANNEL);
    const hits = [];
    const lines = new Map();
    for (const n of read) {
        const [first, second, third] = (n.output ?? '').split(':');
        if (first !== 'kit' || second !== 'voices' || third === undefined)
            continue;
        const role = n.reading?.role ?? null;
        if (!lines.has(third))
            lines.set(third, role);
        hits.push({ line: third, role, note: n.note, step: whole(clock.stepAt(n.at) * stepWhole * grid), velocity: n.velocity });
    }
    return {
        bars,
        lines: [...lines].map(([name, role]) => ({ name, role })),
        hits: hits.sort((a, b) => a.step - b.step || a.note - b.note),
    };
}
