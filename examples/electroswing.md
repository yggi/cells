---
title: Electro swing, in pieces
tags: [genre:electronic, genre:dance, genre:jazz, harmony, rhythm, arrangement]
description: "A house kick under a walking bass, Charleston stabs, and a clarinet and a muted trumpet trading a call and its answer in D harmonic minor: the band, the tune and its form are the seed library's."
---

Electro swing is a jazz record cut up over a house beat: four on the floor, the eighths swung, a walking bass, brass stabs on the Charleston and a clarinet in a minor key.
Here the band comes from the seed library, taken by name, and so does the tune: the drummer and its kit, the key, an eight-bar vamp, the walking bass Jambot plays at Swing jazz, the bass, stab and lead players, and the beat and the stabs this piece gave the library (`Electro swing drums`, `Charleston stabs`); the tune is the motif `gypsy`, its call, shaped by two forms, `call and answer` and `AABA`.
The piece writes only what is its own: the tempo and the swing, the key's tonic, the break, who plays when, and the sound of each instrument.

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

The meter is the library's too, `4/4 swung on 8n`, Jambot's Swing jazz meter, which leaves its tempo to the piece (`&tempo`) and swings its eighths by a cell of its own, `&swing`, triplets (2/3).
The piece names that cell in its use and writes its own: the eighths a little less than triplets, .64. The tempo and the swing are both sliders.
The key is harmonic minor, from the library, on the piece's tonic, D (`&tonic`): the vamp's fifth is then A major, four bars of D minor, four of A.

```cells
use &bar, &swing from "4/4 swung on 8n"
&tempo step=free(124bpm, 112..132)
&swing swing=8n:free(.64, .5..0.75)
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

## The tune: one bar, a call and its answer, in AABA

The tune is one bar from the library, the motif `gypsy`: A B♭ C♯ D and back to A, the clarinet's call.
Two forms from the library make a chorus of it.
- **`call and answer`** makes the A: the call, then its answer, the call two degrees down (`&call^-2`), F G A B♭ and back to F.
- **`AABA`** makes the chorus of four As, the bridge before the last. Its bridge, by default A a fourth up, is named in its use and moved to where the harmony goes: three degrees down (`&a^-3`), over the vamp's A chord, E F G A, A's phrygian dominant.

The break cuts the motif into pieces with picks: its first three notes (`&gypsy[0:3]`) and rests, its tail moved, its first two as a stutter (`&gypsy[0:2]!4`), its top note hammered (`&gypsy[3]!4`).

```cells
use &gypsy
use &phrase from "call and answer"
use &chorus, &b from AABA
&call step=8n &gypsy
&a step=8n &phrase
&b step=8n &a^-3
&turn over=&key step=8n 6 7 6 5 4@2 ~@2
&chop over=&key step=8n &gypsy[0:3] ~@5 &gypsy[0:3] ~ &gypsy[0:3] ~ &gypsy[3:]^-2 ~@3 &gypsy[0:2]!4
&chopA over=&key step=8n degree(&gypsy[0:3], -3) ~@5 degree(&gypsy[0:3], -3) ~ degree(&gypsy[0:3], -3) ~ &turn &gypsy[3]!4
&leadline step=8n &chorus!2 &chop &chopA &chorus
&callNote label="One bar: the motif gypsy is the call, call and answer makes an A of it (the call, then the call two degrees down), and AABA a chorus, its bridge A moved three degrees down." about=(&call &a &b)
```

## Two leads, call and answer

The clarinet calls and a muted trumpet answers: two players of one line, each heard on its own bars.
The trumpet is a second gate on the lead's line, `&lead2`; the clarinet is the lead player's gate, `&leadOut`. Both play as the lead (`&lead map=role &leadOut &lead2`, decision 061), so the piece takes the lead player's gate and writes the role itself.
Each one's level is a two-bar step, `[.5 0]` for the clarinet and `[0 .45]` for the trumpet, so they trade bar by bar: the call, then the answer; in the bridge, its call, then its answer; in the break, the pieces back and forth.

```cells
&lead2 play=&leadline level=&lead2Level &trumpetV
&lead map=role &leadOut &lead2
&dialogueNote label="The clarinet plays the odd bars, the trumpet the even ones: the call and its answer, traded between two players." about=(&leadOut &lead2)
```

## The form, in levels

The song is 32 bars, four times round the vamp: the stabs and the hats alone, then the kick and the bass, the chorus, the break with the kick and the bass out, and the chorus again.
It is written as each part's level, bar by bar, the clarinet's entry too (its line plays from the top, silent for the first eight bars), so every part keeps tapping the swung meter.
The players' levels are holes their fragments leave; here they are the form.
It is the form written six times over, and waits on #304: a selector over the performers, each step naming who plays, would write it once.

```cells
&bassLevel map=amp step=1m 0!4 .8!12 0!8 .8!8
&stabLevel map=amp step=1m .5!16 0!8 .6!8
&leadLevel map=amp step=1m/2 0!4 [.5 0]!12
&lead2Level map=amp step=1m/2 0!4 [0 .45]!12
&kickForm map=amp step=1m 0!4 1!12 0!8 1!8
&clapForm map=amp step=1m 0!8 1!8 .6!8 1!8
&formNote label="The form: intro (4 bars), the band (4), the chorus (8), the break (8), the chorus (8)." about=(&bassLevel &stabLevel &leadLevel &lead2Level &kickForm &clapForm)
```

## The sound

The instruments the players play are voices with no sound of their own: the piece gives each one.
An upright-ish bass, a brass stab, a clarinet with a slow vibrato, a muted trumpet, darker and with a slower one, and the crackle's noise.
In giving the bass its sound the piece gives it its register too, which is the instrument's (decision 058): the library's `bass` sits at C2 and the bass player plays it an octave down, at C1; this `&bassV` sits at C3, so the walk sounds at C2, an octave above the library's, where a laptop's speakers still carry it.

```cells
&bassV s=saw loop=C3 lpf=700 env=&(map=adsr .005 .3 .25 .08)
&keysV s=saw loop=C3 lpf=1800 env=&(map=adsr .01 .12 .25 .1)
&leadV s=square loop=C4 lpf=2400 env=&(map=adsr .02 .2 .7 .15) pitch=&(map=lin loop=5.5 0 .12 0 -.12 0)
&trumpetV s=saw loop=C4 lpf=1400 lpq=6 env=&(map=adsr .03 .1 .6 .12) pitch=&(map=lin loop=4.5 0 .08 0 -.08 0)
&vinyl s=white hpf=2500 env=&(map=adsr 0 .004 0 .004)

&out map=sample postgain=1.96 [&drumsOut,
                         &crackle * &vinyl * .04, &bassOut, &stabOut * .4, &leadOut * .5, &lead2 * .5]
```
