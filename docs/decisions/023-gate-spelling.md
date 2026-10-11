# 023 · A gate is `play=`, `level=` and what it plays: a voice, a kit, or a chord

**Date:** 2026-10-11 · **Status:** accepted (owner: answers 1 and 3 on [the note](../notes/gate-example.md)) · Issues: #234, #10

## Context

A gate was written `&leadOut trigger=&tune velocity=&accent gate=&duck gain=.4 &lead &bell` (#264). It is read as the
product `[&tune * &accent * &duck * &lead * .4, …]`, where `&accent` and `&duck` are both volume streams, multiplied
together over each note, the order not mattering (decision 006); MIDI out sends that product at the onset as velocity.
So `velocity=`, `gate=` and `gain=` are one operation named three times; what they say (per note, over time, fixed) is
how fast a factor moves, which its cell says already. And `trigger=` is a look-up seen from the table's side: a kit
gate plays what `&beat over=&kit` plays, a voice is a table from note number to sound. Its braid `&lead &bell` meant
*play both*, where a braid of voices anywhere else (`&kit &bd &sd &hh`) means *pick one*.

## Decision

- **`play=&x`** names the notes a gate plays: `play=` on a cell with a braid is a gate; with none, a tape's read head
  (as before). The sort comes from the cell, as a factor's does (decision 006).
- **`level=`** is how loud: a product of level cells and numbers, `level=&accent*&duck*.4` (`level=.4` a gain alone).
  On the sound card `level=` stays the master level in dB.
- **Its braid reads as any braid of voices**: one voice or a kit, that; a chord of voices `[&lead, &bell]`, all of them;
  several bare voices `&lead &bell`, a kit of them, the notes picking one.
- **The old spelling still reads**, as it did (`trigger=`, `velocity=` `gate=` `gain=`, several bare voices all
  played), and **Shorten rewrites it** (`shorten/gates.ts`, checked note for note). It is off the reference and the
  tutorial; the node editor still explains it.
- One record holds a gate however it was written (`CellDecl.gate`, `ResolvedCell.gate`: its notes, levels, gain and
  voices); the parameters it was written with are taken off the cell, so a gate's `play=` is never a read head.

## Why

One canonical form per family (#10): one intensity, one look-up, one meaning for a braid of voices. It reads aloud:
*`&leadOut` plays `&tune` on `&lead` and `&bell`, at `&accent` times `&duck` times .4*.

## Consequences

- Saved pieces are not affected: the old spelling plays as before. A gate written the new way with several bare voices
  picks one of them (the old one played all); Shorten's rewrite writes them as a chord, so it plays the same.
- `level=` means two things by where it is (dB on the sound card, a linear product on a gate). The owner: this is the
  prime case of the **lin/log domain seam** that appears from several sides (#9, #234, #179): a value that is linear in
  one place and logarithmic in another, and the spelling that says which. Left as it is here; it belongs to that thread
  (and a gate's level and the card's could meet if the card becomes implicit, the implicit `&out`, deferred).
- Not done: a MIDI receiver telling the factors apart by rate (the ones that step with the notes as velocity, the slower
  ones as channel volume).
