# 057 · S1 and S2 read a voice by what it sounds like, not by its place among the voices; on a MIDI card, by what MIDI out sends; Shorten's `same` merges two voices alike where the piece sounds and exports to MIDI as it did, so its parts stay apart

**Date:** 2026-10-24 · **Status:** accepted (owner, 2026-10-24, on #192: "for S1, merging voices and renumbering should not matter. the fundamental truth is 'is the rendered audio identical?' … we are just shortcutting that"; option A, and S2 compares by sound too; then, shown that the merge cost BWV 847's target ratchet, "keep parts apart") · Amends: [050](050-the-equalities.md) (its point on #186) · Issues: #192, #186, #154, #273

## Context

An event names its voice. Decision 050 (#186) made S1 and S2 read a voice by its place among the voices heard, in the order the text declares them, so that a voice renamed sounds identical.
But a place is a name too: removing a voice renumbers every voice after it.
So Shorten's `same` couldn't merge two voices written alike (`same.ts` skipped every voice), because S1 refused the piece it wrote, even where it sounds the same.
#192 offered two ways out: a `Rewrite` carries its voice map, and S1 compares up to the renumbering it declares; or merging voices stays a move by structure under #157.
The owner ruled for a third, which the issue's first option only approximates: S1 asks whether the audio is identical, and a voice's name and place are not audio.

cells has no renderer, so "the audio" is what a frontend would render from the events and the cells they name.
An event already carries its onset, length, pitch, gains, bends, levels, moving parameters and envelope.
What it doesn't carry is the voice itself: its waveform, its static parameters (`s=saw lpf=900`), its envelope, its `fm=` operator.
And on a MIDI card a name is audible: a kit's member sends the General MIDI drum note its name gives (`kitNotes`, `gmDrumNote`).

## Decision

1. **A voice is read by its sound** (`soundOf`, `engine/sameness.ts`). The key is every attribute of the voice's cell that shapes its sound: its map, its rate, `loop`, its steps, `glide`, `oneshot`, `kit`, its exciters, its static parameters, its moving parameters' ranges, and its own braid as it flattens. Each cell it names (`env=`, `pitch=`, `fm=`, `couple=`, `excite=`, a `map=` table, a moving parameter's factors) is read the same way in its turn, with a guard against cycles. No name enters the key. `gain`, `pan` and `legato` are left out, because realize folds them into the events' gains and lengths already: counted twice, a stated `pan=.5` would differ from none.
2. **On a MIDI card, what MIDI out sends counts.** For an event sent on a MIDI card (`Played.midi`), S1 keys each route's channel and note (`router`, `midiNote`): the entry's channel, and a kit member's drum note. An event on no MIDI card isn't keyed this way. The default channel table gives every voice a channel by its place even on a piece with only a sound card, and keying that would bring the renumbering back. What S1 still leaves out of a MIDI card (the port, heard or MIDI-only) is #273.
3. **S2 reads a voice the same way** (the owner): two voices alike play the same notes.
4. **Shorten's `same` merges two voices written alike, where the parts stay apart.** It keeps the first, and its users read the other. A merge that touches a voice is offered only where S1 holds *and* the piece's MIDI export is the same, its tracks' names aside (`pieceMidi`). `shortenAll` applies whatever `shorten` offers, and `same` was the one rule that checked nothing, which was safe while it never took a voice. The export is the parts, as Convert to MIDI writes them: each voice heard on a channel of its own. Convert to cells writes BWV 847's five parts on five voices alike (`&sawVoice` … `&moogVoice`). Merged (−232 characters), they sound identical, but they export as one part, and the section analysis that tells the parts apart by voice scored worse (`tools/targets.slow.test.ts`). The owner: keep parts apart. So two heard voices on a sound card each keep their own channel, and stay. What merges is what no channel tells apart: an FM operator, a send. Two kit members alike on a MIDI card (two white-noise stand-ins, `&bd` and `&hh`) are refused, because they send 36 and 42.

## Consequences

- **A voice renamed, two voices' definitions swapped with their names, two voices alike merged into one** each sound identical (S1 and S2). Two voices' parts swapped still don't, unless the voices sound alike. Whether a tool *writes* the merge is its own call: `same` keeps two parts apart, as above.
- **S1 now sees a voice's own sound.** Before, no event carried it, so S1 passed a rewrite that changed `&v s=saw` to `&v s=sine`, or a voice's `lpf=`; it now refuses those, and on a MIDI card a moved channel or drum note too. The only stated default a tool drops on a voice is `pan=.5` (Shorten's `default`), and `pan` stays out of the key, so no tool loses a rewrite to this. Over the examples, Shorten's suggestions are those it gave (8), and two more, the only voices the examples write alike: `phase`'s FM operators `&mL` and `&mR`, and `tines`' `&m1` and `&m4`, each merge saving 19 characters. `main` already passed both against S1, since the operators aren't heard and no voice heard is renumbered, but `same` skipped every voice. No two parts merge, and BWV 847's ratchet holds.
- **The `use` expansion** (054) no longer needs to keep the heard voices in their order to pass S1. Its order now matters only on a MIDI card, through a kit member's name.
- **Recognition and Vary keep their own reading** (055: a pitched voice by its place among the pitched voices, a drum by its General MIDI note from its name). Those read the notes as a frontend that plays them through MIDI hears them, which is decision 055's choice, not S2's.
- **Jambot's E31 bars**, with their white-noise stand-ins (`&hh s=white`, `&oh s=white`), now play the same notes when a hat moves onto an open hat: in cells' own output they are one sound and one MIDI note. The test that every variation plays other notes reads the bars in the core kit, where the drums are the kit's voices.
- **The snapshot keeps the names.** Its hashes witness how a piece is seen as well as heard, and no example's moves.
