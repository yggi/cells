/**
 * Migrate (decision 049, #156): a text written for an earlier version of the language, its retired forms rewritten as the
 * language writes them now, each rewrite playing the same notes (`rewriteAll`). Its witnesses are pairs of texts in
 * `fixtures/migrations/<rule>/`.
 *
 * Before 1.0.0 the language keeps no retired form: a form that retires is an error, not a warning, and no rule rewrites it
 * (the owner on #643, 2026-11-22: "the real job of migrate begins with 1.0.0. before that, we throw out anything old"). The
 * eighteen rules v0.26.1 held (gates, taps, bare swing, `over=key`, moved and forwarded ids, grids, laps, renamed ids,
 * `oneshot`, `beat=`, `:pairs`, drum notes, parts, the old axes, main meter, one root and laws) went with the readings that
 * served them. What is left is one rule, over a live form:
 *
 *  - arguments.ts: a `from` line of a fragment that reads a name it declares, passing the piece's cell of the name:
 *                  bass_performer(bassV=&bassV) (decision 075, #560 rung 3c–e)
 *
 * Normalise runs Migrate's rules before its own (decision 049's order, Migrate, then Normalise). Pure.
 */
import { type Find, type Rewrite } from '../rewrite';
import type { CompileOptions } from '../program';
/** The rules a migration is found by. */
export type MigrationRule = 'arguments';
export type Migration = Rewrite<MigrationRule>;
/** Every migration a text has; a `from` line's fragment read through `options.resolve`. */
export declare const migrations: (options?: CompileOptions) => Find;
/** A text with every retired form written as it is now, one rewrite at a time, each playing the same notes; the steps are what each did. */
export declare const migrate: (source: string, options?: CompileOptions) => {
    source: string;
    steps: string[];
};
