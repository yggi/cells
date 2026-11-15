# 096 · A section's intensity is `&intensity`: the song's plus its kind's offset, a sum the band's levels read; the arrangement stays the score's

**Date:** 2026-11-15 · **Status:** proposed, rung 1 built with it (the owner on yggi/jambot#547, 2026-11-15: "go ahead with rung 5, as suggested", the proposal on #571 after E46: intensity an offset on one scalar that the band's levels read, the arrangement written apart) · Issues: #571 (step 2), #536 (the style epic), yggi/jambot#645 (its Jambot half), yggi/jambot#547 rung 5

*Settles what [076](076-the-style-axes.md) §3 left to #571 (how intensity is written, at which scales, and what it drives). Read with [079](079-a-sum-of-cells-and-a-window.md) (a mix of cells with no voice is the sum of their values), [063](063-the-score-and-the-band.md) §3 (the section's style, the note `&style`), [061](061-the-band.md) (who plays when, a selector over the band) and [088](088-naming-a-number-plays-as-the-number.md) (a cell that is one number).*

## Context

Decision 076 took energy off the style point: intensity is how hard a style is played at a moment, an offset relative to the style's. A break is a section with lower intensity than its style's. It left the spelling to #571.

**What a section's kind moves, measured** (E46, yggi/jambot#689: the band at the prototype's eight presets, entropy 0.3, seeds 1 to 3, 64 bars, 1,536 bars):

| component | the kind explains (η²) | past the bar's energy | r with the energy |
|---|---|---|---|
| density | 0.558 | 0.037 | 0.909 |
| layers | 0.532 | 0.132 | 0.651 |
| velocity | 0.678 | 0.164 | 0.804 |
| register | 0.293 | 0.126 | 0.469 |
| the lead's filter | 0.396 | 0.000 | 1.000 |
| sync | 0.307 | 0.066 | 0.602 |
| bite | 0.244 | 0.193 | 0.708 |

- The energy carries the density and the lead's filter.
- The kind moves the layers, the velocity, the register and the bite past the energy: who rests in a breakdown (2.3 parts against 4.1 in a groove), its dynamics (velocity 53 against 72), its held notes (bite 0.04 against 0.36).
- Adjacent sections are furthest apart into a breakdown (0.638) and nearest between kinds that differ in energy alone (a build 0.099, a bridge 0.107, a drop 0.136).

So a section is at least two things: an intensity on one scale, and an arrangement its kind says on its own.

**What Jambot plays from the energy** (yggi/jambot `packages/engine/src/form.ts` and `dynamics.ts` @ 602cb26):
- a bar's energy is the style's plus its kind's offset, held to 0 to 1: intro −0.3, groove 0, bridge −0.1, drop +0.3, breakdown −0.45, and a build ramping from −0.15 to +0.3 over its 8 bars (`barEnergy`);
- each part's velocity is a base times a line in the energy: the drums' role accent × (0.65 + 0.35 e), the bass's × (0.75 + 0.25 e), the stab's 70 + 20 e, the pad's 48 + 30 e, scaled by its bite (`baseVelocityOf`);
- the composer thins each part's notes by it (the drums `smooth((e − .05) / .5)`, the bass `.55 + .6e`, the lead `.25 + .5e`), and the lead's cutoff opens with it.

**What cells can say of it today** (cells @ 7a98085, probed under vitest):
- a sum of lines with no voice (079) is an offset: `&intensity [&song + -.45]` with `&song step=1m .7` reads 0.25; a gain of −1 does too, `[&song + &breakdown * -1]` with `&breakdown step=1m .45`;
- a build's ramp is a term moved by a line: `[&song + -.15 + &rise * .45]` with `&rise step=1m 0 .25 .5 .75 1` reads 0.35, 0.4625, 0.575, 0.6875, 0.8 at a song of 0.5, Jambot's ramp;
- a part's level read through it is a sum too: `&drumsDrive [&intensity * .35 + .65]`, a factor of the gate's level, reads 0.7375 at an intensity of 0.25 (0.65 + 0.35 × 0.25);
- **what it can't say:**
  - a cell that is one number (088) is refused as a term of a sum: `&song .7` then `[&song + -.45]` gives "A number is a gain or a pitch: it needs a voice";
  - a sum is held to 0 to 1 at its own cell (079), a term of another sum too: `&build [-.15 + &rise * .45]` then `[&song + &build]` reads 0.5 at the build's first bar, not 0.35;
  - a line whose values run below 0 is bipolar (decision 067 §5): `&breakdown step=1m -.45` reads as 0.275 in a sum, a wave's share;
  - MIDI out sends a level's square root as its velocity (`velocityOf`, the square law): a factor of the level scales the velocity by its root, so Jambot's factors, on the velocity, are read twice.

## Decision

1. **Intensity is a cell, `&intensity`,** an interface name beside `&style` (063 §3): a value from 0 (as soft as the style plays) to 1 (as hard), at each moment.
   - It is never on the style point (076 §3), and no query reads it.
   - The score writes it; the band reads it.
