---
title: A song in sections
tags: [genre:electronic, arrangement, harmony, diatonic]
description: "A verse–chorus song the default band plays: its sections from a song form found by style, each section's intensity and who plays from its kind, and a tune a section."
---

A song in sections (#810): a score the default band plays, arranged by a song form from the seed library rather than by hand.
Its parts are one bar each, looping; what changes from section to section is how hard the band plays, who plays, and which tune the lead sings.

## The parts

Four chords, I – V – vi – IV in C, a bar each; a four-on-the-floor kick with a backbeat and eighth hats; a bass on the roots with a push into the next bar; a pad holding each chord and stabs on the off-beats.

```cells
&bar from meter &tempo
&tempo step=112bpm
&key from "diatonic(mode=ionian)" C
&harm over=&key step=1m [0,2,4] [4,6,8] [5,7,9] [3,5,7]
&kick role=kick step=4n &bd &bd &bd &bd
&backbeat role=backbeat step=4n ~ &sd ~ &sd
&hat role=hat step=8n &hh!8
&drumlines [&kick, &backbeat, &hat]
&bassline over=&harm step=8n 0 ~ 0 ~ 0 2 ~ 4
&padline over=&harm step=1m [0,1,2]
&stabline over=&harm step=4n ~ [0,1,2] ~ [0,1,2]
```

## Three tunes, a section each

The lead has three tunes, each two bars long and looping while it is on: the verse's, the chorus's, which climbs to the octave, and the bridge's, which falls.
Each is stepped by a section of its own (`&verseBar`, `&chorusBar`, `&bridgeBar`, decision 016), and `&sings` says which tune each section of the song sings: none in the intro and the outro, where the lead rests anyway.
How a kind plays (its tune here) is the composer's, so it is written in the score, not in the section kinds.

```cells
&tunes step=4n &verseBar &chorusBar &bridgeBar
&verseTune over=&key step=&verseBar*2 0 1 2 ~ 2 1 0 ~ 4 ~ 2 ~ 1 ~ ~ ~
&chorusTune over=&key step=&chorusBar*2 4 4 5 4 ~ 2 4 ~ 7 ~ 5 4 2 ~ ~ ~
&bridgeTune over=&key step=&bridgeBar*2 5 ~ 4 ~ 3 ~ 2 ~ 1 ~ 2 ~ 4@4
&leadline [&verseTune, &chorusTune, &bridgeTune]
&sings over=&tunes step=1m/8 ~ 0 1 0 1 2 1 ~
```

## The song form

`verse_chorus` is the song form Synth-pop's style finds (`npm run coverage -- --facet song`): an intro, verse, chorus, verse, chorus, a bridge, the chorus again and an outro, eight bars each, 64 bars, then round again.
It gives two lines a section a step, each section a kind taken by name (`fragments/sections/`):
- `&verseChorus`, the song's intensity, `&song` at .55, plus each kind's offset (decision 096): an intro .25, a verse .45, a chorus .7, a bridge .45, an outro falling from .55 to .1;
- `&verseChorusPlays`, who plays: everyone in a chorus and the bridge, no stab in a verse, no lead in the intro and the outro.

The score splices them (decision 097) into its `&intensity`, which the band's drums, bass and stabs play at, and into its selector over the band, `&form`.

```cells
&song .55
&verseChorus, &verseChorusPlays from verse_chorus &song
&intensity step=1m/8 &verseChorus
&form over=&band step=1m/8 &verseChorusPlays
&style style=&(map=style sync=.3 harm=.45 bite=.55 mood=.5)
```

## The band

The score ends in `* from band(…)`, passing its parts, its style and its intensity (decision 063, `bandLine`): who plays them, on what, and where they go out is the band's.

```cells
* from band(drumlines=&drumlines, bassline=&bassline, padline=&padline, stabline=&stabline, leadline=&leadline, style=&style, intensity=&intensity)
```

So the chorus comes back as it was each time, louder than the verse with the stabs in; the bridge drops back to a verse's level with everyone playing; and the outro thins and fades into the intro of the next time round.
