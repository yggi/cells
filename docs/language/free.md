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

The graph's sliders are described on [../ui/editor.md](../ui/editor.md); a MIDI controller's knob can move them too ([../ui/midi.md](../ui/midi.md#midi-learn)).
