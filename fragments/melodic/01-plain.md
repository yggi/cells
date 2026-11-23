---
id: plain
source: seed
---

```cells
&melo from &key style=(&synthPop | &techno | &deepHouse | &ambient | &lofi | &funk | &bossaNova | &swingJazz | &electroSwing | &spooky | &acid | &happyHardcore | &elektro | &darkAmbient | &baroque | &seaShanty | &chiptune | &salsa | &waltz | &march | &tripHop)
&melo over=&key even(7, 7)
```

The melodic scale that is the key's own: all seven of its degrees, `even(7, 7)` of them, so a line over `&melo` plays as a line over `&key` does, note for note, in any mode. It is the scale a lead walks where nothing narrower is asked for (#719), Jambot's `plain` (`MELODIC_SCALES`, yggi/jambot packages/engine/src/key.ts).

A melodic scale is a table over the key, a level of it as the triad is (`&triad over=&key[>>k] even(3, 7)`, decision 072, #508): the twelve, the key's seven in them, the melodic scale's in those. The pentatonic is five of the seven (`pentatonic`), the blues a necklace of its own on the key's tonic (`blues`).

At every style of `styles` but two, weight 1, as the facet `melodic`: Jambot's lead keeps the key's own scale at every style unless its players wish for another (`melodicDefault`, licence.ts there), so a query at any of its presets finds this one first, at distance 0. The two: Blues shuffle, where `blues` is found, and Kinderlied, where `pentatonic` is.

**Its signature** (decision 065): `&melo from &key`. `&melo from plain &key` takes a copy of it, `&key` its main argument.
