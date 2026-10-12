# 028 · The smallest piece that sounds is `&a loop=A4`: an oscillator, heard through a built-in card

**Date:** 2026-10-12 · **Status:** accepted (owner, #10's language pass, round 3)

## Context

A cell looped at an audio rate is a voice ([sound.md](../language/sound.md)), so `&a loop=A4` already says "an oscillator at A4". It sounded nothing, for two reasons:
- With no card written, there is no output: the compiler warned "Nothing plays yet".
- Even with a card, `[&a]` was an error: "&a has nothing to play: a melody goes before it".

## Decision

1. **A voice alone plays its own pitch, held.** In a product, a missing pitch factor is the pitch identity (0 semitones), as a missing volume is 1. This is decision 006's algebra with its identities. `[&a]` is `&a` at its own pitch, held as long as the piece plays: an oscillator, not a note.
2. **No card written: a built-in one.** When a piece writes no sound card (`map=sample`), every sound that nothing else reads goes to a card of its own, the **built-in mixer**: a fader each, and a master at Strudel's default gain, **0.8**. It is in no line of the text; a piece that writes its card keeps exactly that card.
3. **The staircase stays.** A blank braid is the identity of the 12, so `&a loop=A4` sounds a 12-step staircase saw at 440 Hz. A voice's default sound is not a spelling, so decision 027 doesn't ask for dough's triangle.

## Why

- Every piece starts with one line: the smallest tower, one wheel turning at audio rate and the boundary it sounds into ([notes/10-language-pass.md](../notes/10-language-pass.md) §8).
- Nothing new is invented. The pitch identity is the mix algebra's own, and the built-in card was multiscale.md's implicit `&out`, in the variant "only when no card is written", which changes no example.
- Strudel's smallest piece is an event (`note("a4")`); ours is an oscillator. That is a difference of model, said in the docs for Strudel users.

## Consequences

- No example changes: every one writes its card.
- The built-in card's master is the `postgain` of #150 (the card's level, linear; a `free()` slider), so the built-in mixer and a written card share one control.
- The graph draws the sound going out with no card node (as #309 proposes for written cards too).
- Text the tutorial opens with can now be one line.
