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
&bassV s=saw loop=C2 lpf=450..900 * &style[artic] lpq=4 env=&(map=adsr .005 .2 .7 .05)
&leadV s=square loop=C4 lpf=1400..3600 * &style[energy] env=&(map=adsr .023 0 1 .08)
&sound map=sample [&drumsOut, &bassOut * .8, &padOut * .35, &stabOut * .4, &leadOut * .45]
&midi map=midi &leadOut &bassOut [&padOut, &stabOut] ~!6 &drumsOut
```

The default band (decision 063 §1, #391): who plays a score, on what, and where it goes out. A score ends in `* from band`, the same line on every client, and each client's resolver answers `band` with its own; this is the one cells' library holds.

**Its head, `&band`,** is decision 061's table of performers: the five role cells, `&drums`, `&bass`, `&pad`, `&stab` and `&lead`, so a score's selector over the band (`&form over=&band step=1m …`) reads the client's players. Who plays when is the score's; who they are, the band's.

**The performers** are the seed library's five (decisions 058 and 061), each a copy taken by its signature (decision 065): its role and its gate, `&bass, &bassOut from "bass performer"(bassLevel=&bassLevel) &bassline`. The part each plays is the score's, by its interface name (`&drumlines`, `&bassline`, `&padline`, `&stabline`, `&leadline`), and so are its levels (`&bassLevel` …). A level the score doesn't write is the band's own, one level of .8, the performers' default; the score's line wins over it, as a piece's line wins over what it takes (decision 054 §2). A part the score doesn't write rests, and cells says so (decision 063 §4); a conductor that rests a role writes it as a tacet (`&padline step=1m ~`), and nothing is said.

**The instruments** are the performers' own (`bass`, `keys`, `pad`, `lead`, and 13 of `gm_kit`'s voices), each with a sound, at the centre of style space. Two of them read the score's style, `&style` (decision 063 §3), where Jambot's `timbreOf` reads it (yggi/jambot `packages/engine/src/sound.ts` @ 227aa74), as lines of the band, which win over the instrument it takes:
- the bass's cutoff opens with articulation, from 450 Hz at legato to 900 Hz at staccato (`lpf=450..900 * &style[artic]`);
- the lead's opens with energy, from 1400 Hz to 3600 Hz (`lpf=1400..3600 * &style[energy]`).

Jambot's other two readings don't move a cells voice: the lead's blend of a triangle and a square, and the chords' attack and release, are an envelope's times and a wave, written as numbers. The chords keep the centre's envelope at every style, and the lead its square.

**Which instrument a performer plays at a style** is the band's choice, made by a query at resolution, not by a line: `resolveBand(score)` answers `band` with this text, each pitched voice replaced by the first instrument the library ranks at the score's style that defines it, where that isn't the performer's own (`bandAt`, `src/repository/band.ts`; yggi/jambot#527's rule, moved here). At each of Jambot's eight presets that is the performer's own instrument, so the band plays as written; at Electro swing's point the upright bass, the brass stab and the clarinet, at Spooky's the round bass, the organ, the celesta and the theremin (#366). Each holds its default's register, so MIDI out sends the same notes. A line can't make that choice: a voice reads a style as a moving parameter, and a wave or a set of envelopes is no such parameter.

**The cards:** a sound card that hears every gate, the drums at full, the bass at .8, the lead at .45 and the chords under it (the pad at .35, the stab at .4), as Jambot's synth balances its parts (`PEAK`, yggi/jambot `apps/web/src/audio/voices.ts` @ 227aa74, its chords' several notes each quieter), and a MIDI card on Jambot's channels: 1 the lead, 2 the bass, 3 the pad and the stab, 10 the drums. A person with a fifth synth gives the stab its own channel in their band.

A score played on this band sends the MIDI Jambot's section text sends on its single card (channel, note, velocity, onset and end): its twenty sections at the ten presets, seeds 1 and 2, 0 mismatched (`band.slow.test.ts`).

Associated once as the facet `band` at the centre of style space, at weight 1: it plays every style, reading the style it is given.
