# Braids

What goes inside a cell: generators, and how to pick from, shift and transpose another cell's braid.

## Generators

- **`scan(intervals)`** — running totals, its lap their sum. `scan(2 2 1 2 2 2 1)` is the major scale (0 2 4 5 7 9 11, lap 12); `scan(3 3 2)` the tresillo (lap 8); `scan(27 23 26 24)` a bent 4/4 bar (beats at 0 27 50 76 % of a lap of 100). Turning a scan walks its modes.
- An interval can be **`geo(r, n, k …)`**: r^(k/n) for each k, a geometric series; `x!n` repeats it n times.
- **`euclid(k, n)`** — k hits spread evenly over n steps (`euclid(3, 8)` is the tresillo); `euclid(k, n, shift)` turned.
- **`sin(n)`** — one cycle of a sine in n steps (a voice's waveform).
- **A root** is a bare grid: `&edo19 cycle=19` ([tuning.md](tuning.md)).

```cells
&major scan(2 2 1 2 2 2 1)
&tresillo scan(3 3 2)
&hits euclid(5, 12)
&wave sin(12) loop=220
```

## Picks and shifts

These read a braid *as written* or moved. They go where a braid is used — braids, `out`, and (shifts only) `over=`; `step=` and `map=` take whole cells.

- **`&t[i]`**, **`&t[a:b]`**, **`&t[a:b:step]`** pick from the braid *as it is turned*, Python-style: `&x[0]` first, `&x[-1]` last, `&x[1:3]`, `&x[:-1]`; `&x[::-1]` is the retrograde, `&x[::2]` every other. A pick keeps each token's modifiers and length. A pick is a fixed tap on a turning wheel: with `&key shift=2`, `&key[0]` is D and `&key[0] &key[4] &key[7]` D F♯ A; an entry that wraps climbs a lap (`&key[10]` is the C above). It follows the shift as it stands when the note sounds — a stepped key, a `free()` one — when the cell it picks from is plain numbers and is read in another cell's braid (in a mix a cell plays on its own clock, picked or not).
- **`&t[$i]`**, **`&t[$a:b]`** pick *as written*, whatever the shift: with `&key shift=2`, `&key[$0] &key[$4] &key[$7]` is C E G.
- **`&t[<<n]`**, **`&t[>>n]`** — &t shifted back / forward by n (default 1), on top of its own rotation; wrapped entries climb a lap. `&john[<<]` is the theme one unit behind; `over=&scale[<<]` reads one step lower. In `out` the brackets keep shifts apart from pitch arithmetic: `(&alto[<<] - 7) * &cello` — a bar behind, a fifth below.
- Slices rotate too, without the climb: `&x[-1:] &x[:-1]`.
- **`&x^n`** transposes a reference in place by n grid steps (after its tables): `&m^7`.
- **`shift=n`** rotates the braid by n (wrapped entries climb a lap).

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

- **`degree(&x, n)`** — &x moved n steps of its table: a degree up the scale (`degree(&x, -1)` one down, past the tonic into the octave below). Not `&x^n`, which moves grid steps after the table: over C major, `degree(&m, 1)` makes C D E into D E F, `&m^1` into C♯ D♯ F.
- **`inverse(&x)`** — &x mirrored round its table's first entry: inversion within the scale, its steps kept (C D E into C B A). An accidental is mirrored with its note.
- They nest, innermost first: `degree(inverse(&x), 4)` is 4 − each value, mirrored round the third degree; `inverse(inverse(&x))` is `&x`. Picks and modifiers work as on any reference: `degree(&x[::-1], 2)!2`.

```cells
&major scan(2 2 1 2 2 2 1)
&motif 0 1 2 4
&tune over=&major step=4 &motif degree(&motif, 1) inverse(&motif) degree(inverse(&motif), 4)
```

`degree(&x, k)` plays what a cell reading a shifted table plays (`&y over=&scale[>>k] &x`), without the cell. Mixes move pitch in semitones instead (`(&x + 12) * &lead`, [mix.md](mix.md)). The operators that may one day spell these shorter are decided together, in one pass (#10).

