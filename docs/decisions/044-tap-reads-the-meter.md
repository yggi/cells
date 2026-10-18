# 044 · "Tap" means reading the meter: a section is a section, a reader a reader

**Date:** 2026-10-17 · **Status:** accepted (owner: option B, #126)

## Context

"Tap" did three jobs in cells.
A line read a meter by pulse, beat or note value (`step=16n`: [decision 040](040-pulse-beat-and-laps.md)).
A name in a stepped table switched by a selector was a tap of the meter's bus ([decision 016](016-arranging-at-the-input.md), `restart=` on it: [decision 032](032-restart-policies.md)).
A cell reading a net, a canon's copy or a tape's head, was a tap of the net ([decision 010](010-canon-copies.md), `GraphNet.taps`), and a pick was "a fixed tap on a turning wheel" ([decision 012](012-picks-are-taps.md)).
`docs/language/time.md` needed a paragraph, "'Tap' names two things", to keep them apart, and the examples called the table `&parts`, which is what Jambot calls its drums, bass and comp.
A bare general word stops being a name once it does three jobs (the law of true names).

## Decision

- **A tap reads the meter**, and only that: `step=16n`, `step=beat`, `&bar2:pulse`, a tap's clock (`bar:16n`), `Clock.tap`, Shorten's migration to a tap (`shorten/taps.ts`), the messages that name one.
- **A section** is a name a stepped table of names declares, which a selector switches (decisions 016 and 032): `compiler/sections.ts` (`sectioned()`), `CompileResult.sections`, the attribute role `section` (`restart=` acts on a section or a selector), and the messages (`&x is a section of &sections`).
- **A reader** reads a net or what was played: `GraphNet.readers`, a net's *delayed readers* (a canon's copies, a tape's heads).
- **A pick** stays a pick; the prose calls it "a fixed reader" on a turning wheel.
- **The examples call the table `&sections`**, not `&parts`. Shorten offers the rename as a migration where a table of sections is named `&parts` and nothing is named `&sections`, checked to play the same notes. The name is a cell name, not a keyword: a piece that keeps `&parts` plays as before, and so does one with any other name.

The records of decisions 010, 012, 016 and 032 keep their text, with a note pointing here.

## Why

A tap is the one meaning the language spells: `step=16n` is a word of the language, while a section and a reader are roles a cell takes.
Taking "tap" from the roles leaves the spelled meaning with its word, and each role a word that says what it does: a section of an arrangement, a reader of a net.
"Part" is already Jambot's word for a voice of the band (its drums, bass and comp), so a table of parts would mean two things at the seam.

**Why not** keep "tap" for all three, with a qualifier (*section tap*, *meter tap*): every reader of the code and the docs had to carry the qualifier, and the code didn't (`result.taps` was the sections).
**Why not** a migration that renames every table of sections: the name is the author's, so Shorten offers it only for the examples' own `&parts`.

## Consequences

- `CompileResult.taps` is `CompileResult.sections`, and `GraphNet.taps` is `GraphNet.readers`: a frontend reading either moves with the pin (CHANGELOG).
- `restart=` on a cell that is neither says it acts on "a section … or a selector (over= a table of sections)".
- Elsewhere "section" already names a step of the form (the selector's steps a transport marks, `sections()` in `engine/duration.ts`, the folder's key areas); the prose this decision touches says "a step of the song" for the selector's steps.
- Cell studio and Jambot each rename their audio branch `tap` (a monitor on what plays) to `monitor`, and the hub's glossary carries the three words.
