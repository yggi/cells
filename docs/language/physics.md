# Physical cells

Cells that behave like machines and bodies: motors, belts, tape, resonators and FM. Physics is deterministic, so a piece plays the same every time. Time is in [time.md](time.md); voice parameters in [sound.md](sound.md).

## Meters with a motor

**motor=n** on a meter makes it a body that turns: from rest, it pulls towards its tempo (torque fades to nothing at full speed).

- **mass=n** inertia (slower spin-up); on a driven cell, load on its driver. **friction=n** drag: it settles at motor / (motor + friction) of its tempo, load included.
- **wind=s** a spring that holds, then gives out over `s` seconds: the clock coasts to a stop, and the piece ends there.
- **wow=f** its speed swings by the fraction `f`, 0.55 times a second (`.01` is a tape machine's).
- **varispeed=v** on a clock or tape: notes' pitch follows its speed, `1` fully, `0` not (default).

```cells
&bar scan(1 1 1 1) step=96bpm motor=6 mass=1.2 friction=.4 wind=36
&tune step=&bar/2 0 4 7 4
&v s=sine loop=C4
&out loop=SAMPLE_RATE map=sample [&tune * &v * .3]
```

In the graph a physical cell is a turntable: hold it to slow it, turn it to push (live only, never saved).

## Belts

**belt=k** on a cell driven by `step=&meter` makes it follow through a spring of stiffness `k` (default 200; 3000 taut, 25 slack): it lags, swings, catches up. **mass=** is the driven body (1); **damping=** how soon swinging dies (default a little bounce; 0 rings on); **slip=** the grip: past this pull the belt slips and the cell falls behind for good. A cell's time never runs backwards.

```cells
&bar scan(1 1 1 1) step=104bpm motor=4 mass=1 friction=.2
&wood step=&bar/2 belt=400 mass=1.5 slip=.4 0 0 ~ 0
&blk s=square loop=C6 hpf=900 lpf=3000 env=&(map=adsr 0 .03 0 .02)
&out loop=SAMPLE_RATE map=sample [&wood * &blk * .1]
```

## Tape

A tape is a cell with **write=&melody** (notes) or **write=&mix** (sound), moving with its clock: `step=&reel` ties it to a motor. **play=&tape** makes a read head, **at=** seconds of tape after the write head (or a clock: `at=&bar`); heads are cells, played or mixed like any other.

- **length=s** the loop (none: an open reel, once). **erase=e** wipes `e` of what was there each pass (default 1; `.3` leaves ghosts).
- Sound tapes: **tone=** loss in Hz (7000; 1500 worn), **drive=** saturation (.15), **hiss=** noise floor, **print=** pre-echo at **printgap=** tape-seconds before each head (.6), **dropout=** gaps a second.
- A head's **wander=** (tape-seconds) and **wanderhz=** (.2) fly it. **belt=** on the tape makes the strip elastic.

```cells
&reel step=84bpm motor=1.5 mass=1 friction=.1 wow=.015 0
&bar scan(1 1 1 1) step=84bpm
&tune step=&bar/2 0 ~ 4 ~ 7 ~ ~ ~
&tape step=&reel write=&tune length=6 erase=.45 varispeed=1
&near play=&tape at=.375
&far play=&tape at=1.5 wander=.05
&v s=sine loop=G4 env=&(map=adsr .002 .5 0 .4)
&out loop=SAMPLE_RATE map=sample [&tune * &v * .3, &near * &v * .15, &far * &v * .1]
```

A tape stop: a reel with `wind=` and `varispeed=1`, or a hand on it. A sound tape's head in a mix returns as sound: `[&dry, &head * .5]`.

## Resonators

**body=** makes a persistent body of modes: `fork bell bar plate box tine pipe wire spring`. `loop=` is the fundamental; a note strikes it (its value is where). The braid lists **exciters**, semitones from the fundamental (none: the twelve); a note plucks the nearest, and a named cell brings its own `hard=`/`ring=`/`body=`.

- **ring=s** how long it rings. **hard=h** the mallet, 0 felt to 1 steel. **board=body|none** the board exciters share (a `box` an octave down).
- **coupling=c** how strongly they ring each other (up to .2). **couple=&other** another resonator it shares a table with. **excite=&mix** sound that drives it.

```cells
&bar scan(1 1 1 1) step=92bpm
&tune step=&bar/2 0 2 4 ~ 3 4 5 ~
&kalimba body=tine loop=C4 ring=3 hard=.3 coupling=.06 0 2 4 7 9 12 14 16
&forkB body=fork loop=A4 ring=6 board=none couple=&forkA coupling=.1 0
&forkA body=fork loop=free(440hz, 434..446) ring=6 board=none 0
&out loop=SAMPLE_RATE map=sample [&tune * &kalimba * .5, &forkB * .3]
```

Metal is inharmonic: a `map=ratios` grid of a beam's partials (`1 2.756 5.404 8.933`, then the period) tunes a hit to them, but only by link (a cell reading through it): see [tuning.md](tuning.md).

## FM

**fm=&op** modulates a voice by `op`, a voice of its own: **ratio=** its frequency against the carrier's (3.5 a bell); **index=** the depth (0 none, 10 bright), which can move: `index=.8..6 * &(map=adsr …)`. A modulator may have its own `fm=`; chains cannot loop. The spectrum wheel shows the exact lines (Bessel) at the index's top ([display.md](display.md)).

```cells
&bar scan(1 1 1 1) step=84bpm
&tune step=&bar/2 0 2 4 ~
&m s=sine ratio=3.5
&bell s=sine loop=C5 fm=&m index=.8..6 * &(map=adsr .001 1.4 .15 1.2) env=&(map=adsr .002 3 0 2.5)
&out loop=SAMPLE_RATE map=sample [&tune * &bell * .2]
```

## Limits

- Belts do not pull back on their driver (load is static `mass=`/`friction=`); belts between non-meter cells in chains are not built. No flutter beside `wow=`.
- Tape pitch under `varispeed=` is limited to two octaves either way; a tape at a standstill records nothing.
- FM has no feedback, and no loops between operators. See [../limits.md](../limits.md).
