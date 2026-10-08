# 012 · A pick is a fixed tap on a turning wheel; `$` picks as written

**Date:** 2026-10-08 · **Status:** accepted (owner, #10 · the wheels pass)

## Context

`&key[0]` picked from a braid *as written*, its `shift=` ignored: with `&key shift=2`, `&key[0]` was C, while `over=&key 0` was D. A pick and a read through a table said different things about the same wheel, and a pick never followed a key that steps or is turned by hand.

## Decision

- **`&x[i]`, `&x[a:b]` read the cell as it is turned:** with `&key shift=2`, `&key[0]` is D and `&key[0] &key[4] &key[7]` D F♯ A. A wrapped entry climbs a lap (`&key[10]` is the C above), as every shift does.
- **A pick of plain numbers follows the cell as it turns while it plays** (a stepped key, a `free()` shift): the note looks up its entry when it sounds (`StepEvent.via`). A cell only picked from is a table, not played, so a stepped one turns under its taps. In a mix a cell plays on its own clock, picked or not.
- **`&x[$i]`, `&x[$a:b]` pick as written**, whatever the shift.
- **Drawn as what they are:** a relative pick is a strand from its tap on the wheel (several from one reader: a bus through the wheel's loom), unlabelled; a `$` pick is a wire from the hub, labelled.

## Why

The wheel is the physical picture: an inner ring that turns, taps that stay put and read whatever has turned under them. A pick is a tap, so it reads the turned wheel, as `over=` does; the written position is the other question, and gets its own mark. One rule for both readings of a table (pick and `over=`), and a pick of a key follows the key, which is what a chord built on a key wants.

## Consequences

- No example's sound changes: the only one with picks (*Mirrors*) picks from an unturned motif (the events in `src/engine/snapshot.test.ts` unchanged).
- A saved piece that picks from a turned cell plays the turned entry; `[$…]` keeps the old notes (CHANGELOG).
- `spell(…, &keys, …)` picks its keys as written.
