# 019 · MIDI out in the language: a MIDI card, its entries channels

**Date:** 2026-10-10 · **Status:** accepted (owner, #208)

## Context

MIDI out began as an app setting (#205): every voice heard mirrored to one port, a voice per channel in the order the piece declares them, the channels changeable in the dialog and kept in this browser. A piece couldn't say where its notes go: which voice on which channel, a drum part on 10, a voice that only a synth should play. The text is the single source of truth, so where notes go belongs in it; what a device *is* (a port, its drum map) belongs to the browser, not the piece.

## Decision

- **`map=midi` makes a cell a MIDI card**, the sound card's sibling ("output is cells too", [mix.md](../language/mix.md)). Its entries are MIDI channels, in order: `&synth map=midi [&theme * &reed] [&bass * &sub] ~!7 &groove` sends the theme on 1, the bass on 2, nothing on 3 to 9, the groove on 10. A chord on one entry shares its channel; `~` skips one.
- **`map=midi(10)`** puts the whole card on one channel. **`map=midi(10, 2)`** is channel 10 on **output slot 2**: a number the MIDI dialog maps to a device, kept per piece in this browser. Without a slot a card goes to slot 1, the default output chosen in the dialog.
- **A voice on both cards sounds and is sent**, the same notes on both (one output, heard and sent: a net, a voice in several mixes, [nets.md](../notes/nets.md)). **A voice only on a MIDI card is sent, not heard.** The plan counts a MIDI card as reaching a card (`outputPlays`, realize.ts), so its notes aren't planned away; the voices leave such a note out (`Played.unheard`).
- **No `loop=`** on a MIDI card: it doesn't turn.
- **A melody alone as an entry is an error** naming the missing voice: a voice gives it its pitch. **A voice's sound parameters aren't sent**: a voice only on cards that has some says so once (a warning), and its sheet says so. No control changes, no program changes.
- **Kits** go as General MIDI drum notes by their members' names, mapped per device at the output, as the default output does.
- **A piece with a MIDI card sends only what its cards name.** The default output (every voice heard, a channel each) doesn't send those voices again, nor any other; the dialog's channel table shows the piece's channels as *set by the piece*, and channels can't be chosen there, nor rotated (MPE). A piece with no card keeps the default output exactly as before.
- **The dialog lists the slots the open piece uses**, each with a device (slot 1 is the output chosen above); a slot with no device says so and sends nothing.
- **One description of where sound goes** (#132): a MIDI card's entries are a flow kind, `midi` (`engine/flows.ts`), which the graph's routing reads beside the mixes; the audio wiring leaves it alone, and the MIDI sink reads each note's entries (`Played.midi`). **The graph** draws the card as a node at the top, like the sound card, and its wires as note buses (port `midi`: gate and pitch at once, a solid line broken by a gate's gaps), not sound.

## Why

- **A card over `midi=3` on a voice:** a voice's own attribute is a hidden route (no wire in the graph), and a second spelling once a card exists (#151: one spelling per meaning).
- **A card over `&lead … &>midi`, a send (#149):** a send fits later, as the way a voice joins a card's net without the card listing it; it doesn't replace the card.
- **A slot number over a device name in the code:** a device is the browser's; a piece moved to another machine, or shared, still plays, and the slots are remapped there.
- **Only what the cards name, once a piece has one:** mixing the two (cards for some voices, the default channel table for the rest) would send a voice twice or leave a reader guessing which rule a channel came from. A piece that names any channel names them all; one that names none needs no change.

## Consequences

- No saved piece changes: `map=midi` was an error before.
- A kit on a card off channel 10 (`map=midi(3) &groove`) is sent on that channel. MIDI in's keys and the on-screen pads still take channel 10 as the kit's (#207, #255).
- The slots a piece uses are per piece title in this browser, as the channel table is: a renamed piece starts with slot 1 alone mapped.
- CC out for moving parameters and a program change per entry are follow-ups (#203).
