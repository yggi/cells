# 061 · The band: a role cell says what a performer plays as, and a selector over the performers says when they play

**Date:** 2026-10-27 · **Status:** accepted (owner, 2026-10-27, on the options for #292: "I also lean toward O1. check 304 rung B, it is related"; then, on a band entry being a role cell and one decision for both: "all as suggested") · Issues: #292, #304, #81, #288, yggi/music-commons#35, yggi/jambot#490

*Amends [058](058-the-performer-is-a-gate.md) §1 (a gate's name is no longer its role) and [016](016-arranging-at-the-input.md) point 8 (the switch and the gate converge, on the performer).*

## Context

Decision 058 made a performer a gate, and read its role off its name, as a kit member's drum note is read off its name (`gmDrumNote`): `drums`, `bass`, `pad`, `stab`, `lead`, a trailing number a copy (`lead2`), any other name none (`roleOf`, `ROLES`).

**The list is the reader's, not the compiler's** (#292). The five names are the parts feel v1.1 plays. Convert to cells guesses tracks among General MIDI's 128 programs, Cell studio's pieces name their own parts, and the analyzer's step grid has tracks. With no list in the compiler, the copy rule strips every trailing number:
- `&tr808` would read `tr`, and `&ch10` `ch`;
- the kit's rule is safe only because it strips against a list (`GM_DRUMS`): a name the list doesn't know gets the next free note, as it would unstripped.

**A name says the instrument, not the function.**

```text
&violin  play=&melody &violinV
&violin2 play=&harmony^$-12 &violinV
```

- Both are violins, which the voice `&violinV` says already (or `use "violin"`).
- `&violin` plays the tune, a lead; `&violin2` the harmony an octave down, a comp. Read off the name, `violin2` is a second violin, which is true and isn't what the feel needs.
- A copy is two gates of one function, a fact about the arrangement, not about how a gate is spelled. A spelling for it (`&lead_2`, a prefix a reader claims, `&lead(.*)`) is still meaning read off a name, and a prefix also catches `&leadline`.

**Who plays when has no form either** (#304, point 2). A section steps what it taps, and a part a text `use`s taps the meter (`walking bass`: `step=4n`), so no section steps it unless it is rewritten. #305's electroswing writes its form as a level line per part (`&bassLevel map=amp step=1m 0!4 .8!12 0!8 .8!8`), which works, but isn't the language's arrangement form. Decision 016 kept two mechanisms "for now" (point 8): the switch on the meter's bus (time) and the gate (sound), "which may converge". Since 058, the gate is the performer.

Nothing that reads a role is released: `roleOf`, `ROLES`, `Role` and `CompileResult.performers` came after v0.10.1, which both frontends pin, and neither reads them (checked 2026-10-27).

## Decision

### 1. A role cell says what its gates play as

- **A role cell:** `&<role> map=role &gate …`. Its name is the role, as written, and its entries are the gates that play it.

  ```text
  &lead map=role &violin
  &comp map=role &violin2 &viola
  ```

- **Two entries are two players of one role.** There is no copy rule, and no name is read for meaning: a gate may be named anything.
- **A gate no role lists has no role**, and plays as written.
- **Errors:**
  - a gate in two roles (`&violin2 plays two roles, &comp and &lead`): a reader plays one function per gate;
  - an entry that isn't a gate;
  - a role cell in a mix, a card or a `play=`: it is not a sound, as a stack a gate plays is not one (#287).
- **The vocabulary is the reader's.** Cells holds no list of roles: `ROLES`, `roleOf` and the type `Role` go. Feel v1.2 (yggi/music-commons#35) names the roles it has a feel for and plays any other as written, the output-id reading of v1.1 its fallback for a gate with no role.
- **What was compiled says it:** `Performer.role?: string`, the role cell's name, absent for none. Output ids don't change.
- **A drum hit's own role** (kick, backbeat …) stays its kit line's name (#287), read by the reader against its list, as the kit reads a drum note: out of this decision.

So 058 §1 reads: a performer is a gate, named anything; a role cell names the gates that play its role, in one place, so it can't disagree with itself. 058's "no `role=`" stands: the role isn't an attribute on the gate.

### 2. A selector over the performers says when they play

- **A band is a table whose entries are performers:** gates, or role cells, a role cell standing for all its players. It is a table as a kit is, with no step= of its own: the selector reading it steps (a step= on it warns). A gate is one entry of a band, itself or in one role there.

  ```text
  &band &lead &comp &bass
  &form over=&band step=1m [0,2] [0,1,2]!3
  ```

  Each step of the selector names the entries on, and the gate passes or mutes their sound. A gate listed itself is switched alone. Switching a role switches its players, as an arrangement is said: the bass drops out for the bridge.
- **The parts keep their time.** They tap the meter, so they swing, and a part a text `use`s is arranged as it is used.
- **`restart=` keeps its three meanings,** on a performer's part:
  - `free`: its time runs on, the default for a performer, as a player who sits out comes back in time;
  - `restart`: its part starts from its top at the switch; on whole bars (`step=1m`, `1m/2`) its notes keep their places in the bar, and its swing, and a switch off the bar warns;
  - `resume`: its part goes on where it stopped, warning off the bar alike.
  - On the selector for all its performers, or on a performer's own line (a gate's, a role's) for it alone, as on a section's.
- **Sections stay** as 016 has them: the switch of time on the meter's bus. A selector's table is of sections or of performers; this adds the switch of sound, on the performer, which is 016's point 8 converging.

## The rungs

1. **#292:** `map=role`, `Performer.role` from it and its errors; `ROLES`, `roleOf` and `Role` removed. The seed performers keep their parts (`&bassline` …), take Jambot's gate names (`&drumsOut`, `&bassOut`, `&padOut`, `&stabOut`, `&leadOut`), and each holds its role cell (`&bass map=role &bassOut`). *Unreleased*'s lines for #281 and #282 are rewritten.
2. **#304 B:** a selector over a table of performers or role cells, `restart=` as above. Bound: a part a text `use`s, switched by a band, plays what it plays unswitched in the bars it is on (`band.test.ts`); #305's electroswing taking its form from a band is its own change.
3. **Elsewhere:** feel v1.2 reads `performers[].role` (yggi/music-commons#35); Jambot's section text names its parts `&…line`, its gates `&…Out`, and writes the role cells (yggi/jambot#490).

## What it changes

- **No piece sounds different.** Nothing in cells reads a role. The one example with gates, `gate` (`&leadOut`, `&drumOut`), reads no role, as today. No event snapshot moves, and no output id changes: the seed performers' outputs name their parts, which keep their names.
- **Role names share the cells' namespace:** `&bass` as a role can't also be a part. The seeds already name their parts `&…line`; Jambot's section text, which names its parts `&bass` …, renames them as it moves to performers (yggi/jambot#490).
- **A frontend sees it at its next pin** as a new form, `map=role`, and a `Performer` whose role is a string or absent. Since none reads `performers` yet, no piece and no reader breaks.

## Why not

- **The name less a trailing number (#292 as first filed):** meaning read off a spelling, with no list to check it against (`&tr808` reads `tr`), and the function confused with the instrument (`&violin2`).
- **An explicit suffix (`&lead_2`) or a prefix a reader claims (`&lead(.*)`):** still a name mangled, and a prefix catches `&leadline`.
- **An ensemble cell whose members are role cells, each a bracket of gates** (`&band map=ensemble &lead &comp`, `&comp [&violin2, &viola]`): `[…]` already means a mix of sounds, so its meaning would depend on who reads it, the ambiguity #287 had to step around.
- **Roles as words on an ensemble** (`&band map=ensemble lead:&violin comp:&violin2`): compact, and the roles stay out of the namespace, but `word:&cell` is a new token, a voice hit (`&bd:0:.6`) the other way round, and decision 027 asks for no new form that isn't Strudel's.
- **A section that holds a mix of parts** (`&verse [&a, &b]`): the form 016 removed; a part not picked ran on unheard, and sections couldn't differ in length.
