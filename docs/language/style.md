# Style: a point in style space, and a value read by name

A style is a point in style space: one value on each of its axes.
The axes are cells' own table (`AXES`, `src/engine/style.ts`), each with a name, a range and what it measures:

| axis | range | from one end to the other |
|---|---|---|
| `sync` | 0 to 1 | on the beat (0) to off the beat (1) |
| `harm` | 0 to 1 | a static vamp (0) to moving, rich harmony (1) |
| `artic` | 0 to 1 | legato (0) to staccato (1) |
| `energy` | 0 to 1 | sparse (0) to dense (1) |

A fragment's association points in the repository are written on the same axes ([use.md](use.md)), and a frontend reads them from the table rather than owning them ([decision 063](https://github.com/yggi/cells/blob/main/docs/decisions/063-the-score-and-the-band.md)).

## map=style

A cell with `map=style` is a style: a value for each axis, in the table's order, or each by its name.
It doesn't sound; what reads it is another cell.

```cells
&funk map=style .3 .45 .55 .55
&bossa map=style sync=.5 harm=.75 artic=.35 energy=.5
```

The two spellings are one point: `sync=.5 harm=.75 artic=.35 energy=.5` is the braid `.5 .75 .35 .5`.
The axes' names are read only on a `map=style` cell, so the list of attributes doesn't grow.
A style names every axis, each within its range; a value outside it, or one missing, is an error that lists them.

## A value by name: &x[slot]

A map that names its slots lets a pick read one by its name:

| map | its slots, in order |
|---|---|
| `map=adsr` | `attack` `decay` `sustain` `release` |
| `map=style` | `sync` `harm` `artic` `energy` |

`&x[slot]` is the slot's fixed position, as written: `&pluck[sustain]` is `&pluck[$2]`, and `&funk[artic]` is `&funk[$2]`.
It doesn't follow `shift=`: a field doesn't turn.

```cells
&bar meter("4/4") step=120bpm
&pluck map=adsr .01 .3 .5 .4
&funk map=style .3 .45 .55 .55
&held step=4n &pluck[sustain] &pluck[attack] &funk[artic] &funk[$2]
&tone s=sine loop=C4
&out map=sample [&held * &tone]
```

A cell whose map names no slots refuses a name, and so does a name its map lacks; the error lists the slots there are.
A bare word in a pick can only be a slot, since a pick otherwise holds numbers, `$`, `:`, `<<` and `>>`, so this adds to Strudel's spellings without changing one ([decision 027](https://github.com/yggi/cells/blob/main/docs/decisions/027-on-top-of-strudel.md)).
