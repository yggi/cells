# 013 · `scale(name, tonic)`: a generator for a fixed mode over a key

**Date:** 2026-10-08 · **Status:** accepted (owner, #199) · supersedes [002](002-scale-shorthand.md)

## Context

A key (`&key`, the 12) and a mode over it (`&mode over=&key scan(…)`) can each be turned and tapped on their own. Often that isn't needed: the mode is fixed for a piece or a section, and only the key may move. The shorthand for that, `over=scale(tonic, phase)`, worked only after `over=` and named the mode by a number. On a single cell `shift=` can't stand in for it: it rotates the cell's own entries, which walks the modes (`&s scan(2 1 2 2 1 2 2) shift=2` is E♭ major, not D minor); transposing turns the wheel below.

## Decision

- **`scale(name, tonic)` is a generator**, in a braid or after `over=`: the scale's `scan(…)` over a key of its own, `shift=` the tonic. In a braid the cell is the scale (`&scale scale(minor, D)`); after `over=` it is an unnamed table. The key (and that table) are declared unnamed and not drawn; the wheel shows the key's 12 at its hub, the scale's taps lit.
- **Two turns, apart:** the cell's `shift=` walks its modes; the tonic transposes (a note name, a number, or `free(…)`, the cell's own slider, kind *tonic*).
- **Modes by name**, from one table (`SCALES`, `theory/modes.ts`): the seven modes, `major` and `minor`, harmonic and melodic minor, pentatonics, blues, whole tone; each a `scan(…)`. `{mode}` names those beyond the diatonic by the table's name (Blues).
- **Names bare, characters quoted** (for #179): `scale(minor, D)`, as `s=tri` and `show=notes`; quotes are for text and notation (`label="…"`, `meter("4/4")`).
- **`scale(tonic, phase)` still reads**, with a warning that says it by name; the examples are written by name.

## Why

A generator writes a braid, and the mask *is* the braid; an attribute (`mode=`) would describe how a braid is read, and would collide with `show=mode` and `{mode}`. One generator in both places replaces a form special to `over=`. Names say what a number had to be looked up for.

## Consequences

- Every example plays the same notes (the event snapshot; the hashes of values and the live view move with the unnamed cells' names).
- The tutorial's tier 3 (tables, motifs and chords) shows the one-line form beside the key and mode written out.
- Open for #179: `shift=$n` (turn the frame below, i.e. transpose) would make the tonic argument its shorthand.
