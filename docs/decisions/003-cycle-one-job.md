# 003 · `cycle=n` has one job; grids say `map=edo`

**Date:** 2026-10-06 · **Status:** accepted (recorded from TODO.md and the README)

## Decision

`cycle=n` means one thing everywhere: how many before it comes round. A grid is marked by `map=edo` (or `ed(r)`, `ratios`), not by `cycle=`: `&edo19 cycle=19 map=edo`.

## Why

Before, `cycle=` also decided whether a cell was a tuning. Separating the two lets one `cycle=` serve the circle of fifths (`stride=7 cycle=12`), per tonos (`stride=2 cycle=24`) and grids alike ([../language/tables.md](../language/tables.md), [../language/tuning.md](../language/tuning.md)).
