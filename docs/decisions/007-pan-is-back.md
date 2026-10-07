# 007 · `pan=` is back: a voice's place in stereo, as channel gains

**Date:** 2026-10-07 · **Status:** accepted (owner, #10; reverses the seed's "balance with two mixes")

## Decision

`pan=` is a voice's sound parameter again, in dough's sense: 0 left, .5 centre, 1 right. It is a balance: the far channel fades, the near one stays full, so `pan=.5` is exactly a voice without `pan=`. The compiler turns it into the channel gains the sound card already uses (an output's, and each part's), and a kit's member is placed note by note by its own `pan=`. Two chords on the sound card (`[…] […]`) stay valid; the two forms mix.

## Why

Stereo was written by writing the mix twice: 20 of the 52 examples put two chords on the sound card that differ only in their gains, Ghost-Cells' line is seven entries twice, and Cellscape needs 12 mixes, two tables and two selectors for "a little left" ([notes/10-corpus.md](../notes/10-corpus.md), F3). Any pair of channel gains is one gain and one pan, so nothing that two chords say is lost.

## Consequences

- Nothing changes for a saved piece without `pan=`; a piece that had `pan=` (an error since the seed) now places its voice.
- `pan=` is a number (or `free()`), not yet a moving parameter: an auto-pan by a cell is to come with moving gains.
- A resonator heard through a kit doesn't take its member's `pan=` yet (the audio places a resonator by its outputs' gains).
- Shorten can offer it: two chords with the same entries and different gains become one chord and a `pan=` per voice.
