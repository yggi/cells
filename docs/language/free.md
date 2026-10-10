# free()

A number left to the performer: a slider on the node, and moving it rewrites the `free(…)` in the code.

**`free(default, lo..hi)`** goes anywhere a number goes:

- a rate: `step=free(90bpm, 60..240)` — the tempo
- a shift: `shift=free(0, 0..6)` — a mode selector (turning the wheel moves it too)
- `stride=`
- a gain in a mix: `&strings * free(.4, 0..1)` — a fader
- inside a generator: `scan(free(2, 1..3) 1)` — the swing ratio of the Swing blues

A tempo marking is its range, centred: `step=free(adagio)` (largo larghetto adagio andante moderato allegro vivace presto).

```cells
&bar scan(4 4 4 4) step=free(90bpm, 60..240)
&slow scan(4 4 4 4) step=free(adagio)
&swing scan(free(2, 1..3) 1) step=free(120bpm, 60..200)
```

## A braid left free

**`free(0 2 4 ~ …)`** around a braid is the same thing for notes: steps left to the performer ([decision 018](../decisions/018-free-braid.md)). It is a cell's whole braid, nothing beside it.

```cells
&key scan(2 2 1 2 2 2 1)
&bar scan(1 1 1 1) step=96bpm
&riff over=&key step=&bar/4 free(0 2 4 ~ 4 2 0 ~)
```

- **It plays as written** until a take is held in its place. Its **length** (8 steps here) is the frame a take fills, as `lo..hi` is a number's range.
- **A take.** Arm the cell (its sheet open, or *Play with* in the MIDI page: [../ui/midi.md](../ui/midi.md#recording-a-braid-left-free)) and press **●** on the transport: play starts, and the next whole pass of the cell's loop is taken from the keys (a MIDI keyboard, the computer keys, the on-screen keys, the piano roll's rows). Steps are quantised to the cell's own clock, swing and moving clocks undone. Keys held together are a chord `[0,4]`, a key held across steps `4@2`, nothing `~`.
- **Held, not written.** The take plays in the braid's place until **Keep** (the cell's sheet, or *Save* on the transport) writes it, `free(0 4 7 5 ~ 4@2 [0,4])`; **Revert** goes back to what is written, and Stop lets go of it, as of every held value. Another take replaces it. The piano roll and the steps on its sheet edit a braid left free the same way: held until Keep.
- **Keys outside the table** follow one setting, for playing and recording alike: *allow* (as played; written with an accidental, `3#`), *snap* (the nearest entry) or *ignore* (nothing).
- Only numbers, rests and chords (held, repeated) go inside; not in a mix, a pick or `spell(…)` (where `free("…")` is a text).

The graph's sliders are described on [../ui/editor.md](../ui/editor.md); a MIDI controller's knob can move them too ([../ui/midi.md](../ui/midi.md#midi-learn)).
