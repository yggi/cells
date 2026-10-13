# Braids

What goes inside a cell: generators, and how to pick from, shift and transpose another cell's braid.

## Generators

- **`scan(intervals)`** — running totals, its lap their sum. `scan(2 2 1 2 2 2 1)` is the major scale (0 2 4 5 7 9 11, lap 12); `scan(3 3 2)` the tresillo (lap 8); `scan(27 23 26 24)` a bent 4/4 bar (beats at 0 27 50 76 % of a lap of 100). Turning a scan walks its modes.
- An interval can be **`geo(r, n, k …)`**: r^(k/n) for each k, a geometric series; `x!n` repeats it n times.
- **`euclid(k, n)`** — k hits spread evenly over n steps (`euclid(3, 8)` is the tresillo); `euclid(k, n, shift)` turned right by shift steps, as Strudel's `(k, n, r)`: `euclid(3, 8, 2)` is `x.x..x..`. The same rhythm inside one step is Strudel's `x(k,n,r)` on that step: `0(3,8,2)`, `&bd(3,8)` ([cell.md](cell.md)).
- **`sin(n)`** — one cycle of a sine in n steps (a voice's waveform); **`saw(n)`**, **`tri(n)`**, **`square(n)`** the same for a saw, a triangle and a square. Each runs −1…1 from the start of its cycle, as Strudel's bipolar signals (`sine2`, `saw2`, `tri2`, `square2`) taken at each step: `saw(4)` is −1 −.5 0 .5, `tri(4)` −1 0 1 0, `square(4)` −1 −1 1 1.
- **A root** is a bare grid: `&edo19 cycle=19` ([tuning.md](tuning.md)).

```cells
&major scan(2 2 1 2 2 2 1)
&tresillo scan(3 3 2)
&hits euclid(5, 12)
&wave sin(12) loop=220
&ramp saw(8) loop=110
```

## Picks and shifts

These read a braid *as written* or moved. They go where a braid is used — braids, `out`, and (shifts only) `over=`; `step=` and `map=` take whole cells.

- **`&t[i]`**, **`&t[a:b]`**, **`&t[a:b:step]`** pick from the braid *as it is turned*, Python-style: `&x[0]` first, `&x[-1]` last, `&x[1:3]`, `&x[:-1]`; `&x[::-1]` is the retrograde, `&x[::2]` every other. A pick keeps each token's modifiers and length; a subsequence (`[2 4]`) is one token, and so are `<2 4>`, `[2 4]/2`, `2(3,8)` and `[2 4|5]`, whatever lap they are on. A pick is a fixed tap on a turning wheel: with `&key shift=2`, `&key[0]` is D and `&key[0] &key[4] &key[7]` D F♯ A; an entry that wraps climbs a lap (`&key[10]` is the C above). It follows the shift as it stands when the note sounds — a stepped key, a `free()` one — when the cell it picks from is plain numbers and is read in another cell's braid (in a mix a cell plays on its own clock, picked or not).
- **`&t[$i]`**, **`&t[$a:b]`** pick *as written*, whatever the shift: with `&key shift=2`, `&key[$0] &key[$4] &key[$7]` is C E G.
- **`&t[<<n]`**, **`&t[>>n]`** — &t shifted back / forward by n (default 1), on top of its own rotation; wrapped entries climb a lap. `&john[<<]` is the theme one unit behind; `over=&scale[<<]` reads one step lower. In `out` the brackets keep shifts apart from pitch arithmetic: `(&alto[<<] - 7) * &cello` — a bar behind, a fifth below.
- Slices rotate too, without the climb: `&x[-1:] &x[:-1]`.
- **`&x^n`** moves a reference n steps of the table it is read through (degrees: relative), **`&x^$n`** n steps of the grid after its tables (semitones on the 12: absolute): `&m^1` a degree up, `&m^$7` a fifth up ([decision 015](../decisions/015-caret-is-degrees.md); below).
- **`shift=n`** rotates the braid by n (wrapped entries climb a lap: a shift of more than twenty laps carries its notes out of hearing, and warns).

```cells-fragment
&canon [&theme * &lead, &theme[<<] * &lead, &theme[<<2] * &lead]
&back &theme[::-1]
```

```cells
&key shift=2
&tonic &key[0]
&major &key[0] &key[4] &key[7]
&cmajor &key[$0] &key[$4] &key[$7]
```

## Operations: degrees and inversion

A reference's numbers are indices into the table it is read through, so they can move before the table reads them. Two operations do that, by name; they go where a step goes, in a braid:

- **`degree(&x, n)`**, short **`&x^n`** — &x moved n steps of its table: a degree up the scale (`&x^-1` one down, past the tonic into the octave below). Not `&x^$n`, which moves grid steps after the table: over C major, `&m^1` makes C D E into D E F, `&m^$1` into C♯ D♯ F. `$` is the absolute frame, as in a pick (`&x[$0]`: as written). n is a whole number, signed or not, spaces allowed (`degree( &x , +1 )`); one `^` per reference (nest with `degree(…)`), and only where a braid plays the cell or `base=` copies it: after `over=`, `step=` and the like it would be ignored, and warns. A degree of more than a hundred octaves of the grid carries the notes out of hearing (above 20 kHz they are dropped), and warns.
- **`inverse(&x)`** — &x mirrored round its table's first entry: inversion within the scale, its steps kept (C D E into C B A). An accidental is mirrored with its note.
- They nest, innermost first: `degree(inverse(&x), 4)` is 4 − each value, mirrored round the third degree; `inverse(inverse(&x))` is `&x`. Picks and modifiers work as on any reference: `degree(&x[::-1], 2)!2`.

```cells
&major scan(2 2 1 2 2 2 1)
&motif 0 1 2 4
&tune over=&major step=4 &motif &motif^1 inverse(&motif) degree(inverse(&motif), 4)
```

`&x^k` plays what a cell reading a shifted table plays (`&y over=&scale[>>k] &x`), without the cell. Mixes move pitch in semitones instead (`(&x + 12) * &lead`, [mix.md](mix.md)). The other operators are decided together, in one pass (#179).


## A copy, changed: base=

**`base=&x`** makes a cell a copy of &x, changed where it says ([decision 026](../decisions/026-base.md)): an overdub,
a delta. A fugue's entries are this: one subject, each entry a little bent.

- **Its braid goes over the base's, step by step.** `=` keeps the base's step as it is there (read "the same"); a value
  in its place changes it; `=!n` keeps n steps, `=@n` keeps one's pitch held n; what goes past the base's end is added, and nothing
  written is the base as it is. A run in the base (`x!3`) counts as its steps.
- **Transposed:** `base=&x^$n` moves what it keeps n steps of the grid (a cell that reads no table: semitones), `base=&x^n`
  n steps of its table. What the cell writes itself is what it plays.
- **Its attributes:** what it doesn't set, the base's (its table, its clock, its shift, a voice's sound); its label,
  notes, `laps=` and `off` are its own. `&lead2 base=&lead lpf=2000` is the lead, brighter.
- A copy of a copy works; one that comes round to itself is an error on `base=`.

```cells
&bar scan(1 1 1 1) step=90bpm
&subject 0 -1 0@2 -5@2 -4@2 0 -1 0 2 -5@4
&answer base=&subject^$7 =!3 0@2
&last base=&subject^$-12 =!9 =@8
&tune step=&bar*4 &subject &answer &last
&v s=tri loop=C4
&out map=sample [&tune * &v * .4]
```

The folder (`engine/fold`, [notes/fold.md](../notes/fold.md)) writes what returns nearly the same this way when a MIDI
file is converted to cells: BWV 847's subject and its bent entries.
