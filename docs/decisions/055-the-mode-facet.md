# 055 · A mode is a fragment of a facet of its own, `mode`: `&key scale(dorian, free(C))`, the mode stated and the tonic left to the host; a fragment may be of two facets, each at a place of its own

**Date:** 2026-10-21 · **Status:** accepted (owner, 2026-10-21, on #228: "fragments with facet 'mode'"; the bell and scale, ionian and the African bell, the first fragment of two facets) · Issues: #228, yggi/jambot#420, #221, #211, #138

## Context

Jambot's presets are to become points in style space and nothing else (yggi/jambot#420); its rung 4 takes the mode out of the preset, ruled 2026-10-21: the mode comes from a fragment.
No fragment states one.
The harmony vamps (#221) are written over the host's key (`over=key`), so one text is every mode's vamp of the same degrees, and the bass lines (#211) read the vamp (`over=&harm`); Jambot's `PRESETS` name each preset's mode by hand (yggi/jambot packages/engine/src/style.ts @ bf96210): aeolian at Synth-pop, Techno and Lo-fi hip hop, dorian at Deep house and Funk, ionian at Ambient, Bossa nova and Swing jazz.
Its composer has a fourth mode, mixolydian (`COMPOSER_MODES`, key.ts there), which no preset plays.

#228 offered two shapes: a new facet whose fragments state a mode, at the presets' points as the meters are; or harmony fragments that name their mode.

## Decision

- **A new facet, `mode`.** A mode fragment is one line that defines `key`, decision 047's interface name, as a scale by name: `&key scale(dorian, free(C))`.
  It uses nothing, so it fits any workbench with no key yet, as a meter fragment fits one with no meter; the harmonies read it (`over=key`, the main key: the first `scale(…)` in the text), and the bass lines read the harmonies.
- **The tonic is left to the host, as `free(…)`**: a number left to the performer, which Jambot's key plan sets as it moves (the key plan is its licence, not a fragment's); C is `scale(…)`'s own default.
  A meter fragment leaves its tempo the same way, by not writing it; a tonic left out is C, a value, so the mode fragment writes it free.
- **Four modes, at the presets' points as the meters are** (`fragments/modes/`): aeolian, dorian and ionian each at the point of every preset that plays it, weight 1, so a query for the mode at a preset finds that preset's mode first, at distance 0; mixolydian, which no preset plays, halfway between Funk's point (dorian) and Bossa nova's (ionian), as the son clave 3-2 sits.
- **A fragment may be of two facets, each at a place of its own** (decision 046's hint, its first use): **the bell and scale**, from the example `bell and scale`.
  The West African standard bell, x.x.xx.x.x.x, has the major scale's intervals, 2 2 1 2 2 2 1, so one cell is both: `&key scale(ionian, free(C)) step=1m*7` is the main key and, stepped, the bell's timeline, which `&bell step=&key:pulse` strikes on the General MIDI kit's high agogô.
  As a mode it sits where the major is played (the centroid of the three ionian presets); as a rhythm, where a timeline is (sync 0.8, harm 0.1, artic 0.9, energy 0.6); neither is a preset's point.
  It is the owner's own example in 046: "the bell is a world-music associated rhythm-facet and a western music associated harmony / scale-facet".

## Why

- **A facet, not harmonies that name their mode**: the vamps are one text for every mode that has their degrees (five texts for twelve vamps); naming the mode in each would make twelve, and a bass line or a melody over a key with no vamp would still have no mode to find. The mode is asked once, at a section's start, as the meter is; the harmony, the bass and the lines are then read through it.
- **`key`, an interface name already**: the harmonies hold `key` as a hole today, so a mode fragment fills it with no new name, and the fit needs nothing new.
- **`free(C)`**: the tonic is a performer's value and the mode a fragment's choice; `free` says which part is left open, in the text.
- **A stepped key that nothing plays doesn't turn** (#203), so the bell and scale's lines over `key` read the major scale note for note as the plain ionian does; a test witnesses it over every vamp and bass line.

**Why not** a `mode` interface name beside `key` (`&mode scan(…)` with `&key` the host's tonic over it): it splits what `scale(…)` writes as one, adds a name every key-reading fragment would have to learn, and no form reads it today.

## Consequences

- `MODE_FRAGMENTS` (`@yggi/cells/repository/modes`, and in `index.ts`); `LIBRARY` is forty-three. A query for the meter, the bass, the harmony or the instrument returns what it did; a query for the rhythm finds the bell and scale among the rhythms, never first at a preset.
- Jambot asks for the mode at a section's start, as it asks for the meter, and sets its tonic (yggi/jambot#420, rung 4).
- No example's or fragment's notes change; nothing in the language changes.
