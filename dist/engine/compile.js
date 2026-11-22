import { parse } from "./parser/index.js";
import { compile as compileIn } from "./compiler/index.js";
import { readSlots } from "./compiler/slots.js";
import { clocking } from "./clocking.js";
import { mainLength, pieceTime } from "./duration.js";
import { codeShifts, DEFAULT_ENV } from "./program.js";
import { readStyles } from "./styles.js";
import { expansion, hasFrom } from "./use.js";
import { splitComment } from "./edit.js";
function compile(parsed, env = DEFAULT_ENV, used) {
    const slotted = readSlots(parsed);
    const held = readStyles(slotted, null);
    const first = compileIn(held.parsed, env, used);
    if (!held.glides)
        return first;
    const scope = scopeOf(first);
    return scope ? compileIn(readStyles(slotted, scope).parsed, env, used) : first;
}
function scopeOf(result) {
    const seconds = result.ok ? mainLength(pieceTime(result)) : null;
    if (!seconds || !Number.isFinite(seconds) || seconds <= 0)
        return null;
    const meter = result.mainMeter;
    if (!meter || !result.clocks.has(meter))
        return { seconds };
    const perBar = result.cells.get(meter)?.units.length ?? 0;
    if (!perBar)
        return { seconds };
    const bars = clocking(result, codeShifts(result)).map(meter).stepAt(seconds) / perBar;
    return Math.abs(bars - Math.round(bars)) < 1e-6 && Math.round(bars) > 0 ? { bars: Math.round(bars) } : { seconds };
}
export function compileSource(written, env = DEFAULT_ENV, options = {}) {
    const source = written;
    if (!hasFrom(source))
        return withCodes(compile(parse(source), env), source, options.plugins);
    const x = expansion(source, options);
    const result = withCodes(compile(parse(x.text), env, x.given), x.text, options.plugins);
    const diagnostics = [...x.diagnostics, ...result.diagnostics.map((d) => ({ ...d, span: x.through(d.span.line) ?? d.span }))].sort((a, b) => a.span.line - b.span.line || a.span.col - b.span.col);
    return { ...result, ok: !diagnostics.some((d) => d.severity === 'error'), diagnostics, takes: x.takes, ...(x.origins.size ? { origins: x.origins } : {}) };
}
function withCodes(result, text, plugins = []) {
    if (![...result.cells.values()].some((c) => c.fill))
        return result;
    const lines = text.split('\n');
    const codes = new Map([...result.cells.values()].map((c) => [c.name, splitComment(lines[c.span.line - 1] ?? '')[0].trim()]));
    return { ...result, codes, ...(plugins.length ? { pluginFragments: new Map(plugins.map((f) => [f.fragment, f])) } : {}) };
}
