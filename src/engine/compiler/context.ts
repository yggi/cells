/** What every phase of compile() shares: where diagnostics go, and the environment (rates read from it). Everything else a phase takes as arguments and returns. */
import type { CellDecl, Diagnostic, ParseResult, Span } from '../ast';
import { noteFrequency, type Env, type ResolvedCell } from '../program';

export interface Ctx {
  readonly parsed: ParseResult;
  readonly env: Env;
  readonly diagnostics: Diagnostic[];
  readonly error: (message: string, span: Span) => void;
  readonly warn: (message: string, span: Span) => void;
  /** A rate written as a number, or read from the environment (an unknown name is an error, once). */
  readonly rateOf: (st: CellDecl['step']) => number | null;
}

/** Cells, by name, as a phase hands them on. */
export type Cells = ReadonlyMap<string, ResolvedCell>;

export function context(parsed: ParseResult, env: Env): Ctx {
  const diagnostics: Diagnostic[] = [...parsed.diagnostics];
  const error = (message: string, span: Span) => diagnostics.push({ severity: 'error', message, span });
  const warn = (message: string, span: Span) => diagnostics.push({ severity: 'warning', message, span });
  // a rate written as a number, or read from the environment
  const unknownEnv = new Set<CellDecl['step']>();
  const rateOf = (st: CellDecl['step']): number | null => {
    if (!st) return null;
    if (st.kind === 'rate') return st.perSecond;
    if (st.kind === 'env') {
      const v = env[st.name] ?? noteFrequency(st.name, env.A4 ?? 440) ?? undefined;
      if (typeof v === 'number' && v > 0) return v;
      if (!unknownEnv.has(st)) error(`Unknown environment value ${st.name} (known: ${Object.keys(env).join(', ')}, and note names like C4, F#3, Bb2)`, st.span);
      unknownEnv.add(st);
      return null;
    }
    return null;
  };
  return { parsed, env, diagnostics, error, warn, rateOf };
}
