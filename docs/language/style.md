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

## style=: a cell's style, and the section's

Any cell may carry `style=`, its association or wish: a style cell, an unnamed one, or a mix of them by weight.

| written | what it is |
|---|---|
| `style=&funk` | a style cell's point |
| `style=&(map=style .41 .6 .45 .52)` | an unnamed one |
| `style=[&funk * .8, &bossa * .2]` | a mix: the weighted sum of the styles' points, exact by definition |
| `style=&funk..&bossa` | a range: from one to the other over the cell's scope |
| `style=&funk..&bossa * &curve` | a range, where between the two ends set by a line from 0 to 1 in place of time |

Each end lies within the axes' ranges: a mix whose weights take it outside is an error.

**The note `&style` is the section's style** ([decision 063](https://github.com/yggi/cells/blob/main/docs/decisions/063-the-score-and-the-band.md)).
`&style` is an interface name, as `&bar`, `&tempo`, `&key`, `&tonic` and `&harm` are: a score names its style so, and a band written once reads it by that name in every section.
A pick reads its value on an axis, `&style[artic]`, and a voice's moving parameter can take it as a factor:

```cells
&bar meter("4/4") step=120bpm
&funk map=style .3 .45 .2 .55
&bossa map=style .5 .75 .8 .5
&style label="Section 1: from Funk to Bossa nova" style=&funk..&bossa
&line step=1m 0!8
&bassV s=saw loop=C2 lpf=300..1200 * &style[artic]
&out map=sample [&line * &bassV]
```

**A range glides over the cell's scope, the piece's length** (its bars, as cells finds it: [time.md](time.md)).
Bar k of n begins at a + (b − a)·k/n, in a straight line sixteen steps a bar, on the piece's meter: the glide comes round with the piece and follows its tempo, and doesn't lengthen it.
With no meter, it glides in seconds.
A factor written out, `* &curve`, sets where between the two ends instead: a line of numbers from 0 to 1, on its own clock.

A pick of a slot as a factor reads its value, held: `lpf=0..1000 * &pluck[sustain]` is 500 Hz with `&pluck map=adsr .01 .3 .5 .4`.

## The presets' styles: styles

The seed library holds Jambot's ten presets as styles, the cells of one collection, `styles` (`fragments/styles/01-styles.md`): `&synthPop`, `&techno`, `&deepHouse`, `&ambient`, `&lofi`, `&funk`, `&bossaNova`, `&swingJazz`, `&electroSwing` and `&spooky`, each at the point its preset plays.
A score takes one by name where its section sits exactly on it, and writes its numbers, or a mix of styles, where it doesn't ([decision 063](https://github.com/yggi/cells/blob/main/docs/decisions/063-the-score-and-the-band.md) §3).

```cells
&funk, &bossaNova from styles
&style label="Funk, turning to Bossa nova" style=&funk..&bossaNova
```

The collection is associated at each of the ten points as the facet `style`, so the style nearest a point is a query too.

## The default band: a score played as its style says

A score ends in `* from band`, and the client's resolver answers `band` ([decision 063](https://github.com/yggi/cells/blob/main/docs/decisions/063-the-score-and-the-band.md) §1).
The seed library's band, `band` (`fragments/bands/01-band.md`), plays Jambot's five roles on instruments with a sound, and reads the score's `&style` where Jambot's synth reads its style: the bass's cutoff opens with articulation (`lpf=450..900 * &style[artic]`), the lead's with energy (`lpf=1400..3600 * &style[energy]`).
It sends the score on a MIDI card on Jambot's channels and hears it on a sound card.

```cells
&bar meter("4/4") step=104bpm
&key scale(dorian, D)
&harm over=&key step=1m [0,2,4] [3,5,7]
&kick step=4n &bd &bd &bd &bd
&drumlines [&kick]
&bassline over=&harm step=8n 0 ~ 0 2 ~ 0 4 ~
&padline over=&harm step=1m [0,1,2]
&stabline step=1m ~
&leadline over=&key step=8n 4 ~ 3 2 0@4
&funk from styles
&style label="Funk, a section" style=&funk
* from band
```

Which instrument a performer plays at a style is the band's choice too, made at resolution: `resolveBand(score)` answers `band` with each pitched voice the instrument the library ranks first at the score's style, named or written as numbers, (a clarinet at Electro swing's point, a theremin at Spooky's), and the band as written at Jambot's eight presets (`src/repository/band.ts`).
A line can't make that choice: a voice reads a style as a moving parameter, and a wave or an envelope's times are not one.
