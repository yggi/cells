# 070 · S1 hears as a listener: pitch within half a cent, level within 0.1 dB, time within a quarter of a millisecond; a noise by its colour and level; the snapshot stays exact

**Date:** 2026-11-05 · **Status:** accepted (the owner on #483, 2026-11-05: "S1 is too strict, 12 digits is way beyond 'sounds identical'"; "you are the domain expert. noise should also compare by audible identity, not numeric. pure white noise at the same level should be identical under S1")

*Amends [050](050-the-equalities.md)'s S1 row and its "the snapshot is S1" line, and [057](057-a-voice-by-its-sound.md)'s reading of a voice. Code: `src/engine/sameness.ts` (`HEARD`); tests: `sameness.test.ts`.*

## Context

S1 (`soundsIdentical`) is what every rewriting tool promises (049): Migrate, Normalise, Shorten, and compile (069). Decision 050 defined it as "the snapshot's `notes` and `events` hashes": every event's numbers, rounded to strings (onsets to 10 µs, frequencies to a thousandth of a hertz, gains to 10⁻⁵), and a voice's sound compared as exact doubles. That is far stricter than hearing:
- a pitch written to 12 digits, 3·10⁻⁹ cents off, was "another voice";
- a gain 0.0002 dB off was another event.

It was brittle too: two sums of one time in another order, 7·10⁻¹⁵ s apart, could fall on either side of a rounding edge. #441's probe had to write every digit of a double to pass.

## Decision

### 1. S1 is what no listener can tell apart

Each dimension S1 compares has a threshold, a fraction (a quarter to a fifth) of the smallest difference listeners hear in the best conditions. So two texts S1 calls identical sound alike to every listener, not to most (`HEARD` in `sameness.ts`):

| dimension | threshold | the smallest audible difference, and where it is measured |
|---|---|---|
| pitch (a note's, a bend's, a voice's own) | **0.5 cent** | about 0.2–0.3 % (≈ 3–5 cents) for pure tones in the middle of hearing, nearer 2 cents for trained listeners and long tones (Wier, Jesteadt & Green 1977, *JASA* 61:178; Moore 2012, *An Introduction to the Psychology of Hearing*, ch. 6) |
| level, per channel (and so pan) | **0.1 dB** | about 0.5–1 dB for tones and noise (Jesteadt, Wier & Green 1977, *JASA* 61:169); an interaural level difference about 0.5–1 dB (Mills 1960, *JASA* 32:132) |
| where a note starts and ends | **0.25 ms** | onset asynchrony between partials of the order of 1–2 ms (Zera & Green 1993, *JASA* 93:1038); a gap in broadband noise about 2–3 ms (Fitzgibbons & Wightman 1982, *JASA* 72:761); a displaced beat in an isochronous run a few per cent of the interval, ≥ about 6 ms (Friberg & Sundberg 1995, *JASA* 98:2524); a duration's Weber fraction about 10 % (Abel 1972, *JASA* 51:1219), far looser than the end's onset |
| silence | **−100 dB** | an amplitude below it is none |

- **Numbers whose unit S1 doesn't know** must be alike within 0.25 ms absolutely, or the pitch threshold relatively. These are the numbers inside an event's levels, moving parameters and envelope, and inside a voice's sound (a cutoff in Hz, an envelope's seconds, a bend's cents). This is at least as strict as each dimension's threshold in its natural unit.
- **A polarity is heard:** an inverted voice cancels another, so `gain=-.5` is not `gain=.5`.

### 2. How events are compared

- **The exact pass first.** The old comparison runs first, and texts that play the same numbers are identical without more work.
- **Otherwise, by ear.** Each text's events are read as heard:
  - a voice is numbered by the class of voices alike to the ear across both texts (057, within the thresholds);
  - events alike in all but their channels are summed per channel, so one note in both channels is that note in each;
  - an event silent everywhere and sent nowhere is left out.
- **Matching.** The two lists are matched in time, each event taken once: the first unmatched one within the onset threshold that is alike in voice, end, pitch, bends, levels, parameters, envelope, MIDI sent and level per channel.
- **The window's end.** An onset within a threshold of where the listening stops is in neither list, since it falls in one text and past the end in the other.

S2 (`playsSameNotes`) reads voice, onset, length and pitch by the same thresholds.

### 3. A noise is heard by its colour, filters and level

A voice whose sound is a noise (`s=white`, `pink`, `brown`) has no pitch. Its frequency, its `loop=`, its braid, its glide, and its notes' frequencies and bends are not part of what S1 hears. Neither are its samples: the renderer starts each noise note at a grain keyed on the voice's name and time, and a different grain of the same noise sounds the same. So white noise at one level, through the same filters, is identical under S1, whatever it is named, wherever it starts in the noise, and whether one note sounds in both channels or one in each.

The last case is the owner's ruling, and it is a choice. A noise copied into two channels sounds centred, while two independent noises sound wide: listeners hear interaural decorrelation. S1 reads a noise by its spectrum and its level per channel, not by its correlation.

### 4. The snapshot stays exact

The event snapshot (`snapshot.txt`'s `notes` and `events`) keeps every number to 9 digits. It catches any change, heard or not, on purpose. It is now stricter than S1, not S1 over 40 s: a respelling that plays numbers 10⁻¹⁵ s apart can move an `events` hash and still be S1-identical. The PR that moves one says so.

## Consequences

- **What the tools newly accept, over the examples.** Normalise writes four examples' `&bar scan(1 1 1 1)` as the meter it is: `&bar from meter_4_4 &tempo` in *Pop*, *Alpha* and *One more*, and `meter("4/4")` in *Tape*, whose bar drives a tape. Their onsets differ by at most 7·10⁻¹⁴ s and their pitches by 6·10⁻⁹ cents, which the old S1 refused at a rounding edge.
  - Every `notes` hash stays.
  - *Alpha*'s and *One more*'s `events` hashes move, by that rounding.
  - The four `values` and `live` hashes move, since they read the text.
  - On the examples as they now stand, Shorten's suggestions, `shortenAll`'s steps and Normalise's steps are the same under the old and new S1.
- **#441's near miss** ("a number has to be written in full") no longer holds: compile may write a note name's frequency to a few digits.
- **The pieces' sound doesn't change.** S1 is a check, not a renderer.
