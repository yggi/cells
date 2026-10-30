# 064 · What sounds: heard on any card, the built-in card when none is written, an out a sound wired into a card

**Date:** 2026-10-30 · **Status:** accepted (owner: on #333, 2026-10-27, "019 is a mistake"; on #380, 2026-10-30, "go ahead as suggested", with the two rulings below) · Issues: #380, #333, #379, yggi/cell-studio#523 · The deep-dive: [notes/380-what-sounds.md](../notes/380-what-sounds.md)

*Amends [019](019-midi-card.md) ("a voice only on a MIDI card is sent, not heard") and the wording of [028](028-the-smallest-piece.md) point 2 ("no sound card").*

## Context

"Is this heard?" had four answers in six places: the built-in card (028), realize's `unheard` (019), the routing a frontend lights, the renderer (062), and Cell studio's voices (its decision 039, which hears a note on a MIDI card alone) and tower (which drew only a sound card's sounds). A voice on a MIDI card alone was heard in Cell studio, lit by the routing, silent in a render, and drawn with no out. "What is one out?" had four units: a card's entry (the renderer's stems), a channel, an edge into the sound card (Cell studio's sockets), a part (Jambot). And three cells could be a drummer's kit, so the graph and the routing disagreed and a playing kit was drawn as silent (#379).

## Decision

1. **A note is heard on any card that is on**: a sound card at its gains there, or a MIDI card at its entry's gain on the card (the numbers its velocity reads), in the middle, the loudest of several. `unheard` means heard nowhere: every card it reaches is off, or holds it at 0. A MIDI card is heard and sent; 019's "sent, not heard" is struck. (Realize's `heardGains`; Cell studio's `heardHere` reads the same rule, and goes when its pin carries this.)
2. **The built-in card is the card a piece gets when it writes none.** Any written card, of either kind, replaces it: a piece that writes a card has said where its sounds go. That was the code; 028 said "no sound card", and now says "no card". (The owner: "avoid an extra case for no reason".)
3. **An out is a sound wired into a card**, on either card: a voice, a gate's voices each its own (decision 058's performer plays, the voice sounds: "a performer with two instruments has two voices"), a kit (its drums are pieces of it), a mix, a tape's read head; one per card it reaches. It is what a frontend draws as a socket and a spire. A card's *entry* stays the unit of a render's stems by entry (062), not of what is drawn.
4. **Cells gives the outs** (`outs(result)`, `engine/outs.ts`): each with its edge and source, its card and the card's kind (`sample` or `midi`), a MIDI card's channel, a two-channel card's side, the built-in card's included (`writtenGraph(result, { card: true })` holds its node). What a cell does with sound is `soundRole(result, cell)`, from the sort each cell now carries (`ResolvedCell.sort`). A frontend derives none of it (Cell studio's `withCard` re-read the built-in card's mix, its `soundRole` the flags).
5. **A table that names sounds is routed while what it names is**: a kit, a role cell (061), a band. The graph draws a gate's voices as the voices it plays, one kit (#379).

## Why

- One rule for "heard", the one the owner chose on #333, read where every reader reads it: realize. The renderer, the routing and the frontends then agree without a case each.
- The built-in card replaced by any card is the shape the code had; making it "any sound card" would add a case (a piece with a MIDI card and a stray voice) for nothing a piece asks for.
- An out per voice draws what sounds: a performer is a gate, and its voices are its instruments. A card's entry can hold a performer with two instruments, or one voice can be in several entries; neither is a sound of its own.

## Consequences

- `midi-out`'s `&sub` is heard (its events' hash moves; its notes' doesn't). No other example moves: no other one has a voice on a MIDI card alone.
- A render (`pieceAudio`) of a piece whose card is MIDI alone, as every Jambot section text is, sounds.
- The warning on a voice only on a MIDI card now says its sound is heard here but isn't sent.
- Cell studio: decision 039's override becomes a no-op and goes at the pin that carries this; its tower draws a socket for each out, MIDI cards' too (yggi/cell-studio#523).
