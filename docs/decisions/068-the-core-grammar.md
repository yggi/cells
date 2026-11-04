# 068 · The core grammar: four primitives and the ramp; sources outside; sugar written by Normalise, the core by a compile tool

**Date:** 2026-11-04 · **Status:** accepted (the owner's answers on #435, 2026-11-04: 1 "yes, ramp as fifth primitive", 2 "yes, sources", 3 "loop: B, maybe C later", 4 "yes", 5 "yes, I think that's good", 6 Normalise "should stay on the human-readable added sugar level", the rest a compile tool) · Issues: #418, #51, #26, #27, #151, #179; follow-ups #434, #438, #439, #440, #441

*The inventory behind it is [418-core-grammar.md](../notes/418-core-grammar.md); the S1 checks are `src/engine/core.test.ts`. Read with [049](049-four-tools-over-a-piece.md) (the four tools) and [050](050-the-equalities.md) (the ladder).*

## Context

Before 1.0 freezes the language, it should be clear which forms are its **core**, which a later version must keep meaning the same, and which are **sugar**, which rewrite into the core and can be respelled freely. [multiscale.md](../notes/multiscale.md) proposed four primitives that may generate the language: shift with carry, dilate, look up and combine. #418 put each of the reference's 113 forms into one of three classes:

- **core:** 46 forms;
- **sugar:** 45 forms, 43 of them sounding identical to their rewrite by S1, in 59 rewrites;
- **outside:** 22 forms.

The note has every row.

## Decision

### 1. The core: four primitives and their terminals

- **The primitives:**
  - **shift with carry:** `n#`, `[<<n]`, `^n`, `^$n`, `shift=`, `stride=`, `cycle=`;
  - **dilate:** `@n`, `/n`, `inverse`, `step=`, `step=&x*n/d`, the rate of `loop=`;
  - **look up:** `&x`, `&x[i]`, `over=`, `map=`, a section, a role;
  - **combine:** `[a, b]`, `*`, `+`, `env=`, `laps=`, the card, with the sorts as its types.
- **The terminals:** a cell, a number, a fraction, a rest.
- A later version keeps what each of these 46 forms means. A change to one is a major version after 1.0.

### 2. The ramp is the fifth primitive

A value or a time moved continuously between steps. No rewrite into steps makes it exact. It holds:

- `map=lin` and `map=adsr`;
- soft time: `swing=`, `wow=`, `varispeed=`, a belt (`belt=`, `damping=`, `slip=`), and a read head's `at=` and `wander=`;
- a `loop=` line's reading (§4).

It is core, as §1's forms are.

### 3. Sources and inert data are outside the grammar

- **Sources** are border cells, like `&bar` and `&key`: `free()` (a performer's hand) and chance (`[a|b]`, `x?`, `chance=`, `seed=`, a seeded stream). What reads them is core: a choice is a look up by a chance index, and `x?` is a product with a chance gate. As text, a `free()` plays its value.
- **Inert data** is the graph's and the style's: a note, `label=`, `show=`, `size=`, `tags=`, `about=`, `map=style`, `style=`. It is kept, and passes through every tool unchanged.

### 4. `loop=` on a line: dilate, then a held ramp

A `loop=` line has the rate of `step=r·k`, and reads its braid as a signal that holds each value and starts no notes: a bend, a waveform, a voice's frequency. The reference's "`loop=r` is `step=r·k`" is narrowed to say so (#438). Nothing plays differently.

Splitting the rate from the reading, with `loop=` as pure sugar of `step=` and the signal given a spelling of its own, may follow if the ramp gets its own spelling. That is a meaning change with a migration: before 1.0, or 2.0.

### 5. The sugar

The 45 forms marked sugar in the note:
- the mini-notation's time, which is `@` and `/` on a finer step;
- every generator;
- every unit and tap (`bpm` … `k`, `16n`, `pulse`, `&m:8n`);
- `map=db`, `edo`, `ed(r)`, `midi(c)`;
- `base=`, `=`, gates, `( … )`, `from`, `off`, comments.

`pitch=&x` is sugar of a sum in the mix. S1 learns to read a voice's `pitch=` as the bends it already plays (#439), and to plan with `off` (#434). Each exact rewrite stays in `core.test.ts`, so a change that breaks one fails there.

### 6. Normalise writes sugar; a compile tool writes the core

- **Normalise stays at the human-readable sugar level** (049, unchanged). It writes one spelling per sugar family (#27's table) and never de-sugars.
- **A compile tool** writes the core: it de-sugars, minifies the names, and folds to the most compact form in the core grammar. It is scoped on #441, with its own decision. Its renaming leaves the interface names (059, 060) and names a text uses but doesn't define as they are, and renames the rest freely: S1 reads a voice by its sound (057), and a renamed text is rung E2 (050).

### 7. `oneshot` retires as a line word

A line holds names, attributes and a braid. `oneshot`, a voice's value, becomes a parameter of the voice. Its spelling is named on #440, and Migrate writes it before 1.0.

## Consequences

- #27's table has its rows: the 45 sugar forms, each with one tested rewrite. #151's canonical forms are the pairs among them.
- #179's grid of shifts is one primitive's seven forms. Its missing cells (`$` on a rotation, an accidental on a reference) are gaps in it, not new forms.
- What changes a written piece: `oneshot` (#440, migrated). The rest changes wording (#438) or what S1 reports (#434, #439), not how a piece sounds.
