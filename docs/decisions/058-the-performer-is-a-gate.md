# 058 · The performer is a gate, and its name is its role, as a kit member's name is its drum note; it plays a part on the instrument it uses; the register is the instrument's, and the gate may transpose

**Date:** 2026-10-25 · **Status:** accepted (owner, 2026-10-25: "the gate is the perfect place for the performer … jambot-preset-performers as fragments, with 'use' of their instrument-fragments. register belongs to the instrument; the performer/gate can transpose"; revised the same day: "no role=, name is the role, just like for the drum note names") · Issues: #280, #281, #282, #278, #81, yggi/jambot#490, yggi/jambot#497, yggi/music-commons#35, yggi/cell-studio#492

## Context

The owner's picture of the jam (2026-10-25), which this decision keeps:
- Jambot's composer writes a score with parts for performers.
- Each performer has an instrument and adds its feel to its part.
- cells knows neither composer nor performer. It expresses their protocol: fragments from the repository to the composer, parts with holes from the composer to the performers, and synth or MIDI as the performers' output, which the Muse reads back to the composer's workbench and files in the repository.

[Decision 037](037-the-handshake-with-jambot.md) draws the same line: the text holds what is composed, and the playing is the player's.

What no text says today is **who plays which part**. It is read from names, but not from the performer's:
- **Jambot's section text** writes each pitched part as a gate, `&bassOut play=&bass level=… &bassV` (yggi/jambot `packages/score/src/section-text.ts` at 3ef3dcc), and the drums through the kit.
- **The feel contract** (`contracts/feel` v1.1, yggi/music-commons#33) reads an event's part by parsing cells' output id (`bassV:bass:…`, `kit:voices:<role>:…`). It agreed with Jambot's own reading on all 652,242 events read of E35's corpus at seed 1, but every client re-implements the parsing of an id.
- **Convert to cells** guesses parts by track or by voice and numbers them (`&voice1` … `&voice5`).
- **The register has no owner.** Jambot's section loops its bass at C1 (`PIN_VOICES`), while the `bass` instrument fragment ([054](054-instruments-and-use.md), rung 7's first) sits at C2. A `use "bass"` in the section text would move every bass note an octave (yggi/jambot#490).

A gate is already "where notes become sound, named" ([mix.md](../language/mix.md)): it plays a cell's notes on the voices in its braid, at its `level=`.
And cells already reads meaning off a name in one place: a kit member's drum note (`gmDrumNote`, `src/engine/midi.ts`): `&bd` is General MIDI's 36, and `&bd2`, a copy, is a kick too.
So a gate needs no new form to be a performer, only that its name be read as a kit member's is, and a move.

## Decision

### 1. A performer is a gate, and its name is its role

- **A performer is a gate:** `&<role> play=&<part> level=<level> &<voice>`.
  The part is the cell whose notes it plays (the composer's), and the voice, or a kit, is what it plays them on (the instrument's).

  ```text
  &bass play=&bassline^$-12 level=.8 &bassV
  &drums play=&groove &kit
  ```

- **Its name is its role**, as a kit member's name is its drum note:
  - the roles the feel contract plays are names: `drums`, `bass`, `pad`, `stab`, `lead`;
  - a trailing number is a copy's (`lead2` is a second lead), as `bd2` is a kick;
  - a gate with any other name (`&leadOut`, `&ada`) is a performer with no role, and plays as written.
- **There is no `role=`**, and no other new attribute: the name is the one place it is said, so it can't disagree with itself.
- **A drum hit's own role** (kick, backbeat …) stays the name of the kit line that sounds it, read the same way: the performer is `&drums`.
- **What was compiled says it** (`CompileResult.performers`: each gate's name, the role read off it or none, its part, its move and its voices), so a frontend reads who plays what without parsing an output id. The output id itself doesn't change, since feel v1.1 reads it.

### 2. The register is the instrument's; the gate may transpose

- **An instrument fragment's voice holds the register** (`bass`: `&bassV loop=C2`).
  A part writes degrees over its table, and the instrument says where they sound.
- **A gate transposes what it plays** by its part's move, the braid's own forms:
  - `play=&bassline^$-12` plays every note 12 grid steps down (semitones on the 12);
  - `play=&bassline^2` plays every note two degrees of its table up.

  Today both warn that the move is ignored (`play=&tune^$-12`, checked at 2e555ae), so no piece changes.
- So Jambot's bass at C1 is the `bass` instrument (C2) played by `&bass` an octave down. Its MIDI notes stay where they are (yggi/jambot#490).

### 3. Performers are fragments, using their instruments

- **The facet `performer`:** a fragment holding one gate, named by its role.
  Its part is a hole the score fills, and its voice comes from the instrument fragment it `use`s.

  ```text
  use "bass"
  &bass play=&bassline^$-12 level=.8 &bassV
  ```

- **Jambot's preset performers become seed fragments** (`fragments/performers/`): each preset's drums, bass, comp and lead, associated at the preset's style point, at the level and move its section text gives that part today (#282).
  A preset's sound is then which performers are found at its point, and which instruments they use: a fragment, not code (yggi/jambot#420 rung 4, #497).
- **An ensemble is the performers a text uses.** A fragment may `use` performers, so a band can be one fragment, a nest of depth 2 under 054's rule (a performer uses its instrument). Two performers of one role in one text are copies (`lead`, `lead2`), as two kicks are.
- **The composer chooses them** last, after the meter, the rhythms, the harmony and the lines ([043](043-the-composer-selects.md)), by style like every other facet ([041](041-fragments-by-style.md), [046](046-facets-and-co-use.md)).

### 4. What reads it

- **The feel:** an event's part is its performer's role, read off the gate's name, and the output-id reading of v1.1 is the fallback for a gate with no role (yggi/music-commons#35).
- **Recognition and the Muse** can compare and file per performer, not per part guessed from an id.
- **Convert to cells and the folder** write their guess once, as performers: a gate per track or voice, named by the role guessed (channel 10 `drums`, the lowest line `bass`), and its instrument from the General MIDI program where one is known. Structure detection then has three axes stated in the text: when (sections), what (fragments), and who (performers). This is a later rung, filed when it starts.
- **Cell studio's graph** already draws a gate as a level meter; a performer is one, named by its role.

## What it changes

- **A gate named after a role becomes a performer.** No example or fragment names a gate `drums`, `bass`, `pad`, `stab` or `lead`; one page does, `mix.md`'s `&drums play=&beat level=.6 &kit`, and it is a drummer (checked at 2e555ae). Nothing reads a performer's role yet but the feel, so nothing sounds different.
- **No example writes a moved `play=`**, so the gate's move changes nothing that plays today.
- **A text may now say who plays what.** The frontends move to it at their pins: Jambot's section text names its performers by role (yggi/jambot#490), and Cell studio's follower reads them (yggi/cell-studio#492).
