/** What every phase of compile() shares: the diagnostics, the declarations, the cells and clocks as they are built. */
import type { CellDecl, Diagnostic, ParseResult, Span } from '../ast';
import { noteFrequency, type Clock, type Env, type ResolvedCell } from '../compile';

export interface Ctx {
  readonly parsed: ParseResult;
  readonly env: Env;
  readonly diagnostics: Diagnostic[];
  readonly error: (message: string, span: Span) => void;
  readonly warn: (message: string, span: Span) => void;
  /** A rate written as a number, or read from the environment (an unknown name is an error, once). */
  readonly rateOf: (st: CellDecl['step']) => number | null;
  /** Every cell's declaration by name, the implicit ones (the default grid, scale() tables) included. */
  readonly decls: Map<string, CellDecl>;
  /** Cells added for a scale(tonic, phase) shorthand: not drawn. */
  readonly implicit: Set<string>;
  /** The default grid wasn't declared, so it was added. */
  implicitRoot: boolean;
  /** The cells, as each phase refines them. */
  readonly cells: Map<string, ResolvedCell>;
  /** The clocks: cells moved at a rate (and driven meters, belts). */
  readonly clocks: Map<string, Clock>;
}

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
  return { parsed, env, diagnostics, error, warn, rateOf, decls: new Map(), implicit: new Set(), implicitRoot: false, cells: new Map(), clocks: new Map() };
}
