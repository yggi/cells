# 018 · A braid left to the performer: `free(0 2 4 ~)`, recorded from the keys

- **Date:** 2026-10-10
- **Status:** accepted (owner, on [#210](https://github.com/yggi/cell-studio/issues/210))

## Context

`free(default, lo..hi)` is a number left to the performer: moving its slider holds a value in its place until Keep (`engine/held.ts`). MIDI in ([#207](https://github.com/yggi/cell-studio/issues/207)) lets keys play a voice live, but nothing played could become code. Epic [#203](https://github.com/yggi/cell-studio/issues/203) asked for the same thing for notes: steps left to the performer, recorded from MIDI in, with the text staying the single source of truth.

## Decision

- **The form.** `free(0 2 4 ~ …)` around a braid is a braid left to the performer. It is allowed only as a cell's whole braid (not beside other steps, nor in a mix, a pick, `spell(…)` or an attribute). `free("…")` stays text. Its steps are numbers, rests and chords with their modifiers.
- **Length.** The default braid's length in steps is the frame a take fills, as `lo..hi` is a number's range. A take never changes it.
- **Recording.** Record (●, on the transport) is a flag beside the three transport states (`audio/transport.ts`, `recordTransition`: off, armed, taking), not a fourth state: a take runs while playing. It takes the next whole pass of the armed cell's loop, a pass just begun within half a step counting. Keys are timed by their `event.timeStamp` through the clock offset (`midi/clock.ts`, `Player.heardAt`), mapped to the cell's steps through its time map (`engine/clocking.ts`), so swing and moving clocks are undone. Positions stay exact until the take is written, then round to the nearest step (half a step later). Keys starting on one step are a chord `[a,b]` as long as the longest, a key held over steps `@n`, a step nothing covers `~`. MIDI in, the computer keys, the on-screen keys and a roll's rows all go through `Keys`, so a take hears them all. A new take replaces the last; overdub comes later.
- **Held, not written.** At the pass's end the take is held in the braid's place, as a moved slider's value is: one recompile a pass. *Keep* (or the transport's *Save*) writes it as `free(0 4 7 5 ~ 4@2 [0,4])`, *Revert* returns to the default, and Stop lets go of it, as it does of every held value. The piano roll and the steps on the cell's sheet edit a braid left free the same way: held, not written.
- **Keys outside the table: one setting, allow / snap / ignore**, shared by live play and recording, so what is recorded is what was heard. *allow* sounds the key as played and records it as the nearest pitch of the grid below the table, written as an entry with accidentals (`6#`, `3b`: the fewest, sharps before flats). *snap* sounds and records the nearest entry. *ignore* sounds and records nothing. It replaces #207's two ways: a kept *as played* reads as *allow*, *nearest* as *snap* (the default).

## The law

Recording what a braid plays gives the braid back, `capture(play(b)) = b`, for every braid of single notes, chords, holds and rests over a table: property-tested over a scale, 19-EDO, a swung clock, a motor spinning up and semitones (`engine/capture.test.ts`, 250 braids each). Keys outside the table are the one lossy case: under *allow* a braid with accidentals comes back sounding the same, spelt the way a take spells it (a pitch spelt twice in one chord is one key).

## Consequences

- No saved piece changes: a braid inside `free(…)` was a parse error.
- The stored key mode of #207 (`cell-studio:keys`) is read through the migration above.
- On a grid other than the 12, *allow* plays a key at its own equal-tempered pitch but records the nearest grid step: the take is in the piece's tuning.
- Not yet: overdub; a count-in; a kit's braid left free (drums recorded by pad); the sustain pedal lengthening a recorded note (a take ends a note at its key's release).
