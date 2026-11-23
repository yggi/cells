/**
 * Migrate (decision 049, #156): a text written for an earlier version of the language, its retired forms rewritten as the
 * language writes them now, each rewrite playing the same notes (`rewriteAll`). Its witnesses are pairs of texts in
 * `fixtures/migrations/<rule>/`.
 *
 * Before 1.0.0 the language keeps no retired form: a form that retires is an error, not a warning, and no rule rewrites it
 * (the owner on #643, 2026-11-22: "the real job of migrate begins with 1.0.0. before that, we throw out anything old"). The
 * nineteen rules v0.26.1 held went with the readings that served them: the last, `arguments` (a `from` line passing the
 * piece's cell of a name its fragment declares), once the seed band passed its style itself (#882). Migrate holds no rule
 * today; the tool and its law (a text of the language today changes by nothing) stay for 1.0.0's first.
 *
 * Normalise runs Migrate's rules before its own (decision 049's order, Migrate, then Normalise). Pure.
 */
import { type Find, type Rewrite } from '../rewrite';
import type { CompileOptions } from '../program';
/** The rules a migration is found by: none before 1.0.0. */
export type MigrationRule = never;
export type Migration = Rewrite<MigrationRule>;
/** Every migration a text has: none before 1.0.0. */
export declare const migrations: (_options?: CompileOptions) => Find;
/** A text with every retired form written as it is now, one rewrite at a time, each playing the same notes; the steps are what each did. */
export declare const migrate: (source: string, options?: CompileOptions) => {
    source: string;
    steps: string[];
};
