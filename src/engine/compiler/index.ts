/**
 * compile(): a parsed piece as cells over grids, clocks and outputs, in phases that each take and
 * refine one shared context (context.ts), in this order — the order of the diagnostics too.
 */
import type { ParseResult } from '../ast';
import type { AudioTape, CompileResult, Env, ResolvedCell } from '../compile';
import { context } from './context';
import { declare } from './declare';
import { sorts } from './sorts';
import { resolveCells } from './resolve';
import { bindVoices } from './bindings';
import { clockCells } from './clocks';
import { checkCells } from './checks';
import { outputsOf } from './outputs';
import { displayCells } from './display';
import { checkRoles } from './roles';

export function compile(parsed: ParseResult, env: Env): CompileResult {
  const ctx = context(parsed, env);
  const overOk = declare(ctx);
  const typed = sorts(ctx);
  resolveCells(ctx, overOk, typed);
  const bound = bindVoices(ctx, typed);
  clockCells(ctx);
  checkCells(ctx);
  const { outputs, returns, resonances } = outputsOf(ctx, bound);
  displayCells(ctx);
  checkRoles(ctx);

  const { diagnostics, cells, clocks } = ctx;
  const ok = !diagnostics.some((x) => x.severity === 'error');
  diagnostics.sort((a, b) => a.span.line - b.span.line || a.span.col - b.span.col);
  const off = new Set([...cells.values()].filter((c) => c.off).map((c) => `cell:${c.name}`));
  // sound tapes: a tape whose write= is a mix — its loop, its colour, its heads
  const num = (c: ResolvedCell, k: string, d: number) => (typeof c.params[k] === 'number' ? (c.params[k] as number) : d);
  const tapes: AudioTape[] = [...cells.values()]
    .filter((c) => typeof c.params.write === 'string' && !!cells.get(c.params.write as string)?.mix)
    .map((c) => ({
      name: c.name,
      source: c.params.write as string,
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
  return { ok, cells, clocks, outputs, off, diagnostics, tapes, returns, resonances };
}
