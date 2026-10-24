# Two voices alike: S1 by what a voice sounds like

Date: 2026-10-24 · Status: open, a recommendation for the owner · Issue: [#192](https://github.com/yggi/cells/issues/192) (part of #154), found in #188 · Prototype: [192-voices-alike.patch](192-voices-alike.patch), on `main` @ 094ed45, not merged

Shorten's `same` rule merges cells written exactly alike, but never two voices (`same.ts` skips `c.voice`).
The issue says why: S1 numbers a voice by its place among the voices heard (#186, [decision 050](../decisions/050-the-equalities.md)), so removing one renumbers every voice after it, and S1 refuses a piece that sounds the same.
The owner, on the issue: "for S1, merging voices and renumbering should not matter. the fundamental truth is 'is the rendered audio identical?' … we are just shortcutting that."
This note tries that literally: a voice read as what it sounds like, not by its name or its place.

## The prototype

`sameEvents` (`src/engine/sameness.ts`) keys each event's voice by two things.

1. **Its sound** (`soundOf`): everything about the voice's cell that shapes its sound and its events don't already carry. That is its map, its rate, `loop`, its steps, `glide`, `oneshot`, `kit`, its exciters, its static parameters, its moving parameters' ranges, and its own braid as it flattens (the waveform). A cell it names (`env=`, `pitch=`, `fm=`, `couple=`, `excite=`, a moving parameter's factors) is read the same way in its turn, with a guard against cycles. No name enters the key. `gain`, `pan` and `legato` are left out because realize already folds them into the events' gains and lengths. Counting them again made a stated `pan=.5` differ from none (identity.test, shorten's defaults and stereo twins).
2. **What MIDI out sends**, for an event sent on a MIDI card (`e.midi`): each route's channel and note (`midiNote`). On a MIDI card a name *is* audible: a kit's member sends the General MIDI drum note its name gives (`kitNotes` → `gmDrumNote`), and the channel table hands channels out by a voice's place. Events on no MIDI card don't count here. The default channel table gives every voice a channel even on a piece with only a sound card, so counting those would refuse every merge again (each voice is its own channel: `&b`'s notes move from channel 2 to 1).

## Measured

- **The issue's case works.** In `&t * &a`, `&u * &b`, `&w * &c`, with `&a` and `&b` both `s=saw loop=C3 lpf=900`, merging `&b` into `&a` sounds identical under the prototype and is refused on `main`. The same text with the two voices' definitions and uses swapped (a renaming that moves a voice's place) passes, where `main` refuses it. A merge of two voices that differ only in `lpf=` is refused. A merge on a MIDI card with a channel per entry passes, since the channel is the entry's, not the voice's.
- **The quick tests:** 4028 of 4030 pass with the prototype. One fails on purpose: `vary/rhythm.test.ts` "none of the 284 plays the notes of its source…" (S2). It is the finding below. (`dist.test` fails only because `dist/` wasn't rebuilt.)
- **The examples have almost nothing to merge.** With `same` allowed to take voices, it finds two candidates in all the examples: `phase`'s `&mL`/`&mR` and `tines`' `&m1`/`&m4`. Both are FM modulators, not voices heard, so `main` already passes them: no voice after them is renumbered. Voices written exactly alike are rare. The gain is the principle, and later rules (a voice merged into another at a pan), not bytes today.
- Not run: the slow tests. The folder doesn't call S1, but its pieces might once Shorten does more.

## What it finds

1. **Jambot hears names that cells doesn't send.** E31's drum bars carry the old stand-ins, `&bd s=white`, `&hh s=white`, `&oh s=white`, on `map=midi(10)` as a plain list, not a kit. cells sends every one of them as the same note (60, white noise at middle C), and they render as the same noise, so a hat rotated onto an open hat really does sound and send the same. Jambot reads the name (`&oh` is GM 46) and plays a different drum. Under "is the rendered audio identical?" S2 says the rotation plays the same notes; under Jambot's ears it doesn't. Since v0.10.0 a fragment's drums are holes a kit fills (decision 054), so in a real piece the voices differ and the problem goes away. It stays for a text whose names mean something only to a frontend.
2. **`same` checks nothing itself.** `shortenAll` applies whatever `shorten` offers (`shorten/index.ts`), and `same` doesn't call `soundsIdentical` (`defaults.ts`, `gates.ts`, `stereo.ts`… do). Two non-voice cells written alike are safe by construction, which is why that holds today. A voice merge isn't safe by construction: two alike voices on a MIDI card, on different channels, move a channel. If `same` takes voices, it checks S1 on the voice merges.
3. **S1 ignores the MIDI card today, whatever the voices.** `whole` keys voice, onset, length, pitch, gains, bends, levels, parameters and envelope, but not `midi` or `unheard`. On `main`, a rewrite that moves a note from one MIDI card's channel to another, or from heard to MIDI-only, passes S1. The prototype's second key covers the channel and the note, not `unheard`. This is outside #192's scope: an issue of its own.
4. **It dissolves a constraint.** Decision 054 offers the `use` expansion only where it keeps the piece's heard voices in their order (S1 numbers voices by place). Read by sound, that order no longer matters. Recognition's "a pitched voice by its place" ([decision 055](../decisions/055-recognition.md)) is its own reading and stays.
5. **What a frontend sees.** S1 and S2 are exported (`@yggi/cells` sameness). Under the prototype each says "the same" more often, never less, except on a MIDI card where a channel or a drum note moves, which it now refuses (a fix). No event snapshot moves, since the snapshot hashes keep the names.

## Options

- **A. S1 by sound, as prototyped** (recommended): the owner's "rendered audio identical", held by a key and not by a renderer, plus what a MIDI card sends. `same` takes voices and checks S1 on them. The E31 test asks for S2 under the kit, or with its stand-ins told apart, because two white noises really are the same notes. It amends decision 050's point on #186: a new decision, numbered on #192 before it is written.
- **B. A `Rewrite` carries its voice map**, which the issue's first option names: S1 compares up to the renumbering the rewrite declares. That is narrower, and each rule that removes a voice must state its map. It doesn't dissolve decision 054's constraint, and it keeps the place as the identity. That's a shortcut for the audio, which the owner's comment rejects.
- **C. Merging voices stays a structure move under #157**, and `same` keeps refusing it. Nothing changes.

## Open for the owner

- A, B or C. If A: does S2 read voices by sound too (the prototype does), or by place, for Vary's "other notes"?
- Should Jambot's reading of names (a stand-in's name as its GM drum) be something cells sends? A plain list on a drum channel would send `gmDrumNote(name)` the way a kit does, and then both readings agree.
