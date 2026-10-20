# 053 · The pairs alone: `swing=8n:r:pairs`

**Date:** 2026-10-20 · **Status:** accepted (the owner ruled for the capability, option A on [yggi/jambot#436](https://github.com/yggi/jambot/issues/436), and accepted this spelling on 2026-10-20, on #222) · Issues: #204, #18, #15

## Context

[Decision 040](040-pulse-beat-and-laps.md) built `swing=8n:r` so that a level leans every group: a pair's second node, and a group of three's second and third.
That stays the default: a lean of three is a real feel (an uneven waltz, a polska; the drums measured in [swing-research.md](../notes/swing-research.md) lean a beat in three).
But a band swinging a mixed meter (5/8 as 3+2, 7/8 as 3+2+2, 10/8 as 3+2+3+2) swings its pairs and plays its groups of three straight, as jazz does and as Jambot's band does (its T16, `docs/language-time.md` there).
No text could say that, so Jambot's shadow counted those bars as gaps (`swingStated`, yggi/jambot#436).
The owner ruled (2026-10-20) that cells gets a way to lean a level's pairs alone.

## Decision

- **`:pairs` after a level's share leans that level's pairs alone and keeps its groups of three even**: `swing=8n:2/3:pairs`, `swing=8n:.6:pairs`, `swing=8n:free(.5, .5..75):pairs`.
  - It is a word on one level: `swing=8n:2/3:pairs,16n:.55` keeps 7/8's first three eighths even and leans the sixteenths inside every eighth, as `16n` always does.
  - A pair leans exactly as it does without the word; a group of three plays at thirds of its node, exactly as with no swing at that level. Every node keeps its ends, as before.
  - Where no node of the level is a pair (6/8's or 12/8's eighths, every group three), it leans nothing, with a warning, as a level no beat divides into does.
  - Another word after the share fails at the word; `:pairs` on `legato=` fails too (a legato share holds every note of its level).
- **Without the word nothing changes**: `swing=8n:r` leans a group of three as decision 040 says. No example's, fragment's or contract's events move.

**Why a word on the value** (the issue's first candidate) and not the others:

- **It is the tree's shorthand, not a second spelling of it.** In the tree that #18's rung 2 writes in the meter cell, every node divides its span in proportions, and "one share per level is a shorthand for a level whose nodes all share one proportion" (swing-research.md). `:pairs` only says which nodes that shorthand fills: those of two. The others keep what the tree gives them, even today, and whatever a node of three is written as once the tree is written (jembe's `[25 33 42]`). So `:pairs` composes with the tree, and the tree needs no second way to say it.
- **Why not a separate share for threes, `swing=8n:.67/.5`:** `/` is a fraction in a share ([decision 042](042-swing-share-as-a-fraction.md)), so `swing=8n:2/3/1/2` reads as nothing, and another separator is one more sign to learn. And a second share would be a parameter of decision 040's one-number lean of three (the second moved as far as a pair's, the third halfway), which the tree replaces with the node's own proportions: a spelling the tree would supersede.
- **Why not the override at the tap:** #18's rung 3 is a line's own share (`&solo step=8n swing=.55`): it says which line leans, not which nodes of the meter lean. A band swinging 7/8 swings it in every line, so it is the meter's, stated once on `&bar`; a per-group override would also need a way to name a group, which nothing has.

**Not yet:** a word for the converse, a level's threes alone (no music has asked for it: a word beside `pairs` when one does); the word on a bare `swing=r` (a list's pairs are already pairs).

## Consequences

- `SwingLevel.pairs` (`src/engine/meter.ts`) carries it from the parser to the placement (`knotsOf`); `pairsProblem` is the warning.
- Tests (`src/engine/swing.test.ts`): every meter of the repository (13) with `8n:2/3:pairs`, its eighths a literal table, a pair exactly as `swing=8n`, a three exactly as straight; 5/8, 7/8 and 10/8 at 90 bpm land on Jambot's T16 onsets (lifted from there, measured by its `swingMapAt`).
- Jambot states a mixed meter's 8n swing with it at the pin that carries it, so its shadow's last swing gap goes ([yggi/jambot#451](https://github.com/yggi/jambot/issues/451)).
