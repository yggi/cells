/**
 * Phase 1b: the built-in card (decision 028). A piece that writes no card (neither `map=sample` nor `map=midi`) is heard
 * through one of its own: every sound that nothing else reads goes to it, a fader each (at 1), and its master, postgain=,
 * Strudel's default gain, 0.8, applied where a written card's is (in the audio, after the mix).
 * It is a declaration the parser never saw, under a name no line can write, implicit (not drawn, never edited): the
 * phases after this one route, wire and play it as any card.
 */
import type { CellDecl } from '../ast';
import type { Declared } from './declare';
import type { Ctx } from './context';
/** The cells a declaration's braid reads: its steps' splices, a mix's or a card's terms, inside subsequences too. */
export declare const braidReadsOf: (d: CellDecl) => string[];
/**
 * Every other cell a declaration reads: over=, a key's tonic (`scale(…, &tonic)`), base=, a step=/loop= driver, a map= table, env= and pitch=, a parameter's
 * cells and clocks, and the parameters that take a cell (play= write= excite= couple= fm= …: attributes.ts). Not about=:
 * a note's links are annotation only, so a note that explains its oscillator (`&oscNote label="…" about=&a`) leaves it
 * heard.
 */
export declare function otherReadsOf(d: CellDecl): string[];
/**
 * The declarations with the built-in card added, when the piece writes no card and has a sound nothing reads: a sound
 * is what the mix algebra calls a signal or a wave (sorts.ts: a voice, a mix, a gate, a pattern read through a kit, a
 * tape's read head, a braid at audio rate). Otherwise as they were. A cell a `use` line gave (`used`, decision 054) isn't
 * heard: a piece using the General MIDI kit would hold its 47 voices.
 */
export declare function builtinCard(ctx: Ctx, declared: Declared, used?: ReadonlySet<string>): Declared & {
    readonly builtin: string | null;
};
