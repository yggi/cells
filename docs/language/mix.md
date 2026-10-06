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

## Pitches and signals

Two kinds of things in a mix: *pitches* (semitone streams — melodies, vibratos — and numbers inside a pitch sum) and *signals* (voices):

- pitch + pitch → pitch: semitones add (`-` subtracts); `(&pedal + 12)` transposes
- signal + signal → signal: voices mix (`,` inside the chord does the same)
- pitch * signal → signal: the voice plays at that pitch, rate × 2^(p/12)
- a number in a product is a gain: `&theme * &lead * 1.2`

The voice is the last non-number factor of a product. Two laws make grouping safe: `(a + b) * s = a * (b * s)` and `a * (s + t) = a * s + a * t`.

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
