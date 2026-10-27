import { BUILTIN_PLUGINS } from "../builtinPlugins.js";
import { context } from "./context.js";
import { declare } from "./declare.js";
import { builtinCard } from "./builtin.js";
import { sorts } from "./sorts.js";
import { resolveCells } from "./resolve.js";
import { bindVoices } from "./bindings.js";
import { clockCells } from "./clocks.js";
import { checkCells } from "./checks.js";
import { outputsOf } from "./outputs.js";
import { displayCells } from "./display.js";
import { checkRoles } from "./roles.js";
import { checkLimits } from "./limits.js";
import { sectioned } from "./sections.js";
import { performersOf } from "./band.js";
const pluginsOf = (parsed) => new Map([...BUILTIN_PLUGINS, ...(parsed.plugins ?? [])].map((p) => [p.name, p]));
export function compile(parsed, env, used = new Set()) {
    const ctx = context(parsed, env);
    const declared = builtinCard(ctx, declare(ctx), used);
    const { decls, builtin } = declared;
    const typed = sorts(ctx, decls);
    const resolved = resolveCells(ctx, declared, typed);
    const bound = bindVoices(ctx, decls, resolved, typed);
    const timed = clockCells(ctx, decls, bound.cells);
    const { clocks } = timed;
    checkCells(ctx, decls, timed.cells, declared.sections);
    const made = outputsOf(ctx, decls, timed.cells, clocks, bound);
    const { returns, resonances } = made;
    const outputs = sectioned(made.outputs, timed.cells, declared.sections);
    checkLimits(ctx, decls, timed.cells, clocks, outputs);
    const cells = displayCells(timed.cells);
    checkRoles(ctx, declared, cells, clocks, pluginsOf(parsed));
    const performers = performersOf(ctx, decls, declared.implicit);
    const { diagnostics } = ctx;
    const ok = !diagnostics.some((x) => x.severity === 'error');
    diagnostics.sort((a, b) => a.span.line - b.span.line || a.span.col - b.span.col);
    const byPlace = (a, b) => a.line - b.line || a.col - b.col;
    const unknown = [...ctx.unknown].map(([name, at]) => ({ name, at: [...at].sort(byPlace) })).sort((a, b) => byPlace(a.at[0], b.at[0]));
    const off = new Set([...cells.values()].filter((c) => c.off).map((c) => `cell:${c.name}`));
    const num = (c, k, d) => (typeof c.params[k] === 'number' ? c.params[k] : d);
    const tapes = [...cells.values()]
        .filter((c) => typeof c.params.write === 'string' && !!cells.get(c.params.write)?.mix)
        .map((c) => ({
        name: c.name,
        source: c.params.write,
        length: num(c, 'length', 0),
        erase: Math.min(1, Math.max(0, num(c, 'erase', 1))),
        tone: num(c, 'tone', 7000),
        drive: num(c, 'drive', 0.15),
        hiss: num(c, 'hiss', 0),
        print: num(c, 'print', 0),
        printgap: num(c, 'printgap', 0.6),
        dropout: num(c, 'dropout', 0),
        heads: [...cells.values()]
            .filter((h) => h.params.play === c.name)
            .map((h) => ({ head: h.name, at: num(h, 'at', 0), wander: num(h, 'wander', 0), wanderhz: num(h, 'wanderhz', 0.2) })),
    }));
    const plugins = pluginsOf(parsed);
    return {
        ok,
        cells,
        clocks,
        outputs,
        off,
        diagnostics,
        unknown,
        tapes,
        returns,
        resonances,
        plugins,
        performers,
        sections: declared.sections,
        ...(timed.mainMeter ? { mainMeter: timed.mainMeter } : {}),
        ...(declared.mainKey ? { mainKey: declared.mainKey } : {}),
        ...(builtin ? { builtinCard: builtin } : {}),
    };
}
