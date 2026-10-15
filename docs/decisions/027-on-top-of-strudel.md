# 027 · Cells sits on top of Strudel: a shared spelling keeps Strudel's meaning; a clean cut before release

**Date:** 2026-10-12 · **Status:** accepted (owner, #10's language pass, #337)

## Context

Cells grew its step notation alongside Strudel's mini-notation and its sound parameters alongside dough's. Most spellings agree: `~` `x!n` `x@n` `x*n`, `[a, b]`, `[a|b]`, `euclid`, `s=`, `lpf` … But some are spelled the same and mean something else ([notes/10-language-pass.md](../notes/10-language-pass.md) §2, checked against Strudel's and dough's source). The owner's direction: cells sits on top of Strudel and dough as TypeScript sits on JavaScript.

## Decision

1. **The superset rule.** Where a step form is spelled as in Strudel's mini-notation, it means what it means there. Cells adds to that: cells, tables, the helix, sorts and nets, the "types" on top. It never gives a Strudel spelling another meaning. A sound parameter's name is dough's (or Strudel's) only when its meaning is theirs.
2. **The four conflicts, aligned:**
   - **`[a b]` is a subsequence**: the steps squeezed into one step, nested as deep as wanted. A chord takes commas: `[0, 2, 4]`. `[a b, c]` stacks a subsequence and a step.
   - **`euclid(k, n, r)` rotates as Strudel's `(k, n, r)` does.**
   - **`x?p` drops the step with probability p** (Strudel's `degradeBy`). `x?` stays a half.
   - **`*` on a clock is faster, `/` slower**, as on a step (`x*n`, a ratchet) and in Strudel (`fast`, `slow`): `step=&bar*4` is four steps per step of `&bar`, `&bar/2` one per two.
3. **A clean cut.** Nothing is released and there are no other users yet, so saved pieces don't constrain the language. A changed form gets no migration message and no compatibility reading. The examples and docs are rewritten to the new forms, and they play the same notes (the event snapshot is unchanged). This holds until the first release.

## Why

- One meaning per spelling (roadmap target 3) across the two languages a user of cells will read side by side, not just within cells.
- The four conflicts were also the cheapest gains:
  - `[a b]` adds the subdivision cells lacked;
  - `*` on a clock removes a sign that pointed two ways within cells itself (a ratchet faster, a clock slower).
- A clean cut now costs a rewrite of the examples. After a release, the same change would cost every user's pieces.

## Consequences

- Every example's clock chains swap `*` and `/`, and its `?p` becomes `?(1 − p)` (the same draws, so the same notes). No example used a comma-less chord or euclid's rotation.
- What Strudel has and cells lacks follows the rule, one addition at a time, with no further decision (#337):
  - `<a b>`, `x/n`, `x(k, n, r)`
  - `scale("D:minor")`
  - Strudel's and dough's parameter aliases, read with Normalise writing ours
- Where cells differs by model, not by spelling, it says so in the docs ("for Strudel users"):
  - per-cell clocks against a global cps
  - `[<<n]` climbing a lap
  - `fm=` naming a cell
  - loudness as products and `level=`
- New spellings are checked against Strudel's before they land. The owner chose, on this decision's advice ([notes/10-language-pass.md](../notes/10-language-pass.md) §7):
  - **`_` is Strudel's elongation** (`0 _ _` is `0@3`), and the step a `base=` copy keeps is **`=`** (decision 026's `_`);
  - **#306's forms:** a tie that slides is dough's `glide=t` (not `legato`, which stays Strudel's note length × n); a hit's own level is a sound's `:` fields as in `s("bd:0:.3")`, `&bd:n:gain` (not `x%n`); a voice's own level is dough's `gain=` (not `level=`).
- AGENTS.md's "stop before anything that could break saved pieces" reads, until the first release, as "stop before anything that changes how an example sounds".
