# 008 · A turning table comes round after its own length

**Date:** 2026-10-07 · **Status:** accepted (owner, #10); amends the default under decision 003

## Decision

A stepped table that turns (a key with `stride=7`, a scale stepped a degree a circle, a braid of chords stepped a bar at a time) comes round after its own length: the number of its steps, or a grid's size. `cycle=n` keeps its one job (decision 003), how many before it comes round, and now says something only when it differs from that length: more laps (`cycle=24` on the 12 climbs an octave and comes round after two), or fewer (`cycle=2`).

## Why

Every turning table in the 52 examples wrote `cycle=` (10 of them), 7 of them their own length (`cycle=12` on the 12, `cycle=7` on a scale, `cycle=95` and `cycle=280` on the chord tables). Without it, a table climbed a lap each time round, which no example wanted: a braid of 19 chords played its second pass an octave up ([notes/10-corpus.md](../notes/10-corpus.md), F6).

## Consequences

- No example changes: each one that turns writes `cycle=` already (its events checked identical).
- A saved piece that turned a table without `cycle=` and relied on it climbing now comes round instead; to climb for ever, give a `cycle=` as large as needed.
- Shorten can drop a `cycle=` equal to the table's length.
