# Mixes and the sound card

Output is cells too. A chord of sounds is a mix, and a cell with `map=sample` is the sound card.

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

A mix is written with `+` and `*`, and three sorts of things meet in it ([decision 006](../decisions/006-mix-algebra.md)):

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

`-` subtracts pitches only. A dash (—) is an error that names the sorts.

**Laws.** These hold wherever both sides mean something; `algebra.test.ts` checks each one on what plays:

- `a + b = b + a` and `a * b = b * a`. Order doesn't matter: the voice is whichever factor is a signal, so `&lead * &theme` is `&theme * &lead`.
- `(a + b) + c = a + (b + c)` and `(a * b) * c = a * (b * c)`. Grouping doesn't matter.
- `x * (s + t) = x * s + x * t`. A pitch or volume acting on a mix acts on each voice in it (an instrument, below).
- `(p + q) * s = p * (q * s) = (p * q) * s` for pitches `p`, `q`: transposing twice adds.

The law is about pitches, so it doesn't apply to `12` in `12 * &lead`, which is a gain. To transpose by a constant in a product, write the sum: `(&theme + 12) * &lead`.

## The sound card

**`map=sample`** makes a cell the sound card. It can hold its mix directly: `&mix loop=SAMPLE_RATE map=sample [&tune * &lead, &bass * 0.5]` — one chord is mono, two chords `[…] [left] […] [right]` are stereo. `loop=SAMPLE_RATE` turns its braid once per sample (`SAMPLE_RATE` is provided by the environment: the audio device's rate, 48000 until audio starts; plain numbers like `44.1k` work too), and its entries are the channels — one (mono) or two (left, right). Different mixes per channel are stereo:

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
