# 077 · The core is sound only, cored up to a named interface; repetition is a count

**Date:** 2026-11-08 · **Status:** accepted (the owner on #482, 2026-11-08: on the performers, "(a), but with a note: we can use core to compile something to a minified version, but keep some 'interface' (e.g. we can core a fragment up to its signature, or a piece up to &tempo, or the jambot-score up to the gates, a named interface, for the band performers to fill in"; on unit reads, "c. core boils it down to counts"; the details, "1) yes, as suggested. ~!4 2) yes 3) I suppose so 4) yes"; "INTERFACE_NAMES is on the way out") · Issues: #581, #482, #560

*Read with [068](068-the-core-grammar.md) (the core and its sugar), [069](069-compile-writes-the-core.md) (compile writes the core), [058](058-the-performer-is-a-gate.md) and [061](061-the-band.md) (a gate is a performer, a role lists gates), and [065](065-fragments-take-arguments.md) (a fragment's signature).*

## Context

After #561 and #563, 66 of 83 examples are wholly in the core. Two of what is left are not rows but questions about what the core is for.

**A gate is a performer.** Decision 058 makes a gate the performer, and the compiler lists every gate as one (`performers`). #561 writes gates as their products, so the core drops performers:
- Gate's leadOut and drumOut become one;
- Spooky's five become four;
- Kinderlied's three become two.

Minify renames those it keeps. The fold drops a role line that nothing in the text reads, Electroswing's. So the core kept the gates a role reads without keeping the role. None of this changes what plays, so S1 can't decide it.

**`x!n` in a cell read by its units.** `&a!2` is one unit and `&a &a` two, and a rotation, a reversal or `cycle=` counts them (069 §2). Written `[x … x]@n`, one unit n steps long, it is exact in three examples of five. Canon fails, where a splice inside brackets is squeezed, and so does Electroswing, where `cycle=` counts inside.

**And a fixed interface.** `INTERFACE_NAMES` (`&bar &tempo &key &tonic &harm &style`) is kept by minify always. The compiler doesn't read any of them by name; they are a convention between a piece and its fragments, and #560 retires them.

## Decision

### 1. The core is sound only

`toCore(text)` is what plays and nothing more:
- a gate is its products;
- a role, a performer and an inert attribute go (069, amended);
- every name the text defines is renamed but a drum's (on a MIDI card, its note: 054, until #560's rung 1 rules on it).

A hash of the core says what plays, never who plays it. Comparing two pieces' identity is comparing these.

### 2. Cored up to a named interface

`toCore(text, { interface })` cores everything but an interface, a set of the text's names. Each interface cell:
- **keeps its name:** minify doesn't rename it;
- **stays a cell:** what reads it reads it by name, and it is never inlined, written into products or merged by the fold;
- **is a root:** the fold's "lines nothing reads" never drops it, since what reads it is outside the text.

What an interface cell reads is cored as any other. A gate kept as a performer's hole has its part and its voice cored and minified.

What the interface is for:

| What is cored | Its interface |
|---|---|
| A fragment, up to its signature | the signature's heads and parameters (065) |
| A piece, up to its tempo | `&tempo` (and `&bar`, `&key` …, as named) |
| A Jambot score, up to its gates | its roles and the gates each lists (061), for the band's performers to fill in |

A fragment cored up to its signature can still be used, `&bass from x(level=&l)`. So the core is a format a library can ship minified, not only a hash.

**The interface is named by the caller:** a list of names, or a preset (`signature`, `roles`). A signature on a piece, so that a score is a fragment whose parameters are its performers, is the direction (#560 rung 3e), as its own issue: that is a change to the language.

**Narrowing:** for I′ inside I, `toCore(toCore(x, I), I′) = toCore(x, I′)`. A score cored up to its gates for the band, and later cored to nothing for a hash, has the hash of its source.

`INTERFACE_NAMES` is no longer something the core keeps; it is at most a preset, and it goes with #560.

### 3. Repetition is a count

`x!n` is core: one unit, n steps of x.

- **Where nothing reads a cell's units,** every maximal run of identical units is written as its count: `0 0 0 2` is `0!3 2`. The repeats family, which wrote counts out, turns around and writes runs as counts.
- **Where something reads its units,** `x!n` and `x x` mean two things. Each stays as written, both core.
- **`x*n` is `[x!n]`:** n of x within one step.
- **A run of rests is `~!n`,** which keeps the step grid. `~@n` is one longer step, and the two sound alike only where nothing reads the units. A note followed by rests is never a count: `0 ~ ~ ~` is not `0@4`, since its note's length differs.
- **A run of groups is not a count.** `0 2 0 2 0 2` is six units, and `[0 2]!3` is three, each split in two. A repeated phrase is the fold's: a cell spliced and counted, `&p!3` with `&p 0 2`.
- **Runs are counted each round,** after the other families and minify, so units compare in their core spelling. The fold's `same` can make new ones, and the rounds go on until nothing changes.

A count inside a table stays a count: `scan(1!60)`, BWV 847's `scan(1!432 .72!96 …)`. A draw is unchanged by any of this: since #481 a draw is keyed on what its cell plays, so `0?!4` draws as `0? 0? 0? 0?` does.

## Consequences

- **069 amended.** §5: minify keeps the interface it is given, not a fixed list. §7: the fold's runs are compile's own, their canonical form, where it said compile never takes them: the core writes a run as Shorten does. §2's "`x!n` stays in a cell read by its units" is this decision's §3.
- **068's row 21, `x!n`,** is core, not sugar; `x*n` is its sugar.
- **`Core.left` reads only what is left.** A tape's read head (068 §2) and a `[ ]` no finer tap plays (069 §4) are core, and the unit-reads row goes.
- **The rungs** are #581's: the interface option, counts, and the mechanical rows. Each is checked by S1 over every example and by the narrowing property.
- **Nothing a piece plays changes.** No event snapshot moves.
