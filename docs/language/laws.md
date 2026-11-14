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
| L11 | **`+` and `*` commute:** a mix's products and a pitch sum written the other way round play the same. | `src/engine/commute.test.ts` | every example (the 73 it rewrites) | quick | an algebra's laws | invariant I4 |
| L12 | **Renaming commutes with the tools:** writing in, Normalise, Shorten and the core of a renamed text play as the renamed result does. | `src/engine/symmetry.slow.test.ts` | every example (the core: every third) | slow | nominal sets; CT: naturality | invariant I12 |
| L13 | **Transposition:** a text whose voices are moved by an interval plays its notes moved by it, at the same times and lengths, and Normalise, Shorten and the core commute with the move. | `src/engine/symmetry.slow.test.ts` | every example, moved a whole tone (the core: every third; writing in: 78, 11 out of reach) | slow | music theory: the T/I group | invariant I13 |
| L14 | **Time scaling:** a text whose clocks run r times faster, where no line holds a time in seconds but a sound's own length, plays every onset at its time over r, every pitch kept, every length over r or held by its sound, and Normalise, Shorten and the core commute with it. | `src/engine/symmetry.slow.test.ts` | every example, r = 5/4, but 6 that hold a time in seconds (the core: every third; writing in: 62, 27 out of reach) | slow | metric geometry: a dilation | invariant I14 |
| L15 | **Normalise is confluent:** its rewrites, taken in any order, reach one text. | `src/engine/confluence.slow.test.ts` | every example written in, in its own order and 4 seeded others (62 of the 74 it rewrites; 12 against #729) | slow | PLT: Church–Rosser; critical pairs | law (broken: #729) |
| L16 | **The measure never grows:** no step of Normalise or Shorten raises the structure measure as written (decision 049), but naming the interface, which writes the named cell. | `src/engine/confluence.slow.test.ts` | every example written in | slow | a Lyapunov function | law |
| L17 | **Naming a sub-product plays as its parentheses do:** a product's factors with no sound, named in a cell of their own, play what they play written in place (decision 087), but where decision 079 reads the cell as a weighted value (one line of plain numbers times numbers). | `src/engine/naming.test.ts` | every example (105 groups in 57 of them; 45 left to 079, 33 on a continued line left as written, #764) | quick | PLT: let-substitution | law |
| L18 | **Naming a number plays as the number:** a plain number in a mix, given a cell of its own and named, plays what it played (decision 088). | `src/engine/numbercell.test.ts` | every example (the numbers of its own mixes) | quick | PLT: let-substitution | law |

L6 to L10 are checked over texts written for them, not every example; #632 widens each.

### Normalise's order and the measure (L15, L16)

Each example with its `from` lines written in is a text Normalise and Shorten have work on (`src/engine/confluence.slow.test.ts`, #632 rung 4).

- **Confluence (L15)** doesn't hold in 12 examples. Normalise's own order and a shuffled one reach different texts there. Every pair of rewrites that apply to one text, each followed by Normalise, either meets again or is one of four critical pairs: the library's rules against each other, a migration's arguments against the library, and the template against the meter and the tempo (#729, options for the owner). The 12 are listed against #729 until they hold.
- **The measure (L16)** never grows under a step of Normalise or Shorten, but where Normalise names the interface's tempo, writing its cell (`breve`, +2). The core is held to neither: it writes the sugar out (decision 069), and grows 70 of the 89 examples. Over the normal form, the measure decision 049 rules, Normalise is free by definition, and is one text only as L15 holds.

### The symmetries (L1, L12–L14)

Three actions act on a text, and each has its image on the events (`src/engine/symmetry.slow.test.ts`, #632 rung 3):

- **Renaming:** every name a text defines, to a fresh one; the events are the same (L1).
- **Transposition:** every voice the text writes, its frequency times the interval (an unnamed voice's in its line too); every frequency times the interval.
- **Time scaling:** every clock the text writes below audio rate (a tempo, a `loop=`, an LFO), its rate times r; every onset over r.

Five transformations are checked against each: compile (the events), writing in the `from` lines, Normalise, Shorten and the core. All fifteen hold over every example (the core's row, measured once over all 89, runs over every third: coring is its cost), with two kinds of exception, each listed by name in the test:

- **A time in seconds:** six examples hold one that no rate scales, so they are outside L14's statement, not counterexamples to it: four physical models (`musicbox`, `automaton`, `echotape`, `tape`: a motor, a mass, friction) and the law over the wall clock (`daytime`, `fiveto12`). A length the sound holds in seconds (a drum's hit, a bell's ring, a drone) is kept, not scaled.
- **Out of reach:** an action reaches the lines a text writes, so a `from` line whose fragment writes its own voice or clock, rather than taking one, is moved only once written in (11 examples for transposition, 27 for time scaling). The tools' rows act on the text written in, and L13 and L14 state those rows, not writing in.
The core's test (L2, L3, L5) covers every `from` line written in too, so it checks L9 over every example as part of the core.

## Conjectures

A conjecture is a statement with no test yet. It leaves this list with a test that passes, as a law, or with a counterexample, as a finding.
The renormalization thread (C6) is speculative and labelled so until something measures it.

| Conjecture | Statement | Field | Where |
|---|---|---|---|
| C4 | **Inversion:** a text inverted about a pitch plays its notes inverted, where no line holds an absolute pitch (transposition, the other half of the T/I group, is L13). | music theory: the T/I group | #632 |
| C6 | **Coring commutes with composition:** a piece cored with its fragments cored first is the piece cored (speculative: the start of a renormalization). | renormalization | #632 rung 5 |
