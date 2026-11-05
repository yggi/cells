# 070 · A swing leans pairs: a group of three stays straight, and `:pairs` says nothing more

**Date:** 2026-11-05 · **Status:** accepted (the owner on #15, 2026-11-05: "pairs-alone as the default swing: yes") · Issues: #15, #18, #204 · Amends [040](040-pulse-beat-and-laps.md) (a group of three's lean) and [053](053-the-pairs-alone.md) (its word)

## Context

[Decision 040](040-pulse-beat-and-laps.md) built `swing=8n:r` so that a level leans every group: a pair's second node at the share, and a group of three's second and third (the second moved as far as a pair's would, from a third, the third halfway to the end: long, short, short at .67). It came from Jambot's ternary lean (`apps/web/src/meter/ternary.ts` there), which is an experiment with an amount of its own that waits on listening (yggi/jambot#259), not part of the band's swing.
[Decision 053](053-the-pairs-alone.md) added `:pairs`, a word that leans a level's pairs alone and keeps its groups of three straight, because a band swinging a mixed meter plays it so, and so do Jambot's band (its T16) and the family's swing contract.

What the review on #15 found:

- **Everything that swings a group of three says `:pairs`, or nothing swings one.** Jambot's section text writes `:pairs` on every mixed meter and no swing on a meter of threes. No example or fragment swings a meter with a group of three.
- **The contract and cells disagreed by default.** `contracts/swing` v1 keeps a group of three straight; cells passed its 131 vectors only with the word, and recorded the 30 without it as differing.
- **The measured lean of three is near even** ([swing-research.md](../notes/swing-research.md): a beat in three at 0.332 : 0.323 : 0.351), and the one-number lean makes it long, short, short: a lean the measure doesn't show, and the opposite of a waltz's early second beat. A real lean of three is a node's own proportions, which the tree written in the meter cell holds (#18, parked until after 1.0), not a pair's share reused.
- So the default was the rare reading, and the common one needed a word: one spelling more than the meaning needs.

## Decision

- **A swing leans a level's pairs alone; a group of three is even at that level** (6/8's beat, 7/8's first). A finer level still leans inside it: `meter("6/8") swing=16n:.6` swings each eighth's sixteenths. Every node keeps its ends, as before.
- **A level with no pair leans nothing, with a warning**: `meter("6/8") swing=8n:.67` (every group of eighths three), as a level no beat divides into does.
- **`:pairs` is read and says nothing more.** `swing=8n:2/3:pairs` is `swing=8n:2/3`. Migrate drops it (`migrate/pairs.ts`, witnessed in `fixtures/migrations/pairs/`). It is read **without a warning** for now: Jambot's section texts write it and must compile with no diagnostic (its `section.test.ts`), so the warning comes in the release after Jambot stops writing the word.
- `SwingLevel.pairs` and `pairsProblem` go: the parser keeps no flag, and `swingLevelProblem` says where a level holds no pair.

## Consequences

- **No example's or fragment's events move**: none swings a group of three. A text that swung one without the word (6/8 or 12/8 swung on 8n, 5/8, 7/8, 10/8, a size with a 3) plays its threes straight now; a frontend that wrote such a text sees it at its next pin.
- `contracts/swing` v1: 131 of 131 without the word; the 30 recorded differences are gone (`src/contracts.test.ts`), and the word changes no vector.
- Cells' swing and the performer's (`perform/swing.ts`, the contract's reading) are now one rule; merging the two is a follow-up on #15.
- A lean of three, when a style asks for one, is the tree's: #18's proportions in the meter cell (`[58 42, 25 33 42]`).
