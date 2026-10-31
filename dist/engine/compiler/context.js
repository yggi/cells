import { noteFrequency } from "../program.js";
export function context(parsed, env) {
    const diagnostics = [...parsed.diagnostics];
    const error = (message, span) => diagnostics.push({ severity: 'error', message, span });
    const warn = (message, span) => diagnostics.push({ severity: 'warning', message, span });
    const info = (message, span) => diagnostics.push({ severity: 'info', message, span });
    const broken = new Set(parsed.broken);
    const unknown = new Map();
    const unknownCell = (name, span) => {
        if (broken.has(name))
            return;
        error(`Unknown cell &${name}`, span);
        unknown.set(name, [...(unknown.get(name) ?? []), span]);
    };
    const unknownEnv = new Set();
    const rateOf = (st) => {
        if (!st)
            return null;
        if (st.kind === 'rate')
            return st.perSecond;
        if (st.kind === 'env') {
            const v = env[st.name] ?? noteFrequency(st.name, env.A4 ?? 440) ?? undefined;
            if (typeof v === 'number' && v > 0)
                return v;
            if (!unknownEnv.has(st))
                error(`Unknown environment value ${st.name} (known: ${Object.keys(env).join(', ')}, and note names like C4, F#3, Bb2)`, st.span);
            unknownEnv.add(st);
            return null;
        }
        return null;
    };
    return { parsed, env, diagnostics, error, warn, info, broken, unknown, unknownCell, rateOf };
}
