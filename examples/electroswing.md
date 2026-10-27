---
title: Electro swing, in pieces
tags: [genre:electronic, genre:dance, genre:jazz, harmony, rhythm, arrangement]
description: "A house kick under a walking bass, Charleston stabs and a gypsy clarinet, in D harmonic minor: the band is the seed library's, used, and the tune is one bar, moved and cut up."
---

Electro swing is a jazz record cut up over a house beat: four on the floor, the eighths swung, a walking bass, brass stabs on the Charleston and a clarinet in a minor key.
Here the band comes from the seed library, taken by name: the drummer and its kit, the key, an eight-bar vamp, the walking bass Jambot plays at Swing jazz, the bass, stab and lead players, and the beat and the stabs this piece gave the library (`Electro swing drums`, `Charleston stabs`).
The piece writes only what is its own: the meter, the key's tonic, the tune, the form, and the sound of each instrument.

```cells
use &drums from "drums performer"
use &key from "harmonic minor"
use &harm from "vamp to the fifth"
use &bassline from "walking bass"
use &kick, &clap, &hats, &ticks from "Electro swing drums"
use &stabline from "Charleston stabs"
use &bass, &bassV from "bass performer"
use &stab, &keysV from "stab performer"
use &leadOut, &leadV from "lead performer"
&useNote label="The band is the library's: each use names what it takes. &bassV, &keysV and &leadV are the players' instruments, named so the piece can give each a sound of its own; the drummer plays the core kit as it is." about=(&bassV &keysV &leadV)
```

The meter swings its eighths, a little less than triplets; the tempo and the swing are both sliders.
The key is harmonic minor, from the library, on the piece's tonic, D (`&tonic`): the vamp's fifth is then A major, four bars of D minor, four of A.

```cells
&bar meter("4/4") step=free(124bpm, 112..132) swing=8n:free(.64, .5..0.75)
&tonic D
&swingNote label="Every line taps the meter (step=4n, 8n, 16n), so every line swings: the open hats on the off-beats, the stabs, the clarinet." about=&bar
```

## The beat

`Electro swing drums`, used above: a kick on every beat, the clap on two and four, the open hat on every swung off-beat; a sixteenth hat with some strokes left to chance and a ghost of the snare on the last.
The piece takes its four limbs by name and hands them to the drummer as a stack, `&drumlines`, each times its level in the form below; the fragment's own `&groove` mix it leaves.
The crackle is the piece's own, a record's: a tick of noise on a few sixteenths, by chance.

```cells
&drumlines [&kick * &kickForm, &clap * &clapForm, &hats, &ticks]
&crackle step=16n 0?.8!16
&beatNote label="The beat is a fragment: &kick, &clap, &hats and &ticks come from Electro swing drums, their levels in their hits." about=(&kick &clap &hats &ticks)
```

## The stabs

`Charleston stabs`, used above, is the stab player's part: the Charleston, a chord on one and on the and of two, three bars, and a fourth that pushes: its last stab, on the and of four, comes early with the next chord, its third and fifth with its root on top.
The stab player reads the chords in force, `over=&harm`, so the same rhythm is D minor in one half of the vamp and A major in the other.

```cells
&charlestonNote label="The Charleston: one, and the and of two, a fragment's (Charleston stabs)." about=&stabline
```

## The tune: one bar, moved and cut up

The clarinet's call is one bar, A B♭ C♯ D, back down to A.
The verse is that bar and what operators make of it: two degrees down (`&call^-2`), its turn, three degrees down over the A chord (`&call^-3`: E F G A, A's phrygian dominant), and that backwards (`degree(&call[::-1], -3)`).
The break cuts it into pieces with picks: its first three notes (`&call[0:3]`) and rests, its tail moved, its first two as a stutter (`&call[0:2]!4`), its top note hammered (`&call[3]!4`).

```cells
&call over=&key step=8n 4 5 6 7@2 6 4@2
&turn over=&key step=8n 6 7 6 5 4@2 ~@2
&verse over=&key step=8n &call &call^-2 &call &turn &call^-3 degree(&call[::-1], -3) &call^-3 &turn
&chop over=&key step=8n &call[0:3] ~@5 &call[0:3] ~ &call[0:3] ~ &call[3:]^-2 ~@3 &call[0:2]!4
&chopA over=&key step=8n degree(&call[0:3], -3) ~@5 degree(&call[0:3], -3) ~ degree(&call[0:3], -3) ~ &turn &call[3]!4
&leadline step=8n &verse!2 &chop &chopA &verse
&callNote label="One bar: everything the clarinet plays is this bar, moved by degrees (^n), turned backwards ([::-1]) or cut ([0:3]): its call, its answer, its break." about=(&call &verse &chop &chopA)
```

A second clarinet doubles the last verse an octave up: a second player of the lead, `&lead2`, playing the same line moved twelve steps of the grid. Both play as the lead (`&lead map=role &leadOut &lead2`, decision 061), so the piece takes the lead player's gate, `&leadOut`, and writes the role itself.

```cells
&lead2 play=&leadline^$12 level=&lead2Level &leadV
&lead map=role &leadOut &lead2
```

## The form, in levels

The song is 32 bars, four times round the vamp: the stabs and the hats alone, then the kick and the bass, the verse, the break with the kick and the bass out, and the verse again, doubled.
It is written as each part's level, bar by bar, the clarinet's entry too (its line plays from the top, silent for the first eight bars), so every part keeps tapping the swung meter.
The players' levels are holes their fragments leave; here they are the form.
It is the form written six times over, and waits on #304: a selector over the performers, each step naming who plays, would write it once.

```cells
&bassLevel map=amp step=1m 0!4 .8!12 0!8 .8!8
&stabLevel map=amp step=1m .5!16 0!8 .6!8
&leadLevel map=amp step=1m 0!8 .5!24
&lead2Level map=amp step=1m 0!24 .25!8
&kickForm map=amp step=1m 0!4 1!12 0!8 1!8
&clapForm map=amp step=1m 0!8 1!8 .6!8 1!8
&formNote label="The form: intro (4 bars), the band (4), the verse (8), the break (8), the verse doubled (8)." about=(&bassLevel &stabLevel &leadLevel &kickForm &clapForm)
```

## The sound

The instruments the players play are voices with no sound of their own: the piece gives each one.
An upright-ish bass, a brass stab, a clarinet with a slow vibrato, and the crackle's noise.
In giving the bass its sound the piece gives it its register too, which is the instrument's (decision 058): the library's `bass` sits at C2 and the bass player plays it an octave down, at C1; this `&bassV` sits at C3, so the walk sounds at C2, an octave above the library's, where a laptop's speakers still carry it.

```cells
&bassV s=saw loop=C3 lpf=700 env=&(map=adsr .005 .3 .25 .08)
&keysV s=saw loop=C3 lpf=1800 env=&(map=adsr .01 .12 .25 .1)
&leadV s=square loop=C4 lpf=2400 env=&(map=adsr .02 .2 .7 .15) pitch=&(map=lin loop=5.5 0 .12 0 -.12 0)
&vinyl s=white hpf=2500 env=&(map=adsr 0 .004 0 .004)

&out map=sample postgain=1.11 [&drumsOut,
                         &crackle * &vinyl * .04, &bassOut, &stabOut * .4, &leadOut * .5, &lead2 * .5]
```
