# 033 · The folder writes a piece in degrees of its key where that is shorter; an accidental moves with its note

**Date:** 2026-10-12 · **Status:** accepted (owner, on #344: options 1c, 2a, 3a; the Strudel spellings with it) · Issues: #344, #307, #10

## Context

The folder (`engine/fold`, decision 025's Convert to cells) wrote every pitch in semitones from C4, so it found a
phrase again only a fixed number of semitones away (`&m^$k`). Bach's sequences climb a step of the scale at a time,
their thirds major then minor: in semitones they are different phrases. The language could already say it: a number
over a table takes an accidental (`over=scale(minor, C) 0 1 2 6# 7`), and `&m^1` moves a phrase a degree.

## Decision

1. **Which scale (option 1c):** the folder tries the twelve tonics in major, minor and harmonic minor and keeps the key
   the notes need fewest accidentals in; a tie goes to the key whose tonic the bass ends on, then to the commoner scale.
   It folds the piece in semitones and in degrees of that key, and keeps the shorter that plays the same notes.
2. **An accidental under `^n` (option 2a): it stays with its note.** `&m^1` makes `6#` a `7#`: shift with carry, the
   alteration riding along, as `inverse()` mirrors an accidental with its note. Strudel's `scaleTranspose` throws on a
   note outside the scale, so this adds a meaning and changes none (decision 027).
3. **Modulation (option 3a): one key for the piece**, accidentals where it modulates; since #346 also a key per
   section where the piece reads as its key areas (taken for reading, at most 15 % longer: `docs/notes/fold.md`,
   *Sections by key*); a turning key only if the ratchet asks for it.
4. **Strudel's spellings, with it** (decision 027's superset rule): `s` and `f` on a number are `#` and `b` (`6s`,
   `7f`, mixed and repeated as Strudel allows); `scale("C:minor")`, `scale("F#:harmonic:minor")` are
   `scale(minor, C)` and `scale(harmonic, F#)`. A tonic with an octave is an error (the octave is the voice's).
   Normalise (#244) will write `#`, `b` and `scale(name, tonic)`.

## Consequences

- A converted piece may declare `&key scale(…)` and read its lines through it (`over=&key`), its phrases moving by
  degrees (`&m^2`) and their copies too (`base=&m^1 =!3 5`). Figures over chord tables stay in semitones.
- Measured (the ratchets, `docs/notes/fold.md`): the examples through MIDI 55,974 → 51,810 characters, phrases back
  62 → 67, notes kept by the same 64; the WTC 120,755 → 118,353, every fold taken (shorter in degrees: 13 of 37 files).
- Converting folds twice as much (two pitch spellings); the fold runs in a worker and is watched, so the wait shows.
- No example changes; a saved piece reads as before (the spellings are additions).
