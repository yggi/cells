# The language's laws

A law is a property of the language, stated in one sentence and checked by a test ([decision 083](https://github.com/yggi/cells/blob/main/docs/decisions/083-the-language-has-laws.md), #632).
A law the owner rules into the definition of the language is an **invariant**, one of #26's I-numbers: a frontend may rely on it, and a change that would break it is the owner's to rule (AGENTS.md, "stop, push back").
A law not ruled yet is measured, not promised.
An invariant holds without exception. A counterexample found is a bug against it: it is filed, and its test lists it by name with its issue until it is fixed, so the list only shrinks.

Each law below names its test, tagged in the test's file as `// law L<n>`, and what the test covers: every example, every seed fragment, or texts written for it.
`src/laws.test.ts` checks that the table and the tags agree.

## Laws

| Law | Statement | Checked by | Over | Suite | Field | Status |
|---|---|---|---|---|---|---|
| L1 | **Alpha substitution:** rename every name a text defines, and it plays, says and is read as it did. | `src/engine/alpha.test.ts` | every example, written in and as written | quick | PLT: α-equivalence, nominal sets | invariant I10 |
| L2 | **Every rewrite plays the same:** the core, Shorten, Normalise and Migrate each rewrite a text into one that plays what it played (S1). | `src/engine/core/core.slow.test.ts`, `src/engine/shorten/shorten.test.ts` | every example | slow, quick | PLT: semantics-preserving transformation | law |
| L3 | **The core is a fixed point:** cored twice is cored once, and plays the same, for a piece and for a fragment up to its signature. | `src/engine/core/core.slow.test.ts`, `src/repository/corefragment.slow.test.ts` | every example, every seed template | slow | order theory: a closure operator; CT: an idempotent monad | invariant I11 |
| L4 | **Every tool is idempotent:** Normalise, Migrate and Shorten, run on their own output, find nothing more. | `src/engine/normalise/normalise.test.ts`, `src/engine/migrate/migrate.test.ts`, `src/engine/shorten/shorten.test.ts` | every example (and, for Normalise and Migrate, every seed fragment) | quick | idempotent operators | law |
| L5 | **One canonical spelling:** a text and its normal form have one core. | `src/engine/core/core.slow.test.ts` | every example | slow | PLT: normal forms | law (I2's measure) |
| L6 | **Time is local:** windows played separately are the notes played at once. | `src/engine/smallest.test.ts` | texts written for it | quick | topology: a sheaf's gluing | law |
| L7 | **Chance is reproducible:** the same seed plays the same, and each lap is new. | `src/engine/realize.test.ts` | texts written for it | quick | determinism | law |
| L8 | **The stems sum to the mix:** the voices rendered apart add up to the mix exactly. | `src/engine/render.test.ts` | Electro swing | quick | linearity | law |
| L9 | **A copy is its template written in:** a `from` line plays what its copy written out plays. | `src/engine/from.test.ts` | texts written for it | quick | PLT: substitution | law |
| L10 | **The graph and the code agree:** what the graph sets is what the code says. | `src/engine/edit.test.ts` | Royal | quick | lenses: a round trip | law |
| L11 | **`+` and `*` commute:** a mix's products and a pitch sum written the other way round play the same. | `src/engine/commute.test.ts` | every example (71 of 73 it rewrites; 2 against #687) | quick | an algebra's laws | invariant I4 (broken: #687) |
| L12 | **Renaming commutes with the tools:** writing in, Normalise, Shorten and the core of a renamed text play as the renamed result does. | `src/engine/symmetry.slow.test.ts` | every example (the core: every third) | slow | nominal sets; CT: naturality | law |
| L13 | **Transposition:** a text whose voices are moved by an interval plays its notes moved by it, at the same times and lengths, and Normalise, Shorten and the core commute with the move. | `src/engine/symmetry.slow.test.ts` | every example, moved a whole tone (the core: every third; writing in: 78, 11 out of reach) | slow | music theory: the T/I group | law |
| L14 | **Time scaling:** a text whose clocks run r times faster plays every onset at its time over r, every pitch kept, every length over r or held by its sound, and Normalise, Shorten and the core commute with it. | `src/engine/symmetry.slow.test.ts` | every example, r = 5/4, but 6 that hold a time in seconds (the core: every third; writing in: 62, 27 out of reach) | slow | metric geometry: a dilation | law |

L6 to L10 are checked over texts written for them, not every example; #632 widens each.

### The symmetries (L1, L12–L14)

Three actions act on a text, and each has its image on the events (`src/engine/symmetry.slow.test.ts`, #632 rung 3):

- **Renaming:** every name a text defines, to a fresh one; the events are the same (L1).
- **Transposition:** every voice the text writes, its frequency times the interval (an unnamed voice's in its line too); every frequency times the interval.
- **Time scaling:** every clock the text writes below audio rate (a tempo, a `loop=`, an LFO), its rate times r; every onset over r.

Five transformations are checked against each: compile (the events), writing in the `from` lines, Normalise, Shorten and the core. All fifteen hold over every example (the core's row, measured once over all 89, runs over every third: coring is its cost), with two kinds of exception, each listed by name in the test:

- **A time in seconds:** six examples hold one that no rate scales: four physical models (`musicbox`, `automaton`, `echotape`, `tape`: a motor, a mass, friction) and the law over the wall clock (`daytime`, `fiveto12`). A length the sound holds in seconds (a drum's hit, a bell's ring, a drone) is kept, not scaled.
- **Out of reach:** an action reaches the lines a text writes, so a `from` line whose fragment writes its own voice or clock, rather than taking one, is moved only once written in (11 examples for transposition, 27 for time scaling). The tools' rows act on the text written in.
The core's test (L2, L3, L5) covers every `from` line written in too, so it checks L9 over every example as part of the core.

## Conjectures

A conjecture is a statement with no test yet. It leaves this list with a test that passes, as a law, or with a counterexample, as a finding.
The renormalization thread (C6) is speculative and labelled so until something measures it.

| Conjecture | Statement | Field | Where |
|---|---|---|---|
| C1 | **Confluence:** Normalise's rules applied in any order reach one text. | PLT: Church–Rosser | #632 rung 4 |
| C2 | **The measure never grows:** no step of Normalise, Shorten or the core raises the structure measure (decision 049). | a Lyapunov function | #632 rung 4 |
| C4 | **Inversion:** a text inverted about a pitch plays its notes inverted, where no line holds an absolute pitch (transposition, the other half of the T/I group, is L13). | music theory: the T/I group | #632 |
| C6 | **Coring commutes with composition:** a piece cored with its fragments cored first is the piece cored (speculative: the start of a renormalization). | renormalization | #632 rung 5 |
