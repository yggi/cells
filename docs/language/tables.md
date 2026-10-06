# Tables

Reading through a table: `over=`, `shift=` and `scale()` say which grid a cell's numbers index into.

- **`over=&t`** — a number x means entry x of &t; past the end it climbs a lap. Without `over=`, a cell reads through the table of whoever splices it.
- **`over=scale(tonic, phase)`** is shorthand for two unnamed cells: exactly `over=&(scan(…) over=&(shift=tonic))` with the scan of `phase`. `scale(0,2)` is C Aeolian, `scale(2,3)` D Dorian, `scale(7,5)` G Ionian; the phase runs from 0, the darkest mode, to 6, the brightest. Write the key and scale as named cells when you want to turn or step them.
- **`shift=n`** rotates the braid by n; wrapped entries climb a lap. On a table it turns what reads through it ([time.md](time.md) for a moving shift).
- **Picks and shifts of a table** (`over=&scale[<<]`) are on [braid.md](braid.md).
- **Turning climbs**, like every other shift: a stepped table goes up a lap each time round. **`cycle=n`** has one job everywhere — how many before it comes round: `&key … stride=7 cycle=12` goes round the circle of fifths; per tonos' `&key … stride=2 cycle=24` rises two octaves, then starts again.

```cells
&line step=1 over=&scale 0 2 4 2 0
&scale over=&key scan(2 2 1 2 2 2 1) step=cycle(&line)
&key step=cycle(&scale) stride=7 cycle=12
```

```cells-fragment
&line2 over=scale(0, 2) step=1 0 2 4
&line3 over=scale(2, 3) step=1 0 2 4
```
