/**
 * The examples Normalise leaves as written where a rule would rewrite them, and why (the owner on #668, 2026-11-09: the
 * examples teach, and a rewrite that sounds the same can still teach less): each the steps it keeps, by their titles.
 * Read by the tests that hold every example normal (`normalise.test.ts`, `tools/normalise.test.ts`). Pure.
 *
 *  - breve: a tutorial of alla breve, `meter("2/2", 2)`, its form the lesson (#524);
 *  - swing: a tutorial reworked whole as the meter's swing showcase (#646);
 *  - spooky: its stab line is "the piece's own", its prose says, beside the library's band and tune (#524).
 */
export declare const KEPT: Readonly<Record<string, RegExp>>;
