---
id: band
association:
  - point:
      sync: 0.5
      harm: 0.5
      artic: 0.5
      energy: 0.5
    weight: 1
    facet: band
source: seed
---

```cells
&band &drums &bass &pad &stab &lead
&drums, &drumsOut from "drums performer" &drumlines
&bass, &bassOut from "bass performer"(bassLevel=&bassLevel) &bassline
&pad, &padOut from "pad performer"(padLevel=&padLevel) &padline
&stab, &stabOut from "stab performer"(stabLevel=&stabLevel) &stabline
&lead, &leadOut from "lead performer"(leadLevel=&leadLevel) &leadline
&bassLevel map=amp .8
&padLevel map=amp .8
&stabLevel map=amp .8
&leadLevel map=amp .8
&sound map=sample [&drumsOut, &bassOut * .8, &padOut * .35, &stabOut * .4, &leadOut * .45]
&midi map=midi &leadOut &bassOut [&padOut, &stabOut] ~!6 &drumsOut
```

The default band (decision 063 §1, #391): who plays a score, on what, and where it goes out. A score ends in `* from band`, the same line on every client, and each client's resolver answers `band` with its own; this is the one cells' library holds.

**Its head, `&band`,** is decision 061's table of performers: the five role cells, `&drums`, `&bass`, `&pad`, `&stab` and `&lead`, so a score's selector over the band (`&form over=&band step=1m …`) reads the client's players. Who plays when is the score's; who they are, the band's.

**The performers** are the seed library's five (decisions 058 and 061), each a copy taken by its signature (decision 065): its role and its gate, `&bass, &bassOut from "bass performer"(bassLevel=&bassLevel) &bassline`. The part each plays is the score's, by its interface name (`&drumlines`, `&bassline`, `&padline`, `&stabline`, `&leadline`), and so are its levels (`&bassLevel` …). A level the score doesn't write is the band's own, one level of .8, the performers' default; the score's line wins over it, as a piece's line wins over what it takes (decision 054 §2). A part the score doesn't write rests, and cells says so (decision 063 §4); a conductor that rests a role writes it as a tacet (`&padline step=1m ~`), and nothing is said.

**The instruments** are the performers' own (`bass`, `keys`, `pad`, `lead`, and 13 of `gm_kit`'s voices), each with a sound. The bass and the lead read the score's style, `&style` (decision 063 §3), where Jambot's `timbreOf` reads it (yggi/jambot `packages/engine/src/sound.ts` @ 227aa74): the bass's cutoff opens with articulation, the lead's with energy. The band defines no `&style`: the section's style is the composer's, and the score writes it. The lead's blend of a triangle and a square, and the chords' attack and release, don't move with the style yet (#411).

**Which instrument a performer plays at a style** is the band's choice, made by a query at resolution, not by a line: `resolveBand(score)` answers `band` with this text, each pitched voice the first instrument the library ranks at the score's style that defines it, where that isn't the performer's own (`bandAt`, `src/repository/band.ts`; yggi/jambot#527's rule, moved here). At each of Jambot's eight presets that is the performer's own instrument, so the band plays as written; at Electro swing's point the upright bass, the brass stab and the clarinet, at Spooky's the round bass, the organ, the celesta and the theremin (#366). Each holds its default's register, so MIDI out sends the same notes. Each is voiced for its own point and reads no `&style`: where one plays, the style moves no cutoff of that voice, as it does the default bass's and lead's. The instruments are found at the score's style where it starts, so a section that glides into or out of Electro swing plays the instruments of its first end throughout. A line can't make that choice: a voice reads a style as a moving parameter, and a wave or a set of envelopes is no such parameter.

**The cards:** a sound card that hears every gate, the drums at full, the bass at .8, the lead at .45 and the chords under it (the pad at .35, the stab at .4), as Jambot's synth balances its parts (`PEAK`, yggi/jambot `apps/web/src/audio/voices.ts` @ 227aa74, its chords' several notes each quieter), and a MIDI card on Jambot's channels: 1 the lead, 2 the bass, 3 the pad and the stab, 10 the drums. A person with a fifth synth gives the stab its own channel in their band.

A score played on this band sends the MIDI Jambot's section text sends on its single card (channel, note, velocity, onset and end): its twenty sections at the ten presets, seeds 1 and 2, 0 mismatched (`band.slow.test.ts`).

Associated once as the facet `band` at the centre of style space, at weight 1: it plays every style, reading the style it is given.
