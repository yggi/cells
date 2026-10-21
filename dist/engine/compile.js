import { parse } from "./parser/index.js";
import { compile as compileIn } from "./compiler/index.js";
import { DEFAULT_ENV } from "./program.js";
import { expansion, hasUse } from "./use.js";
function compile(parsed, env = DEFAULT_ENV) {
    return compileIn(parsed, env);
}
export function compileSource(source, env = DEFAULT_ENV, options = {}) {
    if (!hasUse(source))
        return compile(parse(source), env);
    const x = expansion(source, options);
    const result = compileIn(parse(x.text), env, x.given);
    const diagnostics = [...x.diagnostics, ...result.diagnostics.map((d) => ({ ...d, span: x.through(d.span.line) ?? d.span }))].sort((a, b) => a.span.line - b.span.line || a.span.col - b.span.col);
    return { ...result, ok: !diagnostics.some((d) => d.severity === 'error'), diagnostics, uses: x.uses };
}
