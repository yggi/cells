# 016 · Arranging at the input: a section is a switched tap of the meter's bus

**Date:** 2026-10-10 · **Status:** accepted (owner, #234, #29)

## Context

A selector read a table of parts (mixes) and their sound went through it to the sound card (`&song over=&parts`, `&out … &song`). A part not picked kept running, stepped but not heard; a piece whose sections differ in length couldn't use a selector, and wrote its form into every voice instead (BWV 847's `&tacetFugue ~@511`). Measured, a selector is the slowest clocked cell of its piece and yet sat after every voice it picks: drawn by time, its sound runs down into it (the rows-by-the-tower probe, [#239](https://github.com/yggi/cell-studio/pull/239)). Rewired at the input, *Pop* draws with 0.7 crossings where every way of gating its output cost 5 to 35 (the selector-gates probe, [#240](https://github.com/yggi/cell-studio/pull/240)).

## Decision

1. **A section is a tap of the meter's bus, switched on and off by the selector.** What a tap steps plays; what it doesn't stands still. The parts' sound goes straight out, through no selector.
2. **Spelled by its table:** a stepped table of names declares them as its taps, each stepped as the table is (`&parts step=&bar &keysBar &drumBar`); a part's cells are stepped by its tap (`step=&drumBar`); the selector reads the table (`&song over=&parts …`). Only when one of the names steps something, so a stepped braid of a mistyped name is still "Unknown cell"; a tap nothing is stepped by warns.
3. **A clock is a pattern with every onset firing; a pattern is a mask for a clock.** A tap switched by a selector is a clock masked by the selector's pattern.
4. **Switched on, a section restarts** from its top; switched off, it stands still.
5. **A section owns only what is stepped or looped from its tap.** A vibrato on `loop=6`, a drone on its own clock, a tape's motor go on.
6. **The old form is removed:** a selector reading a table of mixes is an error, and Shorten rewrites it at the input, checked to play the same notes. Every example arranged that way (10) rewrote automatically to the same notes.
7. **Two mechanisms, for now:** the switch on the meter's bus (time: whether a section moves) and the gate node (output: whether what it plays passes), which may converge (the gate-node note, [#240](https://github.com/yggi/cell-studio/pull/240)).

## Why

The selector is the slowest thing in a piece, and its job is the form: it belongs at the bottom of the tower, sending time up, not at the top taking sound in. Switching time, not sound, removes the running-but-unheard sections and their couplings (the tacets) and lets sections differ in length: BWV 847 written this way plays its 1765 notes exactly, and says the breath between the movements (`0@609 ~@15 1@496`) where the tacets hid it. The old form was a special case: `over=` maps numbers to values everywhere else, and only there routed sound, carried by machinery of its own; everything it said, the new form says.

## Consequences

- A saved piece with a selector of mixes stops playing until rewritten: the error says how, and Shorten does it (CHANGELOG).
- A melody played in two parts (Korobeiniki's bass in A and B) becomes a motif with a player per part (`&bassAOctaves step=&bassABar/2 &octaves`): one clock can't be two taps.
- The machinery of the old form (`partsOf` and its expansion in `compiler/bindings.ts`, the `part` flow, the mixes exception in the table check) is removed in a follow-up; until then Shorten's rewrite reads old pieces through it.
- #29's "a part picked starts from its top" is item 4; resume, for a cadenza's band, is open.