2. **A section's intensity is its song's plus its kind's offset, a sum (079):**

   ```text
   &song step=1m .55
   &intensity [&song + -.45]                         # a breakdown
   &intensity [&song + -.15 + &rise * .45]           # a build, its ramp a line over its bars
   ```

   - Each term is a scale: the song's, the section's, and any below it (a phrase's, a bar's fill), added.
   - **A kind's offset is a number:** a constant in the sum, or a cell that is one number (088), `&breakdown -.45`, which the sum reads as the number it names. A ramp is a line by its weight (`&rise * .45`).
   - **A cell that is one number is a term** (this decision's one rule): `[&song + &breakdown]` with `&song .55` and `&breakdown -.45` is a sum of values, a constant. Before, a sum whose cells were all numbers was refused.
   - The sum is held to 0 to 1 at its own cell, as 079 holds it. So an offset is never a sum of its own, which would be held at 0 before it is added, and never a line below 0, which is a wave.
   - The song's intensity is the conductor's number (Jambot's preset energy, the radio's walk). A style fragment says none, until a reader measures intensity (#541).
3. **The band's levels read it: a performer's drive is a sum of `&intensity`,** a factor on the velocity's scale, in the band's own lines:

   ```text
   &drumsDrive [&intensity * .35 + .65]
   &bassDrive [&intensity * .25 + .75]
   &stabDrive [&intensity * .2222 + .7778]
   ```

   - The band takes `&intensity` as an optional parameter, its own 1: a score that writes none plays its levels as written, every drive 1.
   - A performer takes its drive as an optional parameter, its own 1, and its gate reads it twice (`level=&bassLevel*&bassDrive*&bassDrive`), since a level's square root is the velocity sent.
   - The weights are Jambot's dynamics, lifted: the drums' and the bass's lines in the energy, the stab's 70 + 20 e over 90. The pad's velocity reads the bite beside the energy and the lead's reads no energy, so neither is driven.
   - The score's levels say what the kind says past the intensity: a breakdown's quiet drums, a part's accents.
4. **The density and the arrangement stay the score's.**
   - The notes are the composer's: it reads `&intensity` where it writes them, and thins them as Jambot's composer does today. The band writes no note, so it can't thin one.
   - Who plays when is the score's selector over the band, `&form over=&band` (061, `fragments/bands/01-band.md`: "who plays when is the score's"): a breakdown rests the parts it rests.
   - How a kind plays (a breakdown's hats alone, its held roots) is the notes and levels the score writes.
   - No new form: a section's kind is a fragment of #571 step 3 that holds its offset and its arrangement, found by style.

**Why not** intensity as a slot of `map=style` (`&style[intensity]`): it would travel with every mix and glide of styles, and every query would have to skip it. 076 §3 keeps it off the point because it moves within a piece and the point doesn't.
**Why not** a word of its own for an offset (`map=offset intensity=-.45`, #571's sketch): 079's sum already means a weighted sum, and an offset is a term in it.
**Why not** the band thinning the density: thinning chooses notes, which is composing, and the band plays what the score writes. E46's density follows the energy (r 0.91) because Jambot's composer reads it, and it reads `&intensity` the same way.
**Why not** one scalar for everything: the kind moves the layers, the velocity, the register and the bite past the energy (E46). A single number can't say a breakdown's arrangement.
**Why not** signed lines as offsets (`&breakdown step=1m -.45`): a line below 0 is a bipolar wave (067 §5), and reading it otherwise in a sum would change every wave summed there.
**Why not** a sum held only where it is read, so an offset could be a sum of its own (`&build [-.15 + &rise * .45]`): then `&intensity` itself, a term of each drive's sum, would go unheld into the drives, and a breakdown at a quiet song would drive a level below Jambot's. Holding a sum at its own cell, as 079 does, keeps `&intensity` within 0 to 1 wherever it is read.
**Why not** a drive read once, a factor of the level: a level's square root is the velocity, so it would scale the velocity by the drive's root (the drums at an intensity of 0.25 sent at 109, not 94). Read twice it scales the velocity by the drive, as Jambot's dynamics do.

## Consequences

- **cells, rung 1** (with this decision):
  - (2)'s rule: a cell that is one number is a term of a sum (`valuesum.ts`), and a product of numbers in it a constant;
  - the band takes `&intensity`, and drives the drums, the bass and the stab (3); those three performers take a drive (`&drumsDrive`, `&bassDrive`, `&stabDrive`, each 1 by default). Their four fragments' hashes move.
  - Nothing a piece plays moves: no piece writes `&intensity`, and the band's own is 1 (`band.test.ts`: at an intensity of 0.25 the drums send 94 where they sent 127, the bass 92 where 114, the stab 95 where 114, each within 1 of Jambot's factor).
  - Bound: a Jambot section written with its energy as `&intensity` and its levels without the energy's factor plays its MIDI within 2 velocity steps of today's, at the eight presets, seeds 1 and 2, 32 bars (`band.slow.test.ts`; yggi/jambot#645's bound).
- **cells, rung 2 (#571 step 3):** the section kinds as fragments of a facet (`sections`), each its offset and its arrangement, placed by idiom; Jambot's section chain is the generator on a miss.
- **Jambot (yggi/jambot#645), at the pin that brings rung 1:**
  - its section text writes `&song` and `&intensity` (`barEnergy` as the sum);
  - its levels drop the energy's factor, so they shrink where only the energy moved them (#645's bytes at Funk's section from bar 9, seed 1);
  - its composer reads the same number it writes.
- **The lead's cutoff** opens with the energy in Jambot (E46: r 1). Whether cells' lead reads `&intensity` beside `&style[bite]` (076's consequences) is measured at rung 1, not decided here.
- **Open:** whether a style fragment carries a typical intensity (as its `step=` carries a tempo) waits on a reader of intensity (#541).
