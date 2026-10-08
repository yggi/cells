# 015 · `^n` moves by degrees (relative), `^$n` by grid steps (absolute)

**Date:** 2026-10-08 · **Status:** accepted (owner, #179: the transposition row of the operator pass)

## Context

Moving a reference had two spellings for two different things: `&x^n` moved what it plays n steps of the grid after its tables (semitones on the 12), and `degree(&x, n)` moved its values n steps of the table it is read through (degrees, in a scale; #171). Over a scale the two differ (`&m^1` made C D E into C♯ D♯ F, `degree(&m, 1)` into D E F), and the short form was the less musical one: a melody is moved up the scale far more often than out of it. #197 gave `$` the meaning "the absolute frame, not relative to the table" (`&key[$0]`: the entry as written; [decision 012](012-picks-are-taps.md)).

## Decision

- **`&x^n` is `degree(&x, n)`:** n steps of the table it is read through, before the table reads them (relative). `degree(…)` stays, the named form that defines it (and nests: `degree(inverse(&x), 4)`).
- **`&x^$n` is today's transposition:** n grid steps after its tables (absolute: semitones on the 12, a step of the root grid elsewhere).
- Labels on the graph and Shorten write the short forms: `^1` for a degree, `^$7` for grid steps.

## Why

One sign, `$`, for the absolute frame everywhere: without it, the frame of the wheel the value is read through (turned, scale-relative); with it, the frame below (as written, the root grid). The operator is the shorthand of the named form, as #179's rule asks.

## Consequences

- **Saved pieces** that wrote `&x^n` meaning grid steps now move by degrees: over the 12 the notes are the same, over a scale they differ; write `^$n` to keep them (CHANGELOG, by the owner's choice: no migration message). Every example is rewritten (`^n` → `^$n`, `degree(&x, n)` → `&x^n`) and plays the same notes (the event snapshot is unchanged).
- A mix still moves pitch in semitones (`&x + 7`); `^` and `^$` are for braids.
