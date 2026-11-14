# A piece's ground: tempo, meter, tonic, key

A piece stands on two wheels: a clock that says when, and a table that says which notes.
The clock is a meter at a tempo; the table is a key on a tonic.
They are the same kind of thing, built the same way, and this page says what each is and how the two line up.
The reference for each form is on [time.md](time.md) and [tables.md](tables.md).

## Two wheels

```cells
&bar from meter &tempo                     # the clock: a meter, at a tempo
&tempo step=96bpm
&key from diatonic(mode=dorian) &tonic     # the table: a mode, on a tonic
&tonic D
&tune over=&key step=8n 0 2 4 2 3 1 ~ 0
&v s=sine loop=C4
&out map=sample [&tune * &v]
```

Each wheel is a fragment of the seed library taken by a `from` line ([use.md](use.md), [decision 065](https://github.com/yggi/cells/blob/main/docs/decisions/065-fragments-take-arguments.md)), and the two signatures line up:

| | the line | its main argument | its shape, optional |
|---|---|---|---|
| the clock | `&bar from (&grouping, &swing) &tempo` | a rate, the tempo | the grouping (4/4) and the swing (straight) |
| the table | `&key from (&mode) &tonic` | a note, the tonic | the mode (major) |

The main argument is required: a meter with no tempo has no time, and a key with no tonic would play a wrong key silently ([#117](https://github.com/yggi/cells/issues/117)).
The shape has a default, and a piece passes its own by name: `meter(grouping=meter("7/8"), swing=8n:2/3)`, `diatonic(mode=dorian)`.
The names `&bar`, `&tempo`, `&key` and `&tonic` are a convention, which Normalise writes; nothing reads them by name ([decision 075](https://github.com/yggi/cells/blob/main/docs/decisions/075-a-name-is-only-a-name.md)).

## The tempo

A tempo is a rate alone: a cell with a `step=` and no braid, `&tempo step=96bpm` ([#290](https://github.com/yggi/cells/issues/290)).
A meter stepped by it, `step=&tempo`, keeps time as if the rate were written on the meter; `step=&tempo*2` doubles it.
It can be a slider, `step=free(90bpm, 60..240)`, or a tempo marking, `step=free(andante)` ([free.md](free.md)).
**bpm counts beats**, the meter's beats, whatever their note value: 6/8 at 60 bpm is two dotted quarters a second ([decision 040](https://github.com/yggi/cells/blob/main/docs/decisions/040-pulse-beat-and-laps.md)).

## The meter

A meter knows four things ([decision 040](https://github.com/yggi/cells/blob/main/docs/decisions/040-pulse-beat-and-laps.md)): its **bar** (its lap), its **pulse** (equal steps of the denominator, 6 in 6/8), its **beat** (what is counted, 2 in 6/8) and its **tree** (its groups and their proportions, 3+3).
`meter("6/8")` writes all four.

**A meter is two applications of `even`** ([decision 072](https://github.com/yggi/cells/blob/main/docs/decisions/072-even-is-the-foundation.md), [#506](https://github.com/yggi/cells/issues/506)):
- its pulses into beats, `even(⌈n/3⌉, n)` for x/8, turned to begin on a three: 7/8 is 3+2+2, 10/8 3+2+3+2;
- its beats into halves, `even(2, k)`, each half again: 4/4's beats are two halves of two.

So `meter("4/4", 2)`, at two steps a pulse, is eight steps graded `*.-.+.-.`: `*` the bar, `+` its second half, `-` the beats inside each half, `.` the eighths.
A meter can be written as its signature (`meter("7/8")`), as groups (`meter("3+2+2")`, the same meter) or as levels (`meter("*.-.+.-.")`); [time.md](time.md#meters) has every spelling.

## Taps

A line steps on the meter by **tapping** it: by pulse, by beat or by note value, never by the meter cell's own steps ([decision 040](https://github.com/yggi/cells/blob/main/docs/decisions/040-pulse-beat-and-laps.md), [decision 044](https://github.com/yggi/cells/blob/main/docs/decisions/044-tap-reads-the-meter.md)).
So changing the meter, or its swing, never changes what a line means.
- `step=pulse`, `step=beat`, each with `*k` for k equal steps in it;
- note values, `16n` `8n` `4n` `2n` `1n`, triplets `8t`, dotted `4n.`, and the bar, `1m`;
- another meter than the piece's main one, named: `step=&m:16n`.

**A tap comes round at the bar**: a note value longer than what is left of the bar is cut there, and a line walks its braid across the bar line unless `cycle=n` brings it round every n bars ([#116](https://github.com/yggi/cells/issues/116)).

```cells
&bar from meter(grouping=meter("7/8")) &tempo
&tempo step=90bpm
&count step=beat 0 3 5                     # a dotted quarter, two quarters
&eighths step=8n 0!7
&click s=sine loop=A5 env=&(map=adsr 0 .03 0 .02)
&out map=sample [&count * &click, &eighths * &click * .3]
```

## Feel on the meter

A meter is a tree placed through a time map ([decision 080](https://github.com/yggi/cells/blob/main/docs/decisions/080-a-meter-is-a-tree-placed-through-a-time-map.md)): the tree says what is counted, the time map where each step falls.
Taps are placed through it, so every line on the meter takes its feel.
- **`swing=8n:r`** leans one level by rule: of each pair of eighths, the second starts r of the way through their beat ([#18](https://github.com/yggi/cells/issues/18), [decision 042](https://github.com/yggi/cells/blob/main/docs/decisions/042-swing-share-as-a-fraction.md)). **Pairs lean, a group of three stays straight** ([decision 071](https://github.com/yggi/cells/blob/main/docs/decisions/071-swing-leans-pairs.md)): 7/8 swung on its eighths plays its first beat even.
- **`bend=4n:&table`** bends one level's nodes by a table: `bend=4n:&rubato` with `&rubato 27 23 26 24` plays the beats at those lengths, the bar as long as before (decision 080). A table longer than the bar is a tempo map.
- **Agogic is a bend's depth**: `bend=4n:&rubato:d` applies the table to the power d, 0 even, 1 as written, .5 half the rubato ([decision 081](https://github.com/yggi/cells/blob/main/docs/decisions/081-swing-moved-at-the-bar-line.md), the design of [#20](https://github.com/yggi/cells/issues/20)). And a lean of three, which a swing never gives, is a bend over the threes: `meter("6/8") bend=8n:&(4 3 3)`.
- **`legato=16n:.5`** is the meter's articulation, a share of each note's length by level, for every line that states none of its own ([#94](https://github.com/yggi/cells/issues/94)).
- **Moved at the bar line**: a swing's share and a bend's depth may be a cell, `swing=8n:&lean`, `bend=4n:&rubato:&d`, each read at the bar line (a bend's at the line of its span) and held through it, the one place no time map moves (decision 081).

```cells
&bar meter("4/4") step=&tempo swing=8n:&lean bend=4n:&rubato:.5
&tempo step=110bpm
&lean step=1m .55 .67                      # every other bar leans further
&rubato 27 23 26 24
&hat step=8n 0!8
&v s=tri loop=C5 env=&(map=adsr 0 .03 0 .02)
&out map=sample [&hat * &v]
```

## The tonic

A tonic is a note: a name (`D`, `F#`, `Bb`) or a pitch class (`2`), its octave the voice's ([decision 060](https://github.com/yggi/cells/blob/main/docs/decisions/060-the-key-is-named.md), [#290](https://github.com/yggi/cells/issues/290)).
- **Stepped**, `&tonic step=1m/2 D F`: the key turns with it, and every line over the key plays in the tonic in force ([#301](https://github.com/yggi/cells/issues/301)).
- **Free**, `&tonic free(D)`: D until the performer holds a take in its place ([free.md](free.md)).

As a tempo is the clock's rate alone, a tonic is the table's turn alone.

## The mode and the key

The seven diatonic modes are one necklace, `even(7, 12, phase)`, its phase the mode, **darkest to brightest**: `locrian` 0, `phrygian` 1, `aeolian` (`minor`) 2, `dorian` 3, `mixolydian` 4, `ionian` (`major`) 5, `lydian` 6 ([decision 072](https://github.com/yggi/cells/blob/main/docs/decisions/072-even-is-the-foundation.md), [decision 013](https://github.com/yggi/cells/blob/main/docs/decisions/013-scale-generator.md)).
One phase brighter raises one note a semitone, a fifth round the circle.
A mode word reads as its number, as a note name reads as its pitch.

The key is the mode on the tonic, `scale(even(7, 12, &mode), &tonic)`: the diatonic necklace at the mode's phase, turned to the tonic, a table every line reads through by name, `over=&key` ([decision 060](https://github.com/yggi/cells/blob/main/docs/decisions/060-the-key-is-named.md), [#363](https://github.com/yggi/cells/issues/363)).
`diatonic` is that line with the mode a parameter, the one source of the seven modes ([#387](https://github.com/yggi/cells/issues/387)); `scale(&mode, &tonic)` and `scale(dorian, D)` are its sugar, and any necklace is a key the same way, `scale(even(5, 12, &p), &tonic)` ([decision 089](https://github.com/yggi/cells/blob/main/docs/decisions/089-a-generator-reads-a-cell-that-is-one-number.md), [#531](https://github.com/yggi/cells/issues/531)).
Other scales are named, `scale(harmonic, A)`, or written, `scan(…)` ([tables.md](tables.md)).

## Degrees and tables

A number in a line over the key is a degree of it: `0` the tonic, `7` an octave up, `-1` the degree below, `6#` a degree raised.
`&motif^n` moves a motif n degrees of the table it is read through ([decision 015](https://github.com/yggi/cells/blob/main/docs/decisions/015-caret-is-degrees.md), [braid.md](braid.md)).

A chord is a table over the key, as a beat is a level of the meter: the triad on degree k is `&triad over=&key[>>k] even(3, 7)`, and its root and fifth `&power over=&triad even(2, 3, 1)` ([#508](https://github.com/yggi/cells/issues/508)).

```cells
&bar from meter &tempo
&tempo step=90bpm
&key from diatonic C
&triad over=&key[>>4] even(3, 7)           # the dominant's triad: G B D
&power over=&triad even(2, 3, 1)           # its root and fifth: G D
&arp over=&triad step=8n 0 1 2 3 2 1 0 -1
&bass over=&power step=4n 0 1 0 -1
&v s=sine loop=C4
&b s=saw loop=C2
&out map=sample [&arp * &v, &bass * &b * .5]
```

## Grades

Both wheels are chains of `even`, each level inside the one above ([decision 072](https://github.com/yggi/cells/blob/main/docs/decisions/072-even-is-the-foundation.md)):
- **time:** the pulses ⊃ the beats ⊃ the halves ⊃ the bar;
- **pitch:** the twelve ⊃ the scale ⊃ the triad ⊃ the root and fifth ⊃ the root (Lerdahl's basic space).

So they grade in **one alphabet**, `*+-.,`, from the ends, as yggi/music-commons `contracts/meter` writes a meter's levels:
- a meter: `*` the bar, `,` the step and `.` the eighth, the tiers between `+` and `-` from the top; 4/4 in eighths is `*.-.+.-.`, 12/8 `*..-..+..-..`;
- a key: `*` the root, `+` the fifth, `-` the third, `.` the scale, `,` the chromatic; C major from its tonic is `*,.,-.,+,.,.`, C first.

As numbers both run 0 to 4, coarse to fine: a meter writes its tiers so as its braid, and `gradesOf` (`engine/grade.ts`) reads a key's, from any degree's triad.
A key of other than seven notes takes the same chain: a pentatonic's "triad" is a sus2, the whole tone's the augmented triad ([#508](https://github.com/yggi/cells/issues/508)).

## Written out

A `from` line is sugar ([decision 069](https://github.com/yggi/cells/blob/main/docs/decisions/069-compile-writes-the-core.md)): the fragment's lines, its parameters bound, its helpers named after the head.
`&bar from meter(grouping=meter("7/8"), swing=8n:2/3) &tempo` is:

```cells
&bar base=&bar_grouping step=&tempo swing=&bar_swing
&bar_grouping meter("7/8")
&bar_swing swing=8n:2/3
&tempo step=96bpm
```

and `&key from diatonic(mode=dorian) D`:

```cells
&key scale(&key_mode, &key_tonic)
&key_mode dorian
&key_tonic D
```

The other way round, Normalise writes a hand-written meter or key as its template ([#524](https://github.com/yggi/cells/issues/524), [canonical.md](canonical.md)).
It first names the tempo and the tonic as cells, then takes the template:
`&bar meter("7/8") step=96bpm swing=8n:2/3` becomes `&bar from meter(grouping=meter("7/8"), swing=8n:2/3) &tempo` with `&tempo step=96bpm`, and `&key scale(dorian, D)` becomes `&key from diatonic(mode=dorian) &tonic` with `&tonic D`, each only where it sounds the same.
A key with no tonic written (`scale(major)`) stays as it is: the template's main argument is its tonic.
