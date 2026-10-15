# 038 · Jambot's score rulings, carried over: how each stands under 037

**Date:** 2026-10-15 · **Status:** accepted (owner, on [yggi/music-commons#14](https://github.com/yggi/music-commons/issues/14), approved 2026-10-15: its ruling 3) · Issues: yggi/jambot#7, yggi/jambot#116, yggi/jambot#63, yggi/music-commons#14

## Context

Before the handshake ([decision 037](037-the-handshake-with-jambot.md)), Jambot ruled on its own score language in two issues: [yggi/jambot#7](https://github.com/yggi/jambot/issues/7) took rulings (a) to (j), and its successor [yggi/jambot#116](https://github.com/yggi/jambot/issues/116) took (k) and kept a ledger with (l) and (m) still open; [yggi/jambot#63](https://github.com/yggi/jambot/issues/63) took E16, the drum line's form.
037 made the language cells' (D2) and stopped Jambot's syntax from growing a spelling of its own (D5).
So each of those rulings now either holds in cells, is overridden by a row of 037, or is an open question that a cells issue carries.
This record is that list, so that yggi/jambot#7 and #116 can close as archives: what they decided is here, and how it was reached stays there.

The words quoted are the owner's rulings as the issues recorded them (each issue's comments are posted from the owner's account); the date is the comment's.
An id in brackets is the claim in Jambot's catalogue (`docs/language.md` there) that cites the ruling.
"Lifted" names a target issue in music-commons#14's table, not yet created in this tracker.

## Decision

**Rulings (a) to (j), on yggi/jambot#7.**

| Ruling | The owner's words | Date | In cells |
|---|---|---|---|
| (a) numerals [U1] | "A numeral is a degree of the key's scale" (`b`, `#` alter the mode's degree) | 2026-09-26 | **open:** cells has no numerals; L4, pitch over a key (lifted) |
| (b) `scale=` [U3] | "`chordScale`'s candidates are the default, and a line states `scale=` only where they give none" | 2026-09-26 | **open:** cells' `scale(name, tonic)` is a generator ([decision 013](013-scale-generator.md)), and no chord implies a scale; L4 (lifted) |
| (c) pitch tokens [U2] | "`b` and `#` alter a degree, and absolute notes are upper case (`Bb4`)" | 2026-09-26 | **holds** in meaning: `3b`, `6#` alter a degree ([cell.md](../language/cell.md)), note names read upper case only (`loop=Bb2`, [tuning.md](../language/tuning.md)). Its spelling `b3` is **overridden** by D3's rule, cells' spelling where it agrees with Strudel: the accidental after the number, as Strudel's `3f` |
| #11, the oracle [L4] | "`@strudel/mini` may be a dev dependency for tests only" | 2026-09-26 | **open:** cells has no corpus against `@strudel/mini` yet; L10, Strudel conformance (lifted). It sits on Strudel by [decision 027](027-on-top-of-strudel.md) and depends on none of its code |
| (e) performance maps [T4] | "The text writes no velocity and only lengths on the grid" | 2026-09-26 | **holds** for the jam's stream, by 037's row "Score and playing" (the playing is the player's). Cells' own text may still write a level (`&hh:0:.5`, [cell.md](../language/cell.md)) |
| (f) the style's grid [C7] | "The band reads its style on a 3-decimal grid" | 2026-09-26 | **holds**, as Jambot's: the style space is the composer's (037, D2) |
| (g) a part is one voice [L6] | "Each part is one MIDI channel and one line of the score" | 2026-09-26 | **holds:** one cell a line ([cell.md](../language/cell.md)); a MIDI card's entry is one channel, whatever plays in it ([midi.md](../language/midi.md), [decision 019](019-midi-card.md)) |
| (h) any cycle [P5] | "A numeral reads over any cycle … The engine and MIDI stay in 12" | 2026-09-26 | **open** for the numeral: L4, keys of any cycle (lifted). The second half doesn't carry over: cells' grids are any cycle (`map=edo`, [tuning.md](../language/tuning.md)) and MIDI out bends a microtonal note ([midi.md](../language/midi.md)) |
| (d) motifs and their operators [U4, U5] | "Where Strudel has the operation, the name is Strudel's"; accents "an optional delta per onset" | 2026-09-27 | **holds** in meaning: `strans` is `&x^n`, `mirror` `inverse(&x)`, `rev` `&x[::-1]`, `late` `&x[<<n]`, a rest `~` ([braid.md](../language/braid.md)). The names are **overridden** by 037's row `^` (cells' spelling). **Open:** the other operators and a canonical one, L5 (lifted, from cell-studio#179); accents, yggi/cells#21 |
| (i) what `bpm=` counts [T7] | "Quarter notes a minute, a quarter of the step rate, whatever the meter" | 2026-09-27 | **open:** cells' `bpm` counts a meter's beats, `beat=n` of its steps ([time.md](../language/time.md)), not the grid; it settles with the meter tree, yggi/cells#15 (037's open rows `cycle=`, `grid=`) |
| (j) a drum hit's note [L7] | "a drum hit's note is chosen when lowering, by the device's map from its sound" | 2026-09-27 | **holds:** a kit's members go out as General MIDI drum notes by their names, mapped per device at the output ([midi.md](../language/midi.md)). A drum that is only its MIDI note is yggi/cells#10 |

**Rulings on yggi/jambot#116, and E16 on yggi/jambot#63.**

| Ruling | The owner's words | Date | In cells |
|---|---|---|---|
| (k) onsets relative to the meter [U6, T12] | "yes — treat an onset the same way a note is treated in the two-helix approach" | 2026-09-28 | **open:** cells' meter is levels or a scan, not yet one tree a step is read against; yggi/cells#15, with groups in yggi/cells#17 |
| (l) how bars of different lengths join [T14] | "How do bars of different lengths join?" (a question, options A to C; A has a witness) | 2026-09-27 | **open:** yggi/cells#22 (music-commons#14 merges it there) |
| (m) accents, notation or fill [A5] | "Are accents notation or fill?" (a question) | 2026-09-27 | **open:** yggi/cells#21, a meter's levels as a gain table (037's row "Accent grades" names cells' grades `* + - . ,`) |
| E16, the drum line [L8] | "form (iii), one line per sound, a default role" | 2026-09-28 | **holds:** a line per sound, `~` the rest between ([cell.md](../language/cell.md)), each sound a cell named by a word (037's row "A cell's name"). **Open:** the snare's role, L9, the snare as a named cell (lifted); which of cells' drum spellings is canonical, L2, identity (lifted) |

**The rest of #116's ledger (§7).**

| Ruling | The owner's words | Date | In cells |
|---|---|---|---|
| #107, the fill speaks dough | "dough's message format, rendered by Jambot's own synth, not dough's AGPL code" | 2026-09-27 | **holds**, as Jambot's: the performer (037's row "Score and playing") |
| #121, swing on the pulse [T11, T16] | "a 2-eighth pulse swings, any other plays straight at the 8th level" | 2026-09-28 | **open:** yggi/cells#18, swing on a level of the meter's tree (a group of 3's lean) |
| #147, the licence [T17] | "every part, and both velocity and timing, the way real musicians and instruments vary" | 2026-09-28 | **holds**, as Jambot's: the playing is the player's (037's row "Score and playing") |
| #161a, a draw keyed by position [S3] | "a performer's own draw keys on bar and step only, never a pitched part's note" | 2026-09-28 | **holds**, as Jambot's; cells' own dice are keyed alike, on the seed, the cell, the lap and the step, not the voice ([decision 031](031-chance-keyed-on-time.md)) |
| #161b, an accent is a delta [T18] | "A written `accent` is a delta every part adds on top" | 2026-09-28 | **open:** yggi/cells#21 (gains multiply, which in dB is Jambot's sum); 037's row "Loudness" |

**Overridden outright.** Two of Jambot's later rulings, outside these issues, are reversed by 037's word map (music-commons#14, ruling 4): `_` "= no onset here" (yggi/jambot#275, from #263, 2026-09-30) by the row `_`, which holds the note before; and "the sigil is `&` and the name a number: `&0`, `&1`" (yggi/jambot#287, 2026-09-30) by the row "A cell's name": a word, a hash the identity.

## Consequences

- yggi/jambot#7 and #116 close as archives of how each ruling was reached; this record is where each one stands.
- Jambot's catalogue keeps its claims and ids ([music-commons#14](https://github.com/yggi/music-commons/issues/14), ruling 2); a claim cells adopts later gets a decision here that cites its id.
- Each **open** row is settled in the issue it names, by a decision here; a lifted one (L2, L4, L5, L9, L10) gets its issue in this tracker when music-commons#14's lifting is done.
- Nothing here changes how a piece sounds.
