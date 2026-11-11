/**
 * The examples Normalise leaves as written where a rule would rewrite them, and why (the owner on #668, 2026-11-09: the
 * examples teach, and a rewrite that sounds the same can still teach less): each the steps it keeps, by their titles.
 * Read by the tests that hold every example normal (`normalise.test.ts`, `tools/normalise.test.ts`). Pure.
 *
 *  - breve: a tutorial of alla breve, `meter("2/2", 2)`, and of a scan whose entries are sixteenths, its forms the lesson
 *    (#524, #668): every rewrite of it hides one;
 *  - daytime: a tutorial of clock time, `loop=1min`, `1h`, `1d`, `1wk`, its clocks the lesson (#668);
 *  - spooky: its stab line is "the piece's own", its prose says, beside the library's band and tune (#524).
 */
export const KEPT: Readonly<Record<string, RegExp>> = {
  breve: /./,
  daytime: /^&hour's ticks are/,
  spooky: /^&stabline is "spooky_stabs"'s/,
};
