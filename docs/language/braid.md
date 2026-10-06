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

- **`&t[i]`**, **`&t[a:b]`**, **`&t[a:b:step]`** pick from the braid *as written* (rotation ignored), Python-style: `&x[0]` first, `&x[-1]` last, `&x[1:3]`, `&x[:-1]`; `&x[::-1]` is the retrograde, `&x[::2]` every other. A pick keeps each token's modifiers and length.
- **`&t[<<n]`**, **`&t[>>n]`** — &t shifted back / forward by n (default 1), on top of its own rotation; wrapped entries climb a lap. `&john[<<]` is the theme one unit behind; `over=&scale[<<]` reads one step lower. In `out` the brackets keep shifts apart from pitch arithmetic: `(&alto[<<] - 7) * &cello` — a bar behind, a fifth below.
- Slices rotate too, without the climb: `&x[-1:] &x[:-1]`.
- **`&x^n`** transposes a reference in place by n grid steps (after its tables): `&m^7`.
- **`shift=n`** rotates the braid by n (wrapped entries climb a lap).

```cells-fragment
&canon [&theme * &lead, &theme[<<] * &lead, &theme[<<2] * &lead]
&back &theme[::-1]
```
