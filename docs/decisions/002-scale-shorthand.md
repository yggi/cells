# 002 · `scale(tonic, phase)` stays as shorthand for two unnamed cells

**Date:** 2026-10-06 · **Status:** accepted (recorded from TODO.md)

## Decision

`over=scale(tonic, phase)` is kept. It is exactly `over=&(scan(…) over=&(shift=tonic))` with the scan of the mode `phase` (0 darkest, 6 brightest): `scale(0,2)` is C Aeolian, `scale(2,3)` D Dorian, `scale(7,5)` G Ionian.

## Why

It is the shortest way to say "this tune in that mode", and it is not a new concept: it expands to cells that can be written out when a piece wants to turn or step the key and the scale ([../language/tables.md](../language/tables.md)).
