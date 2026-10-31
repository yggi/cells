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
import type { CellDecl, ParseResult, Span } from '../ast';
import { type CompileResult } from '../program';
import type { Cells, Ctx } from './context';
/**
 * The piece with a rest for each part a gate plays and no line writes, and an info for each; and those parts, each
 * where its gate reads it: declared nowhere, they are still the piece's holes (`CompileResult.unknown`, `holesOf`).
 */
export declare function restingParts(parsed: ParseResult): {
    parsed: ParseResult;
    rested: ReadonlyMap<string, Span>;
};
/** In a piece with performers, an info for each line that steps on a clock and that nothing plays or reads: its name appears in no other cell, and no output. */
export declare function unplayed(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, cells: Cells, outputs: CompileResult['outputs'], clocks: CompileResult['clocks']): void;
