# 010 · A canon's `[<<n]` is a copy; a tap of what was played waits for `&<`

**Date:** 2026-10-07 · **Status:** accepted (owner, #147); open question 1 of [notes/nets.md](../notes/nets.md)

## Context

A tape's heads, a canon's delayed voices and a chorus are one shape: a net with taps at a delay ([notes/nets.md](../notes/nets.md), decision 17). In the code there are two spellings of a delayed tap, and they don't mean the same thing:

- `&john[<<1]` (a delay in steps), as in *Frère Jacques* and *Pachelbel*;
- `&near play=&tape at=.375` (a delay in seconds), a read head on a tape that `write=` records.

Either could be a **copy** (the score replayed a step later) or a **tap** (what was actually played a step ago). The two differ only once something happens once: a `free()` moved by hand, a belt slipping, a turntable held, a restart.

## Decision

- **`[<<n]` is a copy:** the braid replayed n steps later, from the score. A canon from copies keeps the score.
- **`play= at=` reads what was recorded:** a tape's head plays what its write head put on the tape, as it was played. A tape echoes the performance.
- **A tap of what any cell played is `&<`** (`&<john[<<1]`, #149), and is built only if the difference is heard in a real piece.
- **A tap's label is the transform's own spelling** (#146, `edgeLabel`): `[<<1]` in steps on a copy, `at=.375` in seconds on a tape's head.

## Why

Every example that writes `[<<n]` means a copy: *Frère Jacques* is a round of one score, *Pachelbel*'s violins follow the line, *Per tonos* answers the alto a step later and a fifth down, *Cellscape*'s canon is its melody shifted. None depends on what was played: in each, the difference between a copy and a tap is a performed difference (a `free()` moved by hand, a slipping belt, a held turntable, a restart), and it matters only for taps. Making `[<<n]` a tap would cost a recording per delayed reader and make a canon drift with the hands on the controls, which none of them wants. The tape already is the tap, for the pieces that want an echo of the performance.

## Consequences

- No piece changes: the events are the same (`src/engine/snapshot.test.ts` unchanged).
- The graph draws both as one net with delayed taps (`GraphNet.delayed`): each tap leaves the owner with its delay on it, a star, as a tape's heads leave the tape, because each delay counts from the owner, not from the reader next to it ([ui/graph.md](../ui/graph.md)).
- `&<` gets its own decision record when (if) it is built.
