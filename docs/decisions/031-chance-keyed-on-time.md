# 031 · Chance is keyed on the cell, the lap and the step, not on the voice

**Date:** 2026-10-12 · **Status:** accepted (owner, #151)

## Context

A step's chance (`x?p`, `[a|b]`) was drawn from a hash of `seed|cell|voice|lap|step`. So respelling a line rolled new dice: a voice renamed, or a pattern moved onto a kit, changed which steps sound (`chance` 1300 → 1340 notes, `onemore` 3658 → 3604; #10's examples pass, item 2).

## Decision

**The draw is keyed on the seed, the cell, the lap and the step.** The voice that plays it is not part of the key.

## Why

- One meaning per spelling (decision 017, roadmap target 3): a respelling that plays the same must sound the same, dice included.
- Strudel keys its randomness on time; cells keeps the cell in the key, so two cells stay independent, and `seed=` still picks another sequence.

## Consequences

- The 9 pieces with `?` or `[a|b]` change their draws once when it is built (decision 027's clean cut), and the snapshot is re-recorded with them named. After that, moving a pattern between voices or onto a kit keeps its dice.
