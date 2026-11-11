# 083 · The language has laws: each property stated in one sentence, checked by a test, and an invariant only where the owner rules it

**Date:** 2026-11-11 · **Status:** accepted (the owner on #632, 2026-11-09: coring's fixed point "should be a first-class guarantee for the language, like alpha-substitution-immunity. we should collect those non-obvious language properties in a structured way, look for more of them"; 2026-11-11: "I11 is solid", and on this decision's five questions, "all as recommended") · Issues: #632, #26, #560, #687

*Read with 075 (a name is only a name, the first property stated and tested so: I10), 069 and 077 (the core: I11), 049 (the structure measure) and 070 (S1, what "plays the same" means).*

## Context

Decision 075 stated alpha substitution as a property of the language and tested it over every example, with its exceptions listed by name in a list that only shrank. When the list was empty (#678), it became invariant I10 on #26. On the way (#631), coring was found to be no fixed point while a default was written as an inline cell. The owner asked for that, and for every property like it, to be a guarantee stated the same way.

Several such properties were tested already, each in its own file and none stated as part of the language: every rewrite playing the same, every tool idempotent, time windows gluing, seeded chance, stems summing to the mix. #632 collected eleven, named the fields they come from, and mapped where to look for more.

## Decision

1. **A law is a property of the language**, stated in one sentence and checked by a test. `docs/language/laws.md` is the catalogue. Each row gives:
   - the statement;
   - the test files that check it, each test tagged `// law L<n>` where it is;
   - what the test covers (every example, every seed fragment, or texts written for it);
   - the suite it runs in (quick or slow; CI runs both on a ready pull request);
   - the field it comes from;
   - its status.

   `src/laws.test.ts` checks that the page and the tags agree both ways.
2. **An invariant is a law the owner rules into the language**: #26's I-numbers. I10 is L1 and I11 is L3; I4 is L11, and I2 is measured by L5.
   - A frontend may rely on an invariant.
   - A change that would break one is the owner's to rule (AGENTS.md: stop, push back, recommend), as an event snapshot that moves is.
   - A law not ruled is measured, not promised: a change that breaks it says so in its pull request and files it, and isn't blocked.
3. **An invariant has no exception.** A counterexample found is a bug against it: filed, and listed by name with its issue in the test, which fails once the example holds, so the list only shrinks.
   - A law may carry such a list too, as I10 did on its road. It is ruled an invariant only with the list empty, or with the list's bugs filed against it.
   - The first one: L11, `+` and `*` commute (I4), didn't hold in a stack a gate plays, where a product's first factor was read as the notes (#687, `electroswing` and `spooky`); fixed by reading the factor that isn't a level as the line, the owner's (a).
4. **The tests stay where they are.** The page links them, and the tags and `laws.test.ts` keep the two honest; no law's test moves into one file. A law may live in the slow suite, and its row says so.
5. **A conjecture** is a statement with no test yet, listed apart on the page with where it is worked. It becomes a law with a test that passes, or a finding with a counterexample. The renormalization thread (coring commuting with composition, #632 rung 5) is speculative and labelled so until something measures it.
6. **Scope:** the language and cells' own tools. A frontend's property belongs to that frontend, and one shared by several is a contract at the hub (yggi/music-commons), as the feel's reading is.

## Consequences

- `docs/language/laws.md` lists L1 to L11 and six conjectures, and `src/laws.test.ts` checks them against eleven tagged tests.
- L11's test is new (`src/engine/commute.test.ts`). Every example with its products and pitch sums written the other way round plays the same: 71 of the 73 it rewrites, and 2 against #687.
- L6 to L10 are checked over texts written for them, not every example; #632 widens each.
- #26 lists I11 (the owner, 2026-11-11), and AGENTS.md's escalation names the invariants.
