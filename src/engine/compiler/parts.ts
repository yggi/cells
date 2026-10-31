/**
 * Where a score and its band don't meet (decision 063 §4): silence, said, and never an error.
 *
 * - A part no line writes, that a gate plays (`&lead2 play=&lead2line &leadV`: a band's own player the score names no
 *   part for): the part rests (`&lead2line ~`, declared here before compile), and an info says so. Only a gate's part
 *   does this: a name read anywhere else and declared nowhere stays an error, so a typo is still caught.
 * - In a piece with performers (a gate), a line that steps on a clock and that nothing plays or reads (`&bassline
 *   step=16n …` with no performer for it): it is silent, as any line is that nothing plays, and an info says so
 *   (`unplayed`). A piece with no performer, a fragment compiled alone (a vamp, a bass line), is a part waiting for
 *   one, and nothing is said; nor of what a score offers its band to read (`&harm`, `&key`, `&style`: the interface
 *   names), which a band may leave unread.
 *
 * A role that rests for a whole section is written by its conductor as a tacet (`&leadline ~`): read by its gate, it
 * says nothing.
 */
import type { CellDecl, Diagnostic, ParseResult, Span } from '../ast';
import { parse } from '../parser';
import { INTERFACE_NAMES, type CompileResult } from '../program';
import type { Cells, Ctx } from './context';

/**
 * The piece with a rest for each part a gate plays and no line writes, and an info for each; and those parts, each
 * where its gate reads it: declared nowhere, they are still the piece's holes (`CompileResult.unknown`, `holesOf`).
 */
export function restingParts(parsed: ParseResult): { parsed: ParseResult; rested: ReadonlyMap<string, Span> } {
  const declared = new Set(parsed.cells.map((c) => c.name));
  const rests = new Map<string, CellDecl>();
  const diagnostics: Diagnostic[] = [];
  for (const d of parsed.cells) {
    const part = d.params.play ?? d.params.trigger;
    // (a gate: play= with a braid of voices; a read head's play= names a tape, and has none)
    if (typeof part !== 'string' || d.braid.kind === 'blank' || declared.has(part) || rests.has(part)) continue;
    const rest = parse(`&${part} step=1m ~`).cells[0];
    if (!rest) continue;
    const span = d.paramSpans.play ?? d.paramSpans.trigger ?? d.span;
    rests.set(part, { ...rest, span });
    diagnostics.push({ severity: 'info', message: `&${d.name} plays &${part}, which no line writes: it rests`, span });
  }
  if (!rests.size) return { parsed, rested: new Map() };
  return {
    parsed: { ...parsed, cells: [...parsed.cells, ...rests.values()], diagnostics: [...parsed.diagnostics, ...diagnostics] },
    rested: new Map([...rests].map(([name, d]) => [name, d.span])),
  };
}

/** What a score offers its band to read, which a band may leave unread (the harmony, the key, the style): the interface names. */
const OFFERED = new Set(INTERFACE_NAMES.map((n) => n.slice(1)));

/** In a piece with performers, an info for each line that steps on a clock and that nothing plays or reads: its name appears in no other cell, and no output. */
export function unplayed(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, cells: Cells, outputs: CompileResult['outputs'], clocks: CompileResult['clocks']): void {
  if (![...decls.values()].some((d) => d.gate)) return;
  const named = new Set<string>();
  const visit = (x: unknown, seen: Set<unknown>): void => {
    if (typeof x === 'string') {
      named.add(x);
      return;
    }
    if (!x || typeof x !== 'object' || seen.has(x)) return;
    seen.add(x);
    if (x instanceof Map) for (const [k, v] of x) (visit(k, seen), visit(v, seen));
    else if (x instanceof Set) for (const v of x) visit(v, seen);
    else for (const v of Object.values(x)) visit(v, seen);
  };
  for (const c of cells.values()) {
    const { name: _, ...rest } = c;
    visit(rest, new Set());
  }
  visit(outputs, new Set());
  // (a gate reads its part, and the lines of a stack it plays, though it plays a copy moved: play=&tune^$-12)
  for (const d of decls.values()) if (d.gate) visit(d.gate, new Set());
  for (const c of cells.values())
    if (c.clock && c.units.length && !named.has(c.name) && !clocks.has(c.name) && !ctx.broken.has(c.name) && !OFFERED.has(c.name))
      ctx.info(`&${c.name} is written and nothing plays or reads it: it is silent (a part no performer plays)`, c.span);
}
