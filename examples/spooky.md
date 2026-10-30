---
title: Spooky, in pieces
tags: [genre:electronic, harmony, rhythm, arrangement, motifs]
description: "A heartbeat in 5/4, a bass that creeps, an organ's i–♭VI–iv–V in D harmonic minor, a celesta, and a theremin singing the Dies irae: the band, the tune and its form are the seed library's."
---

Halloween music counts in fives, so the beat never settles; its key is a minor with a raised seventh, and its tune is a chant of the day of wrath.
Here the band comes from the seed library, taken by name, and so does the tune: the drummer and its kit, the key, a four-bar cadence, a bass line, the bass, pad, stab and lead players, and the beat, the bass and the tune Spooky gave the library (`Spooky drums`, `creeping bass`, `dark cadence`, `diesIrae`).
The piece writes only what is its own: the tempo, the key's tonic, the stabs, who plays when, and the sound of each instrument.

```cells
&drums, &drumsOut from "drums performer" &drumlines
&key from "harmonic minor" D
&harm from "dark cadence" &key
&bassline from "creeping bass" &harm
&kick, &hat, &euclid from "Spooky drums"
&bass, &bassOut from "bass performer"(bassLevel=&bassLevel) &bassline
&pad, &padOut from "pad performer"(padLevel=&padLevel) &padline
&stab, &stabOut from "stab performer"(stabLevel=&stabLevel) &stabline
&leadOut from "lead performer"(leadLevel=&leadLevel) &leadline
&useNote label="The band is the library's: each use names what it takes. &bassV, &padV, &keysV and &leadV are the players' instruments, named so the piece can give each a sound of its own." about=(&bassV &padV &keysV &leadV)
```

The meter is the library's, `5/4`, five beats to the bar, which leaves its tempo to the piece (`&tempo`), a slider.
The key is harmonic minor, from the library, on the tonic its line gives it, D (`&key from "harmonic minor" D`, decision 064): its fifth is then A major, a dominant, and its sixth B♭ sits a semitone above it.

```cells
&bar from "5/4" &tempo
&tempo step=free(100bpm, 80..120)
&fiveNote label="Five beats a bar: every line taps the meter, so the heart beats five times and the knock falls at the middle of the bar, between the third beat's strokes." about=&bar
```

## The beat

`Spooky drums`, used above: a heartbeat on every beat, its second stroke a sixteenth late and softer, the ride ticking each beat like a clock, the rim knocking once, at the middle of the bar.
The piece takes its three limbs by name and hands them to the drummer as a stack, `&drumlines`, the heart under a level of the form's.

```cells
&drumlines [&kick * &heartForm, &hat, &euclid * .25]
&beatNote label="The beat is a fragment: &kick, &hat and &euclid come from Spooky drums." about=(&kick &hat &euclid)
```

## The chords, the bass and the stabs

`dark cadence`, used above, is the harmony: D minor, B♭ major, G minor and A major, a bar each.
The organ holds each chord a bar (`&padline`); `creeping bass` holds each root two beats, then creeps a semitone up and back, four beats long against the bar's five, so the creep comes a beat later each time round.
The celesta plays the stab player's part, the piece's own: a chord on the and of one and on four, a music box in another room.

```cells
&padline over=&harm step=1m [0,1,2]
&stabline over=&harm step=8n ~ [0,1,2] ~ ~ ~ ~ [0,1,2] ~ ~ ~
&creepNote label="The bass is four beats long in a bar of five: its creep comes a beat later each bar." about=&bassline
```

## The tune: the Dies irae

The tune is the motif `diesIrae`, the chant's head: F E F D E C♯ D, in eighths.
The theremin sings it over D minor, rests over B♭, sings it again three degrees up over G minor, and rests over A: one call a chord, two chords a phrase.

```cells
&diesIrae from diesIrae &key
&leadline step=8n &diesIrae ~@2 ~@10 &diesIrae^3 ~@2 ~@10
&tuneNote label="The Dies irae, over D minor, then three degrees up over G minor." about=&leadline
```

## The form, in levels

Sixteen bars, four times round the cadence: the heart and the knock alone; then the organ and the bass, and the theremin; then the celesta joins; the heart drops out for the last lap and comes back on the last bar.
Each player's level is a hole its fragment leaves; here it is the form.

```cells
&heartForm map=amp step=1m 1!12 0!3 1
&padLevel map=amp step=1m 0!4 .5!12
&bassLevel map=amp step=1m 0!4 .8!12
&stabLevel map=amp step=1m 0!8 .5!8
&leadLevel map=amp step=1m 0!4 .6!12
&formNote label="The form: the heart (4 bars), the band and the theremin (4), the celesta (4), the last lap without the heart (4)." about=(&heartForm &padLevel &bassLevel &stabLevel &leadLevel)
```

## The sound

The instruments the players play are voices with no sound of their own: the piece gives each one.
A round bass, an organ, a celesta an octave and more above the stab player's register, and a theremin, a sine with a slow attack and a wide, slow vibrato; and the wind, brown noise swelling once every four bars.

```cells
&bassV s=tri loop=C3 lpf=500 env=&(map=adsr .01 .3 .6 .2)
&padV s=square loop=C3 lpf=1100 env=&(map=adsr .25 .2 .8 .6)
&keysV s=sine loop=C5 env=&(map=adsr .002 .7 0 .5)
&leadV s=sine loop=C4 env=&(map=adsr .15 .2 .9 .4) pitch=&(map=lin loop=5 0 .25 0 -.25 0)
&windline step=1m 0 ~ ~ ~
&howl s=brown lpf=700 env=&(map=adsr 2 1 .5 2)

&out map=sample postgain=1.93 [&drumsOut, &bassOut, &padOut * .25, &stabOut * .3, &leadOut * .5, &windline * &howl * .1]
```
