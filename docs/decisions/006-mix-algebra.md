# 006 · The mix algebra: sorts decide, `+` and `*` commute

**Date:** 2026-10-06 · **Status:** accepted (#10)

## Context

The shakedown (#10) property-tested the laws `mix.md` stated. `(a + b) * s = a * (b * s)` failed when `b` was a number: `(&theme + 12) * &lead` transposes, but `&theme * (12 * &lead)` is twelve times louder. Behind that were two rules that broke the laws, both in the parser, which can't know what a cell is:

- **The voice was the last non-number factor.** So `&lead * &theme` took `&theme` as the voice, which broke commutativity.
- **Pitch factors could be listed but not grouped.** `&theme * &vib * &lead` played, but `(&theme * &vib) * &lead` was an error, which broke associativity.

## Decision

Mixes are typed by sort, in `compile` (`src/engine/algebra.ts`); the parser keeps the expression as written. The sorts, the table of operations and the laws are in [../language/mix.md](../language/mix.md#the-algebra-of-a-mix). In short:

1. **A signal is a signal by what the cell is:**
   - it has a sound parameter
   - or its braid turns at an audio rate (20 Hz and up)
   - or it is a mix, a pattern read through a kit, a selector of mixes, or a read head of a sound tape

   A kit is a table of voices, not a signal.
2. **`+` and `*` are commutative and associative** wherever they are defined.
3. **Plain values take their operator's sort.** Numbers and `map=lin` cells are semitones in a sum (0 changes nothing) and a gain in a product (1 changes nothing). Among themselves they are plain arithmetic (`2 * 3` is 6).
4. **Pitch × pitch is pitch + pitch** (composing transpositions). Laws 2 and `(p + q) * s = p * (q * s)` together require it, and it is how `&theme * &vib * &lead` always played.
5. **Volume + volume stays undefined.** Nothing needs it yet.

## Rejected

- **Position decides a number's sort** (before the voice a pitch, after it a gain). This breaks commutativity: `12 * &lead` ≠ `&lead * 12`.
- **Literals with units** (`12st`, `.8x`). Consistent, but it rewrites every mix in every example to say what the operator already says.
- **Pitch × pitch as an error.** It gives up associativity for that case, and it breaks `&theme * &vib * &lead`.

## Consequences

- **What becomes valid:** `&lead * &theme`, `.5 * &lead * &theme` and `(&theme * &vib) * &lead`, each the same as its reorderings.
- **No example changed.** In all 291 bindings across the 52 examples, the voice was the last factor and the only signal. The events, cells and clocks are identical.
- **Saved pieces that could stop compiling:**
  - a cell used as a voice with no sound parameter and a braid below 20 Hz, or with no `loop=` at all. It played before (with a warning for a slow loop); now it is a pitch, and the error says why.
  - a pattern multiplied by its own kit (`&drums * &kit`). The error says to mix `&drums` alone.
- **Signal × signal must commute if it is ever defined.** That fits ring modulation and not FM, so FM keeps `fm=` (#28).
- **Typing is a phase of its own in `compile`,** a step towards #9's split.
