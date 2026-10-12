# 030 · FM: Strudel's names for the built-in modulator; feedback from a fixed wavetable; operators in the algebra

**Date:** 2026-10-12 · **Status:** accepted (owner, #28); to build with the feedback work

## Context

`fm=&op` names a modulator cell (with `ratio=` on it and `index=` on the carrier). Strudel's `fm` is a number, the modulation index, with `fmh` the ratio. Under decision 027 a shared name keeps Strudel's meaning, so `fm=` clashes. Feedback (`&a fm=&a`) is an error, "FM chains can't loop". FM between cells is already writable in the mix algebra: `(&tune + &op) * &carrier`, exponential, its depth in semitones (decision 006's amendment).

## Decision

1. **`fm=n` and `fmh=r` with Strudel's meanings:** a voice's built-in modulator, a sine at `r` times its frequency swinging it by index `n` (linear FM, the DX7 kind).
2. **Feedback as a fixed wavetable** of `y = sin(φ + β·y)`, its amount a parameter of the built-in modulator. It is exact and static, and needs nothing parked (#17's worklet waits).
3. **Operator cells are written in the algebra:** `(&tune + &op) * &carrier`. Loops between operators (A → B → A) stay errors until a worklet exists.
4. **Built together**, in one PR, when the feedback work starts. Until then `fm=&op` stays as it is.

## Why

- Decision 027: `fm` means what it means in Strudel.
- The algebra already writes FM between cells, so `fm=` doesn't need to name one: one spelling per meaning.
- A fixed table is what a DX7 patch's feedback is (the rasp of its brass and basses).

## Consequences

- Today's `fm=&op` pieces (Cell Tines and four others) are rewritten when it is built. Linear `fm=&op` with `ratio=`/`index=` becomes `fm=index fmh=ratio`. A chain of operators becomes the algebra's exponential form, so those pieces change in sound and are named.
- The drawing: the built-in modulator is a part of the voice, and its feedback a mark on it, not a wire.
