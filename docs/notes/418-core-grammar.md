# The core grammar: every form of the reference in four primitives

Date: 2026-11-04 · Status: done: the owner's answers of 2026-11-04 folded in, ruled as [decision 068](../decisions/068-the-core-grammar.md) (067 went to modular synthesis, #433); nothing in the language changes here, the follow-ups are #434, #438, #439, #440, #441 · Issues: [#418](https://github.com/yggi/cells/issues/418), part of [#51](https://github.com/yggi/cells/issues/51) (step 3, a minimal grammar) and on the v1.0.0 tracker [#26](https://github.com/yggi/cells/issues/26); the hypothesis is [multiscale.md](multiscale.md) (its Q4 and its disentangler inventory) and [10-language-pass.md](10-language-pass.md) §3 · Test: `src/engine/core.test.ts`

Before 1.0 freezes the language, which forms are its **core**, and which are **sugar** that rewrites into the core? The core is what a later version must keep meaning the same. Sugar can be respelled freely: Normalise writes one spelling of it, and Migrate carries a respelling across versions. The hypothesis is that four primitives generate the language, as union, intersection and difference generate a CSG solid:

- **shift with carry**: a shift across the edge of a block (an upbeat into the bar, a canon's entry, a melody stepping over the octave);
- **dilate**: a change of rate or length;
- **look up**: a value read through a table, or a cell by its name;
- **combine**: things at once (a chord, a mix, a product).

This note puts each of the reference's 113 forms (every section but *Parameters*) into one of three classes: core (which primitive), sugar (its rewrite, and whether it is exact today) or outside (what it is instead). `src/engine/core.test.ts` checks the sugar by S1 (`soundsIdentical`), each rewrite on the reference's own example.

## The answer in short

| class | rows | of which |
|---|---:|---|
| **core** | 46 | look up 10, combine 16 (8 of them the sorts), dilate 8, shift with carry 7, and 5 terminals (a cell, a number, a fraction, a rest, a number in a mix) |
| **sugar** | 45 | **45 exact by S1**, checked in 61 rewrites (43 in 59 when the note was written; `off` and `pitch=` since #434 and #439) |
| **outside** | 22 | inert 8 (the graph's and the style's data), sources 7 (`free()`), chance 4, ramp 2 (`map=lin`, `map=adsr`), a voice's value 1 (`oneshot`) |

What it says:

1. **The four hold.** Every form that makes or moves a note is core in one of the four, or sugar over them, except two families: the **ramp** (a value moving continuously between steps) and **chance**.
2. **Dilate covers all of the mini-notation's time.** `[a b]`, `<a b>`, `x*n`, `x!n`, `_` and `x(k,n,r)` each rewrite exactly into `@n` and `/n` on a finer step. Only `@` and `/` are core (decision 027's Strudel alignment, read as a grammar).
3. **Every generator is sugar.** `scan`, `euclid`, the waves, `scale`, `fifths`, `meter` and `spell` each write a table or a braid that could be written out by hand, and S1 confirms all seven.
4. **Every unit is sugar of a number.** `bpm`, `hz`, `min`, `h`, `d`, `wk`, `k`, a note value (`16n`, `4n.`, `1m`), `pulse`, `beat` and `&m:8n` are each a dilate of a clock, written as `step=&bar*k` or as a rate (checked in 4/4 and 3/4).
5. **The ramp is the fifth primitive.** `map=lin`, `map=adsr` and the soft-time parameters (`swing=`, `wow=`, `varispeed=`, a read head's `at=`) are one operation: a value or a time moved continuously between steps. Steps can't spell it. A "shift by a cell's values" would need the cell to move continuously, which is a ramp again.
6. **Chance and `free()` are sources, not operations.** They are border cells like `&bar` and `&key`: a seeded stream and a performer's hand. What reads them is look up (`[a|b]`, a pick by a chance index) or combine (`x?`, a product with a chance gate).
7. **Two claims the reference makes are not exact today.** First, `loop=r` "is `step=r·k`", but a `loop=` line bends and starts no notes. Second, `pitch=&x` behaves as a sum in the mix, and the events agree, but S1 reads `pitch=` into the voice's sound. Separately, S1 plays a cell switched `off`, which is a bug, filed as [#434](https://github.com/yggi/cells/issues/434).

## The primitives as a grammar

```text
piece    := cell*
cell     := &name attribute* braid                      the carrier: a name bound to a braid
braid    := step*
step     := terminal
          | shift(step)      n#  ^n  ^$n  [<<n]  shift=  stride=  cycle=
          | dilate(step)     @n  /n  inverse  step=r  step=&x  &x*n/d  loop=
          | lookup(step)     &x  &x[i]  over=  map=  a section, a role
          | combine(step*)   [a, b]  a * b  a + b  env=  laps=  the card
          | ramp(step)       map=lin  map=adsr  swing=  wow=  varispeed=  at=     (the fifth: decision 068 to say)
terminal := number | n/d | ~ | &name                     and the sources: free(…), chance (x?, [a|b], seed=)
```

These are the laws the S1 checks lean on, each an equation in the four. `x` is a step, and `k` and `n` are numbers.

- `x _` = `x@2` · `x!n` = `x x … x` · `x*n` = `[x x … x]` · `[a b]` at step `r` = `a b` at step `2r` (each `@` scaled) · `<a b c>` = `[a b c]/3`
- `&x` spliced = its steps written in · `&x[a:b:s]` = its picks · `&x[slot]` = `&x[$i]` · `&( … )` = a named cell
- `[a, b]` in a step = a mix of one line per voice (the chord *is* combine, at the step's scale) · `play=&t &v` = `[&t * &v]`
- `step=pulse` = `step=&bar` · `step=16n` = `step=&bar*4` (in 4/4) · `step=cycle(&x)` = `step=&x/k` for `k` steps · `NNbpm` = `NN/60` per beat
- `scan(i …)` = its running totals · `map=ed(r)` = `map=ratios r^(k/n) …` · `map=edo` = `map=ed(2)` · `map=db v` = `map=amp 10^(v/20)`

## The table

**Class**: C = core, with its primitive (shift, dilate, look up, combine, terminal); S = sugar; O = outside. **S1**: ✔ means the rewrite sounds identical in `core.test.ts`. "spelling ✔" means a core or outside row holds two spellings of one form, and the test checks them alike. ✘ means not exact, with the reason. — means not checked. The rewrites are cells text wherever they can be.

### Lines (8)

| # | form | class | primitive, or rewrite | S1 |
|---|---|---|---|---|
| 1 | `&name …` | C terminal | the cell: a name bound to attributes and a braid; every primitive acts on one | — |
| 2 | `&name label="…"` | O inert | a note in the graph; it plays nothing. Keep | — |
| 3 | `off` | S | the line deleted, with every entry that plays it | ✔ (since [#434](https://github.com/yggi/cells/issues/434): S1 plans with `r.off`, as the host does) |
| 4 | `oneshot` | O a voice's value | a note's length set by its envelope: a parameter, written as a word | — |
| 5 | `# …` · `// …` | S | nothing | ✔ |
| 6 | `… +` (continued) | S | the one line | ✔ |
| 7 | `&x from id …` | S | the fragment's lines written in (decision 065) | ✔ (`gm_kit`'s `&bd`, `&sd`) |
| 8 | `&sections step=&bar &a &b` | C look up | a selector reads a table of names; its restart shifts the part's time to its entry | — |

### Steps (12)

| # | form | class | primitive, or rewrite | S1 |
|---|---|---|---|---|
| 9 | `n` | C terminal | a number; a note name is its number off any table, and over one it is a pitch from the root | spelling ✔ (`C E G C5` = `0 4 7 12`) |
| 10 | `n#` · `nb` · `ns` · `nf` | C shift | one step on the grid below, after look up | spelling ✔ (`6s 3f` = `6# 3b`) |
| 11 | `n/d` | C terminal | a number | — |
| 12 | `~` | C terminal | combine's empty | — |
| 13 | `_` | S | `0 _ _ 2 4 _` = `0@3 2 4@2` | ✔ |
| 14 | `=` | S | the base's step written: `base=&subject^$7 =!3 12@2` = `7 9 11 12@2 14` | ✔ |
| 15 | `[a, b, c]` | C combine | things at once, in a step | spelling ✔ (= a mix of one line per voice) |
| 16 | `[a b c]` | S | dilate on a finer step: `0 [2 4] [5 [7 9]] [0 2@2]` = step×12 `0@12 2@6 4@6 5@6 7@3 9@3 0@4 2@8`; on a tap, the chain `step=8n*2` (decision 069); core dilate where the swing doesn't hold the finer level (thirds of a swung eighth, #441) | ✔ ×2 |
| 17 | `[a\|b\|c]` | O chance | a pick by a seeded index: look up over a chance source | — |
| 18 | `<a b c>` | S | `[a b c]/3`: `0 <2 4 7> 4 <5 [7 9]>` = `0 [2 4 7]/3 4 [5 [7 9]]/2` | ✔ |
| 19 | `&x` | C look up | a cell by name, its steps spliced in its slot | spelling ✔ (= written in) |
| 20 | `&voice` (stepped) | S | a mix of one line per voice: `&bd ~ &hh [&bd, &sd] &hh*2 ~` = `[&b * &bd, &s * &sd, &h * &hh]` | ✔ |

### Modifiers (7)

| # | form | class | primitive, or rewrite | S1 |
|---|---|---|---|---|
| 21 | `x!n` | S | n copies | ✔ |
| 22 | `x*n` | S | `[x x … x]` | ✔ |
| 23 | `x@n` | C dilate | the step's length times n | — |
| 24 | `x/n` | C dilate | the step's part stretched over n laps | spelling ✔ (`[0 2]/2` = `<0 2>`) |
| 25 | `x(k,n,r)` | S | a subsequence of hits: `&bd(3,8)` = `[&bd ~ ~ &bd ~ ~ &bd ~]`; `<0 [2 4]>(5,8)` hits play what the step holds as each begins | ✔ ×2 |
| 26 | `x?` · `x?p` | O chance | a product with a seeded gate | spelling ✔ (`x?` = `x?.5`, and `x?p` under `chance=p`) |
| 27 | `&x:0:gain` | S | a volume line in the product: `&hh:0:.4` = `&hh * &acc`, `&acc map=amp … .4 …` | ✔ (not as `* .4`: the hit's gain is a level, not a mix gain) |

### References (9)

| # | form | class | primitive, or rewrite | S1 |
|---|---|---|---|---|
| 28 | `&name` | C look up | a cell by name | — |
| 29 | `&name[i]` | C look up | one entry, as turned (`[$i]` as written) | spelling ✔ (`[-1]` = `[3]` of four) |
| 30 | `&name[a:b:s]` | S | its picks written: `&motif[1:3]` = `&motif[1] &motif[2]` | ✔ |
| 31 | `&name[slot]` | S | `&env[sustain]` = `&env[$2]` | ✔ |
| 32 | `&name[<<n]` · `[>>n]` | C shift | rotation with carry: the helix climbs | spelling ✔ (`[<<]` = `[<<1]`) |
| 33 | `&name^n` · `degree(&name, n)` | C shift | values plus n, before look up | spelling ✔ ×2 (`^n` = `degree()`, and written out) |
| 34 | `&name^$n` | C shift | n grid steps, after look up | spelling ✔ (written out) |
| 35 | `inverse(&name)` | C dilate | values times −1 before look up (a reflection is a dilate by −1) | spelling ✔ (written out) |
| 36 | `&( … )` | S | a named cell | ✔ |

### Generators (7)

| # | form | class | primitive, or rewrite | S1 |
|---|---|---|---|---|
| 37 | `scan(i …)` | S | its table written: `scan(2 2 1 2 2 2 1)` = `0 2 4 5 7 9 11` (read over the 12, which carries its octave; `cycle=` counts laps, #75); `1!4` and `geo(…)` written out | ✔ ×3 (a scan as a meter: steps of uneven length, `@`, not checked) |
| 38 | `euclid(k, n)` | S | its steps: `euclid(5, 16, 2)` = `~ ~ 0 ~ ~ 0 …` | ✔ ×2 |
| 39 | `sin(n)` … `square(n)` | S | its n values written | ✔ ×4 (stepped slowly, not at audio rate) |
| 40 | `scale(name)` | S | a scan over a key (decision 002): `scale(minor, D)` = `&k shift=2`, `over=&k scan(2 1 2 2 1 2 2)`; `"D:minor"` is the same | ✔ ×3 |
| 41 | `fifths()` | S | `0 7 2 9 4 11 6 1 8 3 10 5`; `fifths(G)` = `fifths(1)` | ✔ ×2 |
| 42 | `meter("sig")` | S | its levels written: `meter("4/4", 2)` = `meter("*.+.+.+.")` | ✔ |
| 43 | `spell(…)` | S | its picks and rests written: `&keys[9] ~ &keys[6] ~ …` | ✔ |

### free() (5)

| # | form | class | primitive, or rewrite | S1 |
|---|---|---|---|---|
| 44 | `free(v, lo..hi)` | O source | a performer's hand; as text it plays `v` | spelling ✔ (= `v`) |
| 45 | `free(marking)` | O source | as text it plays its range's middle (andante: 92 bpm) | spelling ✔ |
| 46 | `free(v, lo..hi, "names")` | O source | as 44 | — |
| 47 | `free(0 2 4 ~ …)` | O source | as text it plays as written | spelling ✔ |
| 48 | `free("text")` | O source | as text it plays as written | spelling ✔ |

### step= and loop= (16)

| # | form | class | primitive, or rewrite | S1 |
|---|---|---|---|---|
| 49 | `step=r` · `loop=r` | C dilate | a rate. `loop=r` "is `step=r·k`": not on a line, where `loop=` bends and starts no notes | ✘ (`&tune loop=1 0 2 4` plays nothing; `step=3` plays) |
| 50 | `loop=NAME` | S | its number: `loop=C4` = `loop=261.6255653005986` | ✔ |
| 51 | `step=&x` | C dilate | a step per step of a clock | — |
| 52 | `step=cycle(&x)` | S | `step=&x/k`, k its steps | ✔ |
| 53 | `step=&x*n/d` | C dilate | a rate of a clock | spelling ✔ (`*3/2` = `*1.5`) |
| 54 | `step=pulse` · `beat` · `*k` | S | `step=&bar`, `&bar*k` (4/4); compile writes the pulse instead (`pulse*k`), since 040 retired a line on the meter cell's own steps (decision 069) | ✔ ×3 (in 7/8 the beats are unequal: a look up of the meter's levels, not checked) |
| 55 | `step=16n` · `8t` · `4n.` · `1m` | S | `&bar*4`; `4n.` = `&bar*2 0@3 0@3 0@2` (cut at the bar line); `1m` = `cycle(&bar)`; compile writes `pulse*k` (`16n` = `pulse*4` in 4/4, decision 069) | ✔ ×3 |
| 56 | `step=&m:16n` | S | `&m:8n` = `&m*2` (3/4) | ✔ |
| 57 | `step=free(…)` | O source | as 44 | spelling ✔ (row 44's check) |
| 58 | `nbpm` | S | per second: `scan(4 4 4 4) step=84bpm` = `step=1.4` | ✔ |
| 59 | `nhz` | S | the number | ✔ |
| 60 | `nmin` | S | n/60 | ✔ |
| 61 | `nh` | S | n/3600 | ✔ |
| 62 | `nd` | S | n/86400 (`anchor=` kept) | ✔ |
| 63 | `nwk` | S | n/604800 | ✔ |
| 64 | `nk` | S | n·1000 | ✔ |

### map= (13)

| # | form | class | primitive, or rewrite | S1 |
|---|---|---|---|---|
| 65 | `map=amp` | C look up | a value read as a volume | — |
| 66 | `map=lin` | O ramp | a value moving from step to step | — |
| 67 | `map=db` | S | `map=amp` of 10^(v/20) | ✔ |
| 68 | `map=adsr a d s r` | O ramp | four ramps, restarted each note | — |
| 69 | `map=sample` | C combine | the card: a chord of channels | — |
| 70 | `map=midi` | C combine | a chord of MIDI channels | — |
| 71 | `map=edo` | S | `map=ed(2)` (decision 003) | ✔ |
| 72 | `map=ratios` | C look up | a table of ratios | — |
| 73 | `map=style` | O inert | a point in style space; it doesn't sound | — |
| 74 | `map=role` | C look up | a name read as the gates that play it (decision 063) | — |
| 75 | `map=ed(r)` | S | `map=ratios r^(0/n) … r^(n/n)` | ✔ |
| 76 | `map=midi(c)` | S | `map=midi ~!(c−1) …` | ✔ |
| 77 | `map=&table` | C look up | a value read through a table | — |

### Attributes (19)

| # | form | class | primitive, or rewrite | S1 |
|---|---|---|---|---|
| 78 | `over=` | C look up | the table its numbers read; `over=scale(…)` is a named cell | spelling ✔ |
| 79 | `base=` | S | the copy written out: `base=&subject =!3 3@2` = `0 2 4 3@2 7` | ✔ |
| 80 | `step=…` | C dilate | as 49 | — |
| 81 | `loop=…` | C dilate | as 49 | ✘ as `step=` |
| 82 | `shift=n` | C shift | a rotation with carry | — |
| 83 | `stride=n` | C shift | a shift that moves with each step | — |
| 84 | `map=…` | C look up | as 65 to 77 | — |
| 85 | `show=` | O inert | how it's drawn | ✔ (removed: the same) |
| 86 | `label=` | O inert | | ✔ |
| 87 | `env=&e` | C combine | a product, its time restarted at each note | — |
| 88 | `pitch=&x` | S | a sum in the mix: `pitch=&vib` = `[(&t + &vib) * &lead]` | ✔ (since [#439](https://github.com/yggi/cells/issues/439): S1 hears `pitch=` in the bends, not in the voice's sound) |
| 89 | `cycle=n` | C shift | where the carry wraps | — |
| 90 | `size=` | O inert | | ✔ |
| 91 | `laps=n` | C combine | a product with a window: it ends | — |
| 92 | `chance=` | O chance | what a bare `x?` reads | — |
| 93 | `seed=` | O chance | which stream | — |
| 94 | `tags=` | O inert | | ✔ |
| 95 | `about=` | O inert | | — |
| 96 | `style=` | O inert | a style point, read by picks (`&style[artic]`); its range `a..b` is a ramp | — |

### Sorts (8)

Rows 97 to 104 are `signal` ×4 (a voice, a mix, a pattern through a kit, a read head), `wave`, `volume`, `plain` and `pitch`. They are **C combine**: not forms, but combine's types, which say what `+` and `*` do with each operand (`mix.md`, the algebra). A primitive with types is still one primitive: S1 can't check a sort, only the products that use it.

### Mixes (6)

| # | form | class | primitive, or rewrite | S1 |
|---|---|---|---|---|
| 105 | `[a, b, …]` | C combine | at once | — |
| 106 | `p * s` · `v * s` | C combine | a product | — |
| 107 | `a + b` · `a - b` | C combine | a sum. `a - b` = `a + -b` | spelling ✔ |
| 108 | `n` | C terminal | combine's unit (0 in a sum, 1 in a product) | — |
| 109 | `free(v, lo..hi)` | O source | as 44 | spelling ✔ |
| 110 | `( … )` | S | distributed: `&t * (&a + &b) * .5` = `&t * &a * .5 + &t * &b * .5` | ✔ |

### Gates (3)

| # | form | class | primitive, or rewrite | S1 |
|---|---|---|---|---|
| 111 | `play=&x` | S | `[&x * &voice]` (decision 023) | ✔ |
| 112 | `level=&a*&b*n` | S | the product's factors | ✔ |
| 113 | `[&a, &b]` (a gate's chord) | S | `[&x * &a, &x * &b]` | ✔ |

### Parameters (61, one row)

The 61 parameters are a voice's (or a physical cell's) **values**, not grammar: each is a number a sound reads. Some are more than a value, because they read a cell:

- **look up or combine** (a cell read as a moving factor: `lo..hi * &a * &b`): `lpf=`, `lpq=`, `hpf=`, `hpq=`, `room=`, `delay=`, `index=`, `legato=`, and `s=a..b * &x`; also `fm=`, `couple=`, `excite=`, `write=` and `play=` (a read head), which read a cell's sound, and `level=` (row 112).
- **dilate** (a clock read as a length): `delaytime=&clock/n`, `length=`, `at=`, `beat=`, `pulse=`.
- **shift with carry**: `restart=` (a part's time on re-entry), `anchor=` (where a day clock stands).
- **the ramp (the fifth)**: `swing=`, `wow=`, `varispeed=`, `belt=` / `damping=` / `slip=`, `wander=`, and a read head's `at=`: soft time, a time moved continuously.
- **outside**: `law=` (the notes computed by a law, not written) and `scope=` / `fold=` / `bins=` / `channels=` (display).

## What doesn't fit, and what to do with it

| family | rows | verdict |
|---|---|---|
| **ramp** | 66 `map=lin`, 68 `map=adsr`, and the soft-time parameters | **a fifth primitive.** A value or a time moved continuously between steps, which no rewrite into steps makes exact. A "shift by a cell's values" (multiscale's other reading) is a ramp again, because the cell must move between steps. Keep it, and name it in decision 068 |
| **chance** | 17 `[a\|b]`, 26 `x?`, 92 `chance=`, 93 `seed=` | **a source, not a primitive.** A seeded stream at the border, read by look up (a choice is a pick by a chance index) or by combine (`x?` is a product with a chance gate). Keep |
| **sources** | 44 to 48, 57, 109 `free()` | **a source, not a primitive**, like `&bar` and `&key`: as text, each plays its value (S1 ✔). Keep |
| **inert** | 2, 73, 85, 86, 90, 94, 95, 96 | the graph's and the style's data, outside the sound. Keep: Normalise and S1 already pass them through |
| **a voice's value** | 4 `oneshot` | **retire as a line word** before 1.0: a parameter of the voice (`oneshot=1`, or an `env=` that says it), so a line has only names, attributes and a braid |

The inexact claims:

- **`loop=` as `step=`** (rows 49, 81). The rate is exact; what differs is how the line is read. [`loop=` on a line](#loop-on-a-line-question-3) discusses it.
- **`pitch=`** (row 88). The bends are identical to a sum in the mix. If decision 068 calls `pitch=` sugar, S1 should read a voice's `pitch=` as its bends already do, and not as the voice's sound; otherwise `pitch=` is core combine.
- **`off`** (row 3). S1 plans without the text's `off` set, so it hears a cell switched off. That is a bug, not a question: [#434](https://github.com/yggi/cells/issues/434).

## How it meets #27, #151 and #179

- **Normalise** ([#27](https://github.com/yggi/cells/issues/27)'s table, decision 049) writes one spelling of each sugar family. This note gives that table its rows: the 45 sugar rows are where a canonical form is chosen, and the 46 core rows are what every spelling must keep meaning. The proposal is that Normalise writes the **short** spelling (`_` → `@n`, `x!n`, `<a b>`, a unit, a generator), never the core expansion. The core is the meaning, not a spelling to write.
- **#151**'s canonical forms are the sugar rows that fit twice (a step written as `[a b]` or with `@`, a chord or a mix of lines, a gate or a product). Each pair is one S1 check in `core.test.ts`.
- **#179**'s grid of shifts ({relative, `$` absolute} × {time, degree, grid}) is the shift primitive's seven rows: 10, 32 to 34, 82, 83 and 89. The grid's missing cells (`$` on a rotation, an accidental on a reference) are gaps in one primitive, not new forms.

## The owner's answers (2026-11-04)

1. **The ramp is the fifth primitive.** Accepted.
2. **Chance and `free()` are sources**, not primitives. Accepted.
3. **`loop=` on a line**: "loop: B, maybe C later". B: the reference narrowed (#438); C may follow if the ramp gets a spelling. See [below](#loop-on-a-line-question-3).
4. **`oneshot` is retired as a line word** before 1.0, and becomes a voice's parameter, with a migration. Accepted.
5. **`pitch=` is sugar** of a sum in the mix, and S1 is taught to read it so. Accepted.
6. **Normalise and a compile tool**: "we have to see what goes into normalize (IMHO it should stay on the human-readable added sugar level) and what might move into a 'compile' tool: de-sugar, minify names (we should be immune to alpha-substitution, right?), fold to most compact minimal grammar form". See [below](#normalise-and-a-compile-tool-question-6).

### `loop=` on a line (question 3)

What a `loop=` line does today, measured:

- **Its rate is exactly `step=r·k`.** `&vib loop=5 0 .1 -.1` bends every 1/15 s, which is three steps turned five times a second.
- **It starts no notes.** It is read as a signal: in a sum it bends the notes another line starts (a vibrato), against a sound it is a waveform, and on a voice it is a frequency.
- **`step=` in its place starts notes.** In `[(&theme + &vib) * &lead]`, `&vib step=15 0 .1 -.1` plays 15 notes in a second where `loop=5` plays the theme's 2. Every vibrato and LFO would retrigger the notes it bends.

So `loop=` and `step=` differ in **what the line is**, not in its rate. A `step=` line is a source of onsets. A `loop=` line is a signal, held from value to value with no onsets, which is the ramp's job now that the ramp is a primitive. Three ways to settle it:

| option | what changes | cost |
|---|---|---|
| **A. `loop=` starts notes**, as `step=r·k` | the reference's claim becomes true | every vibrato, LFO and `loop=` pitch line in the frontends' pieces retriggers its notes; they would need a new spelling for a signal first. Not viable alone |
| **B. Narrow the reference** (recommended) | `loop=r` has the rate of `step=r·k` and reads its braid as a signal: dilate, then a ramp that holds each value with no onsets. In the table, row 49 is "core: dilate composed with ramp", and the claim is reworded | nothing plays differently; one sentence of `values.ts`'s table and the reference regenerated |
| **C. Split rate from reading** | `loop=` becomes pure sugar of `step=r·k`, and the signal reading moves to its own spelling (a `map=` or the ramp's own form) | a migration for every `loop=` line; worth it only if the ramp gets a spelling of its own anyway (decision 068) |

B keeps every piece as it sounds and states the grammar honestly: `loop=` is dilate composed with the fifth primitive. C is B's later step, if the ramp gets its own spelling. A breaks too much on its own.

### Normalise and a compile tool (question 6)

The owner's split, set against decision 049's four tools:

- **Normalise stays at the human-readable sugar level.** It writes one spelling per sugar family, the one a person writes (`_` as `@n`, a unit, a generator), and keeps every cell, name, step and reference (049). It never de-sugars. That is 049's Normalise as it stands, with this note's 45 sugar rows as #27's table.
- **A compile tool** (new) writes the core form: (a) **de-sugar** every sugar row into its core rewrite, as `core.test.ts` writes it; (b) **minify names**; (c) **fold** to the most compact form in the minimal grammar. (c) is close to Shorten's job (049: a more compact structure, measured over the normal form). The difference is that compile measures over the *core* form, and nobody reads the result. Shorten could be compile's last step, or compile could be Shorten run after de-sugaring. That is scoped on #441, with its own decision.
- **Is the language immune to alpha-substitution?** Yes for a text's own names, with one exception:
  - S1 reads every voice by what it sounds like, not by its name (decision 057, #186). A text with its own names renamed sounds identical, and decision 050's ladder has that as its rung E2 (`identicalUpToRenaming`, `src/engine/identity.ts`).
  - The main meter and the main key are found by structure, not by name (`CompileResult.mainMeter`, `mainKey`), so `step=pulse` doesn't care what the bar is called.
  - **The exception is the interface names** (decisions 059, 060: `&bar`, `&tempo`, `&key`, `&tonic`, `&harm`), and any name a text uses without defining it (a fragment's, a host's). E2 already keeps these as written. A fragment reads them and a frontend addresses them, so renaming one changes what the piece plugs into, though not how it sounds alone. Compile's minifier renames everything else and keeps those, or carries a map back.

## Decision 068, as accepted

1. **The core** is the 46 rows marked C: four primitives (shift with carry, dilate, look up, combine), the terminals, and combine's sorts. A later version keeps what they mean.
2. **A fifth primitive, the ramp**, holds `map=lin`, `map=adsr` and soft time (`swing=`, `wow=`, `varispeed=`, a belt, a read head's `at=` and `wander=`). It is core as well. *(Accepted.)*
3. **Sources** (`free()`, chance and `seed=`) and **inert data** (labels, notes, `show=`, `size=`, `tags=`, `about=`, styles) are outside the grammar and kept. *(Accepted.)*
4. **The sugar** is the 45 rows marked S, `pitch=` among them. S1 learns to read a voice's `pitch=` as the sum it is *(accepted)*, and to plan with `off` (#434). Each exact rewrite stays in `core.test.ts`, so a change that breaks one fails there.
5. **Normalise writes sugar, not the core.** It stays at the human-readable level, one spelling per sugar family. Writing the core (de-sugar, minify the names but the interface names, fold) is a compile tool's job, to be scoped on its own issue.
6. **Retire before 1.0**: `oneshot` as a line word; it becomes a voice's parameter, with a migration. *(Accepted.)*
7. **`loop=`**: B, the reference narrowed: dilate composed with the ramp (#438); C maybe later. *(Accepted.)*

Written as [decision 068](../decisions/068-the-core-grammar.md). Its follow-ups: #434 (S1 and `off`), #438 (`loop=`'s wording), #439 (S1 and `pitch=`), #440 (`oneshot`), #441 (the compile tool).
