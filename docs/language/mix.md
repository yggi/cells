# Mixes and the sound card

Output is cells too. A chord of sounds is a mix, and a cell with `map=sample` is the sound card. Its sibling, a cell with `map=midi`, is a MIDI card, whose entries are MIDI channels: [midi.md](midi.md).

```cells
&theme step=1 0 2 4 5
&vibrato loop=5 0 .1 .15 .1 0 -.1 -.15 -.1
&lead s=saw loop=261.63 lpf=2200
&pedal step=4 0
&bass s=saw loop=65.4
&mix [(&theme + &vibrato) * &lead * 1.2,
      &pedal * &bass * 0.8]
&out loop=SAMPLE_RATE map=sample &mix &mix      # the sound card: two channels, the same mix
```

## The algebra of a mix

A mix is written with `+` and `*`, and these sorts of things meet in it ([decision 006](../decisions/006-mix-algebra.md); the exact rules, in the order they decide, are in the [reference](reference.md#sorts-what-a-cell-is-in-a-mix)):

- **pitches**: semitone streams, such as a melody, a cell reading a table, or a vibrato
- **volumes**: cells with `map=amp`, `map=db` or `map=adsr` (an envelope)
- **signals**: sound. A cell is a signal by what it is, not where it is written: it has a sound parameter (`s=`, `lpf=` …), or it is a mix (an instrument), a pattern read through a kit, or a read head of a sound tape.
- **waves**: a braid turning at an audio rate (`loop=440`, `loop=C4`) with no sound parameter of its own. Alone in a product it is the sound (a waveform voice: `&tune * &square`); in a pitch sum, or beside another sound, it is a pitch that moves at audio rate: a fast vibrato, which is FM (`(&tune + &op) * &lead`). One that plays as a voice in the piece stays a sound everywhere.

A **plain value**, a number or a `map=lin` cell, has no sort of its own. It takes its operator's: semitones in a sum, where 0 changes nothing, and a volume (a gain) in a product, where 1 changes nothing. `(&pedal + 12)` is an octave up; `12 * &lead` and `&lead * 12` are twelve times louder.

| | `+` | `*` |
|---|---|---|
| pitch, pitch | a pitch: semitones add | the same: transposing twice adds |
| volume, volume | — | a volume: they multiply |
| pitch or volume, signal | — | the signal at that pitch and volume |
| signal, signal | a mix | — |

`-` subtracts pitches only. Parentheses group, 32 deep at most. A dash (—) is an error that names the sorts.

**Laws.** These hold wherever both sides mean something; `algebra.test.ts` checks each one on what plays:

- `a + b = b + a` and `a * b = b * a`. Order doesn't matter: the voice is whichever factor is a signal, so `&lead * &theme` is `&theme * &lead`.
- `(a + b) + c = a + (b + c)` and `(a * b) * c = a * (b * c)`. Grouping doesn't matter.
- `x * (s + t) = x * s + x * t`. A pitch or volume acting on a mix acts on each voice in it (an instrument, below).
- `(p + q) * s = p * (q * s) = (p * q) * s` for pitches `p`, `q`: transposing twice adds.

The law is about pitches, so it doesn't apply to `12` in `12 * &lead`, which is a gain. To transpose by a constant in a product, write the sum: `(&theme + 12) * &lead`.

## A gate: a product with a name

A product that plays a voice can be written as a cell of its own, a **gate**: `trigger=` names what plays through it,
and its braid lists the voices it plays (its receivers). Three levels of one family say how much passes: `velocity=` on
each note, `gate=` over time (how open it is: 1 open, 0 closed, .3 ducked; a solo, a break, a fade) and `gain=` fixed.
It is read as the product it stands for, one for each receiver, so it sounds as the product does:

```cells
&bar scan(1 1 1 1) step=120bpm
&tune step=&bar 0 2 4 7
&accent map=amp step=&bar 1 .5 .8 .5
&solo map=amp step=&bar*4 1 .3                                   # open, then ducked
&lead s=tri loop=C4 env=&(map=adsr .01 .2 .4 .2)
&leadOut trigger=&tune velocity=&accent gate=&solo gain=.5 &lead      # is [&tune * &accent * &solo * &lead * .5]
&out loop=SAMPLE_RATE map=sample [&leadOut]
```

A gate is where notes become sound, named: the graph draws it as a node of its own, its receivers as dim as the gate is
closed. The next steps (#234: a kit's or a MIDI channel's receivers) land on it. The anonymous
product, `[&tune * &accent * &solo * &lead * .5]`, stays its short form.

## The sound card

**`map=sample`** makes a cell the sound card. It can hold its mix directly: `&mix loop=SAMPLE_RATE map=sample [&tune * &lead, &bass * 0.5]` — one chord is mono, two chords `[…] [left] […] [right]` are stereo. `loop=SAMPLE_RATE` turns its braid once per sample (`SAMPLE_RATE` is provided by the environment: the audio device's rate, 48000 until audio starts; plain numbers like `44.1k` work too), and its entries are the channels — one (mono) or two (left, right). Different mixes per channel are stereo; or one chord, and each voice placed with its own **`pan=`** (0 left, .5 centre, 1 right: [sound.md](sound.md)), which plays exactly what two chords with the voice's gains scaled play ([decision 007](../decisions/007-pan-is-back.md)):

```cells
&theme step=1 0 2 4 5
&reed s=square loop=220 pan=.3
&cello s=saw loop=110 pan=.8
&out loop=SAMPLE_RATE map=sample [&theme * &reed, &theme * &cello * 0.4]
```

Two mixes, one for each channel:

```cells
&theme step=1 0 2 4 5
&reed s=square loop=220
&cello s=saw loop=110
&alto step=1 0 4
&left  [&theme * &reed, &alto[<<] * &cello * 0.4]
&right [&theme * &reed * 0.6, &alto[<<] * &cello]
&out loop=SAMPLE_RATE map=sample &left &right
```

## Instruments

A mix can be used like a voice — an instrument: the pitches, volumes and gain acting on it act on each of its voices (`a * (s + t) = a * s + a * t`):

```cells-fragment
&bass [&(map=adsr .04 .3 .6 .5) * &saw, &sub * 0.6]   # an instrument with its envelope
&mix loop=SAMPLE_RATE map=sample [&tune * &lead, &roots * &bass]
```

Voices, envelopes and volume streams are on [sound.md](sound.md).
