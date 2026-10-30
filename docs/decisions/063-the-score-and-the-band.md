# 063 · The score and the band: the conductor sends a score that ends in `use * from band`, and each client plays it on its own band of performers, instruments and cards

**Date:** 2026-10-30 · **Status:** accepted (owner, 2026-10-29 and 2026-10-30, on #354: the plan's five questions, the style's four, and the two edges, each ruled in its own comment) · Issues: #354, #315, #333, #376, #81, yggi/jambot#358, yggi/jambot#490, yggi/jambot#497, yggi/jambot#498, yggi/cell-studio#478

*Extends [058](058-the-performer-is-a-gate.md) and [061](061-the-band.md) (the performers and the band move out of the score into the client's band), [054](054-instruments-and-use.md) §2 (the band's own lines win over what it uses, so an override outlives every section), [060](060-the-key-is-named.md) (`&style` joins the interface names) and [027](027-on-top-of-strudel.md) (a pick by name is an addition, no Strudel spelling changed). The plan is [notes/315-score-and-rig.md](../notes/315-score-and-rig.md).*

## Context

The owner, 2026-10-29: Jambot "putting everything on a single MIDI card [is] an ad-hoc solution, not a proper one … the conductor sends a 'score' to 'performer-roles', its up to the client how to fill them, by default with a default performer, exercising their free()doms in alignment with the current style vector, playing/gating an instrument/voice."

Jambot's section text today is a whole band flattened into one text: the composer's lines, the performers' gates, voices that only hold a register, and one MIDI card whose positions are Jambot's channels. What was composed, who plays it, on what, and where it goes out are one text, and the last three are Jambot's own choices written into it. Cell studio follows it with a copy of Jambot's performer, its own synth, and a channel read off the card ([the plan](../notes/315-score-and-rig.md) §1).

The owner, 2026-10-29, on what a client is free to do: "the performers' freedoms are independent per client, so (soon), no two clients will sound perfectly alike … similar to (human) musicians" (yggi/jambot#358). What every client shares is the composition; what a performer does within its freedom is its own.

## Decision

### 1. The score and the band

A section's text splits in two where the wire runs:

| | the **score** (the conductor's) | the **band** (each client's) |
|---|---|---|
| holds | meter, tempo, key, harmony; a part per role (`&bassline`, `&leadline`, the drum lines); who plays when (061 §2); the section's style (§3) | the performers (gates, by role), the instruments they play (voices, kits), the cards: a sound card, a MIDI card, both |
| written by | the conductor, a section at a time | a default from cells' library, overridden by whoever plays it |
| travels | yes, every section | **never** (ruled): the host may name the default it plays, by id and hash |
| holes it leaves | the performers, by role | the parts, by their interface names |

**They meet by `use`, as they are.** The score ends in one line, `use * from band`, the same on every client, and each client's resolver answers `band` with its own. The band's head is `&band`, 061's table of performers (ruled: the band's id is `band`), so a score's selector over the band reads the client's players: who plays when is the score's, who they are the band's.

**An override is a line of the band, and the band's lines win over what it uses** (054 §2). "Tweak the bass for this session" is the band's own `&bassV …` line. It outlives every section because the score never defines `&bassV`, and it is saved as the band's file, a variation of the default with the default's id and hash in its lockfile.

**The routing is the band's.** Jambot's channels (1 the lead, 2 the bass, 3 the pad and the stab, 10 the drums) become its default band's MIDI card. A person with a fifth synth gives the stab its own channel in their band.

### 2. The feel is cells' code: the default performer

The default performer lives in cells, lifted from Jambot's performer (`performer.ts`: the base, the written accent, the licence of velocity and length, its own accents) with feel v1.2's vectors run here (ruled: "agreed"). It is applied to a performer's events after `realize`. Its widths are attributes on the gate, which may be `free(…)`, and their defaults read the style (§3). Cell studio's copy of the feel goes.

### 3. The style

**Styles are named cells.** A preset's style is a fragment of the facet `style`, its axes named under `map=style` from cells' table of axes (each with a name, a range and a sentence; Jambot reads the table instead of owning the axes). A text may write a mix of styles, which is exact by definition: the point that mix computes. A conductor writes a section's style as its numbers, or as a style's name where the section sits exactly on it. A weighted mix of two styles reaches only the points between them, so a mix would round a style a walk lands on (ruled 2026-10-30).

**The section's style is the note `&style`.** It is a note: silent, with a `label=` for people and a `style=` attribute for the band. `&style` is an interface name beside `&bar`, `&tempo`, `&key`, `&tonic` and `&harm` (060), not a reserved word: a band is written once and outlives every section, so every score names its style alike. Any other cell may carry `style=` as its association or wish (ruled 2026-10-30).

**A value is read by name inside the pick's brackets: `&x[slot]`.** The map names its slots: `map=adsr` attack, decay, sustain, release; `map=style` the axes. A name is the fixed position it stands for, as written (`&env[sustain]` ≡ `&env[$2]`). A map with no named slots refuses a name, and so does a name the map lacks, the diagnostic listing the slots it has. On a `style=` note, the pick reads the attribute's value (ruled 2026-10-30). This adds to 027's superset: Strudel has nothing after a name in brackets, and a bare word in a pick can only be a slot.

**A section's start and end are a range: `style=a..b`.** Its ends may be styles, a named one or an inline `&(map=style …)`, interpolated axis by axis. On a note with no factor, the position is time through the note's scope (0 at the section's first bar, 1 at its end), so `a..b` is short for `a..b * <0 to 1 over the scope>`, the rule `lpf=300..1200 * &x` already follows; another curve is a factor written out. One point is a constant. Not two steps: steps jump (ruled 2026-10-30). The scope is the piece's length, which a vibrato no longer stretches (#376).

**The tempo stays `&tempo`,** outside the style; a tempo can itself be a style-associated fragment (ruled 2026-10-29).

```text
# styles: fragments of the facet style
&funk map=style sync=.3 harm=.45 artic=.55 energy=.55

# the score's style: a note with the interface name, its ends a range over the section
use &funk from styles
&style label="Mellow Pool · section 1 (Intro) · bars 1–8 · close to Funk (80%), then Bossa nova · A minor · 120 BPM" style=&funk..&(map=style .41 .6 .45 .52)

# the band: a voice reads an axis by name, as an envelope's slot is read
&bassV s=saw loop=C2 lpf=300..1200 * &style[artic]
```

### 4. Where score and band don't meet: silence, said

The score says what is composed; a band that plays more or less of it plays silence where they don't meet, said as information and never an error (ruled 2026-10-30).

- **A part the score writes with no performer in the band** plays silent, and cells says so ("the score writes `&bassline`; no performer in `band` plays it"). The default band has every role, so a missing one is a client's choice, a person playing the bass for one.
- **A role that rests this section** is written by the conductor as a tacet: `&leadline ~`. Explicit and legible, and nothing new in cells.
- **A band's own extra player whose part no score names** rests, said as information. Only a performer's part, the hole its gate plays, does this; an undefined name anywhere else stays an error, so a typo is still caught.

### 5. The wire

`contracts/session` gets a major version (ruled), in yggi/music-commons:
- `score` replaces `section`: the score's text, its uses' lockfile, the texts a client's library lacks (yggi/jambot#498), the bars it foresees, where it cuts in;
- `conduct` replaces `bar`: per bar, its start on the host's clock and the conductor's gestures a text can't hold ahead (the seed, the Muse's offer); the style moves into the score's `&style`;
- `played`, `ping` and `pong`, and the lobby's messages are unchanged.

What a client must match is the score, not the host's events: a performer's freedom may differ per client (yggi/jambot#358). The tests that pin "identical" become tests that the score is the same and that each performer stays within its freedom.

## Why

- **The parts were already there.** 058 and 061 made the performer a gate with a role, 054 and 059 made instruments fragments taken by `use`, and 060 made values holes. What was missing was the line through the text where the wire runs. `use * from band` draws it with nothing new in the language: a hole filled by resolution, where 060 fills a value hole by definition. A score plus a four-line band was probed at 6fe981e: it compiles with no diagnostic, the bass heard on the sound card and sent on channel 2.
- **One performer, one sound, for every client.** The feel in cells replaces two copies of it; cells' renderer (062) replaces three synths. Jambot's sound design opens by itself: a voice is a line of text.
- **The band never travels,** so a client's override is its own, a person's synths are theirs, and the host decides nothing about how a client sounds.
- **The style is read, not owned.** A voice reads an axis as any moving parameter reads a cell, so Jambot's `timbreOf` becomes lines of its default instruments, and a saved session replays its style.
- **Silence, said, over an error:** a band outlives sections that drop a role, and a client's choice not to play a part doesn't break a session.

## Consequences

The rungs, each an issue with its bounds as numbers, the shape first:

1. **cells, the language:** `map=style` and cells' table of axes; `style=` on any cell and the interface name `&style`; a pick by name; `style=a..b` over a note's scope; silence said where score and band don't meet (§4).
2. **cells, the default band** as fragments: sounding instruments for every role, the performers, and `band` with Jambot's five roles, a sound card and a MIDI card on channels 1, 2, 3 and 10. Bound: a Jambot section played on it sends E35's corpus's MIDI (channel, note, velocity, onset, end) unchanged.
3. **cells, the default performer** (§2). Bound: E35's corpus at seed 1 gives Jambot's velocities and lengths, 0 mismatched.
4. **yggi/music-commons:** `contracts/session` 2.0 (§5), and feel's vectors run in cells.
5. **Jambot:** the section text as a score (no gates, no voices, no card), the default band resolved, a tacet for a resting role, solo mode as the host and one client joined by a loopback, its synth replaced by cells' renderer once R2 lands. The instruments found by style (yggi/jambot#527) move from the host's composer into the band.
6. **Cell studio:** the follower plays score and band through cells' performer (its copy of the feel deleted), the band editable and saved, its freedoms as sliders, then its audio on cells' renderer.

Until rung 5, Jambot's section text keeps its single MIDI card, and its built-in synth plays a voice's own sound off the text (yggi/jambot#526).
