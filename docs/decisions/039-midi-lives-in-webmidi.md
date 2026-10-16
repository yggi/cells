# 039 · Live MIDI lives in yggi/webmidi; cells keeps MIDI files and when a piece's clock ticks

**Date:** 2026-10-16 · **Status:** accepted (owner, on [#63](https://github.com/yggi/cells/issues/63): "split it: (web) midi in a separate repo, with html that can be shared between cell-studio and jambot, later also with ep-133. cells only cares about its own aspects: parsing/writing midi"; then "yggi/webmidi … svelte-components, public, ko-multitool moves later") · Issues: #63, yggi/jambot#309

## Context

[Decision 037](037-the-handshake-with-jambot.md) (D2) gave MIDI in and out, its clock, the keys and pads one shared copy, merged from Jambot's and Cell studio's (Cell studio lifted Jambot's at 8cdb6b8), and left where it lives until the merge.
#63's inventory found Cell studio's copy ahead in every shared part, and a third Web MIDI layer in KO-Multitool, which has nothing to do with the language.
A layer that talks to the browser can't live in cells' `src/` without changing its purity (`host.d.ts`), and one KO-Multitool uses can't depend on the language.

## Decision

- **yggi/webmidi** (public) holds the family's live MIDI, in three layers, each a subpath export:
  - `core`, pure: messages in and out, the computer-key and drum-key maps, the drum maps, port adoption, the clock offset, clock out on the wire (24 ppq, Start/Stop/Continue, Song Position Pointer), note out (timestamps, MPE, panic);
  - `web`: the Web MIDI adapter (access, permission, SysEx, replug), implementing ep133-sysex's `Transport`;
  - `ui`: shared Svelte 5 components, as source.
- **cells keeps its own MIDI aspects:** MIDI files (`midifile`, `midiimport`, `midiexport`, the folder), and *when* a piece's clock ticks (`mainMeter`, `ticksBetween`); what plays, as events.
- **Neither depends on the other.** webmidi takes a plain note; each frontend adapts its own events in a few lines. The few bytes both encode (a note, a pitch bend) are written twice and held equal by the hub's `midi-rx` contract.
- Frontends pin webmidi at a tag, as they pin cells. Cell studio and Jambot move first; KO-Multitool later.

## Consequences

- 037's row "MIDI in and out, its clock, the keys and pads" is settled: webmidi.
- #63's steps move to webmidi's own issues; nothing in cells' `src/` changes for it.
- Each frontend pins two family packages, and each webmidi release is a tag the owner creates.
