# The compile tool: de-sugar into the core, minify names, fold

Date: 2026-11-05 · Status: done: the owner's answers of 2026-11-05 folded in, ruled as [decision 069](../decisions/069-compile-writes-the-core.md); the follow-ups are #477, #481 and the tool, #482 · Issues: [#441](https://github.com/yggi/cells/issues/441), from [#418](https://github.com/yggi/cells/issues/418) (question 6) and on the v1.0.0 tracker [#26](https://github.com/yggi/cells/issues/26); the core is [decision 068](../decisions/068-the-core-grammar.md), its rows [418-core-grammar.md](418-core-grammar.md) · Probe: `tools/compileprobe.ts` (and its test)

Decision 068 divides the work of writing a piece's form between two tools. Normalise stays at the sugar level, and a **compile** tool writes the core: it de-sugars, minifies the names, and folds to the most compact core form. It is meant for a machine reader: a hash, the learned layer, a comparison of two pieces. This note scopes compile. It answers #441's four questions with a probe that de-sugars every example, family by family, each rewrite checked by S1 against its source and measured by structure (decision 049's measure, as written).

## The probe

```
node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/compileprobe.ts [--fold] [<key>...]
```

It prints one JSON row per example:
- the structure before;
- each family alone: the structure after, and S1;
- all families in order: the structure after, S1, and whether a second pass changes anything;
- the rows still in the text that need context;
- minified: the characters before and after, and S1;
- with `--fold`: Shorten over the result, and a core fold (below).

S1 listens to the first minute (`SAMENESS_SECONDS`), so the longest pieces stay a probe. All 83 examples, 2026-11-05, `main` at 462f94d.

A **family** is one sugar row of the 418 note, or a few that rewrite alike, written as a function of the text alone. It rewrites every place it finds. A row whose rewrite needs what the text *means* is counted where it is still written, and not rewritten.

## 1. De-sugar: which rows are mechanical

### The mechanical families: every one exact on every example

| family | rows (418 note) | examples it rewrites | S1 | structure, Σ change |
|---|---|---|---|---|
| comments | 5 `#` `//` | 81 | ✔ all | 0 (names and comments are free) |
| `from` | 7 | 64 | ✔ all | **+1,556** (the fragment's lines written in: `expand`) |
| units | 58–64 `bpm` `hz` `min` `h` `d` `wk` `k` | 24 | ✔ all | 0 (a leaf for a leaf) |
| note names | 50 `loop=NAME` | 79 | ✔ all | 0 |
| unnamed cells | 36 `&( … )` | 69 | ✔ all | +6 (an unnamed cell is a cell already) |
| repeats | 21 `x!n` | 36 | ✔ all | **+813** (n copies) |
| scans | 37 `scan(i …)` as a table | 22 | ✔ all | 0 |
| **all, in order** | | 83 | **✔ all 83** | 10,612 → **13,040** (×1.23) |

Every family, and all of them together, is **idempotent**: a second pass changes nothing on any example.

Three things the probe found that a rule has to know, each a near miss:

- **A number has to be written in full.** S1 hears `loop=261.625565301` (12 digits) as a different note from `loop=C4`, and hears 17 digits as the same note. The core spelling of a note name is the double as JavaScript prints it.
- **A quoted string is not code.** A label that says "`&( … )` is a cell without a name" (*Voice*) mustn't be lifted. Strings are masked: the label stays as written.
- **A slider keeps its unit.** `step=free(124bpm, 112..132)` written in hertz plays differently (*Electro swing*): the performer moves the slider in its unit, so the unit belongs to its interface, not its sugar. The units family leaves a `free(…)` as written.

### The rows that need context

Counted on the de-sugared text: in how many examples each row is still written.

| row | examples | why it needs more than the letters |
|---|---|---|
| taps, 54–56 `step=16n` `pulse` `beat` | 73 | a tap is a level of the meter it reads: written as its pulse with a chain (`16n` = `pulse*4` in 4/4, `pulse*2` in 7/8), so it needs the meter's denominator; `beat` is a look up of its levels (in 7/8 they are unequal). Not `&bar*k`: decision 040 retired the meter cell's own steps as a written form |
| meters, 42 `meter("sig")` | 54 | a signature's levels are its grouping rule (#17, `meter("2+2+3")`): written out, they are its table |
| subsequences, 13 16 18 22 25 `_` `[a b]` `<a b>` `x*n` `x(k,n)` | 39 | dilate on a finer step: the line's `step=` changes with them, and a tap's finer step is the meter's next level, or none |
| sliders, a unit in `free(…)` | 39 | above: the unit is the performer's |
| keys, 40 `scale(name)` | 26 | a key is a mode read from the library, and a tonic: two cells |
| meter scans, 37 on a stepped line | 25 | a scan with a `step=` is a meter: its numbers are its steps' lengths (`@`), and what a tap reads of it are its levels |
| `pitch=`, 88 | 20 | a voice's `pitch=` joins every product the voice is in: the mix rewritten, a sum in each (#439) |
| levels, 27 `&x:0:g` | 17 | a hit's gain is a volume line in the product, a line of its own stepped as the braid |
| unit reads, 21 `x!n` | 11 | `&a!2` is one unit and `&a &a` two: a cell read by a pick or a rotation (*Canon*'s `&john[<<]`) counts them. Found by the probe: the repeats family leaves those cells |
| gates, 111–113 `play=` `level=` | 10 | a gate is a set of products: each receiver times its notes and its levels, written into the card's mix |
| copies, 14 79 `=` `base=` | 2 | the parser writes them already (`parser/base.ts`): mechanical, but it needs the base's text |

The de-sugarer runs over a compiled text, not over letters. Six of these rows the compiler resolves already, and compile can print what it resolved: taps, meters, keys, copies, meter scans and levels. Two need the mix rewritten: `pitch=` and gates. The subsequences need a line's step and its finest grid at once, which is the one rewrite with a choice in it (below).

Only 5 of 83 examples are fully in the core after the mechanical families: *Oscillator*, *Tone*, *Semitones*, *Two voices* and *DTMF*.

**The choice in a subsequence**, measured after the owner asked to discuss it (2026-11-05). The first proposal, the meter's next level and else `&bar*k`, didn't hold: `&bar*k` taps the meter cell's own steps, which decision 040 retired, and a note value fails in 7/8, where halves of unequal beats are none. The chain on the line's own tap does hold: `step=8n 0 [2 4] 5 7` is `step=8n*2 0@2 2 4 5@2 7@2`. Checked by S1:

| written | `T*L` | a note value |
|---|---|---|
| 4/4, `step=8n 0 [2 4] 5 7` | `8n*2` ✔ | `16n` ✔ |
| swung eighths, `step=4n 0 [2 4] 5 7` | `4n*2` ✔ | `8n` ✔ |
| 4/4, `[2 4 5]` in an eighth | `8n*3` ✔ | `16t` ✔ |
| 7/8, `step=beat 0 [2 4] 5`, straight or swung | `beat*2` ✔ | `8n` ✘, `pulse*2` ✘ |
| `legato=16n:.5,8n:.9`, `step=8n 0 [2 4] 5 7` | ✘; ✔ with the line's `legato=.9` stated | `16n` ✘ |
| swung eighths, `[2 4 5]` in an eighth or a quarter | ✘ | `16t` ✘, `8t` ✘ |

The last row is the one no tap says. A subsequence's parts are placed through the swing (#121), so the thirds of a swung eighth bend with it. A tap of a division the swing doesn't hold is even within its beat, by design ("`8t` under swung eighths stays straight", time.md). The owner chose (a): there, `[ ]` stays in the core, as dilate inside a step, the primitive itself. The other options were (b), a tap placed through the swing too, which would change every swung piece with a triplet line, and (c), compile leaving the sugar.

## 2. Minify: names are not free

The owner's question: "we should be immune to alpha-substitution, right?" Not today. The probe renamed every name a text defines to `a`, `b`, … (the interface names and the names it uses but doesn't define kept, as #441 asks). **13 of 83 examples changed their sound**, for two reasons:

- **Draws are keyed on a name.** A chance draw (`x?`, `[a|b]`) is keyed on `seed|cell|lap|step` (`realize.ts`, decision 031), and the cell is the line that plays the draw. In *Focus*, `&arp &a1!8 …` plays `&a1`'s `9?`, so renaming `&arp` changes what is drawn. Shorten knew this for its merges ("chance keys on names", `shorten/same.ts`), but nothing else does.
- **A drum's name is its MIDI note** (decision 054). On a MIDI card, `&sd` sends 38; renamed, it sends the next free note from 36 (*MIDI out*).

With those kept (a drum's name; a cell that draws, or splices one that does, transitively), minify keeps S1 on all 83 and saves 12 % of the characters (112,621 → 99,305). That is little, because names are short already. Structure is unchanged, since names are free in the measure.

So rung E2 (`identicalUpToRenaming`, decision 050) is wider than S1. Two texts E2 says are one can sound different, if they draw or send drums. Two ways out:

- **(a) Compile keeps those names** (the probe's rule). Cheap, and nothing changes how a piece sounds. But a hash over the compiled text then sees a name, and two pieces that differ only in a drawing cell's name hash differently.
- **(b) A draw is keyed on what the cell is, not its name:** its place in the canonical order, or its text's hash. Every piece that draws would then draw differently once, so the event snapshots of the chance examples move: a change to how pieces sound, the owner's call, with no Migrate rule possible (a draw has no old spelling). Drum names stay meaningful either way: on a MIDI card, a name is a note by design. **The owner's ruling: (b)**, keyed on the cell's content ([#481](https://github.com/yggi/cells/issues/481)); until it lands, minify keeps (a).

## 3. Fold: compile's fold is not "de-sugar, then Shorten"

Shorten over the de-sugared text (`shortenAll`), all 83: 13,040 → 12,037. But **121 of its steps are runs**: it writes `!n` back, which is sugar. It also takes the respellings (aliases, fractions, progressions). Shorten measures structure, and the sugar is often the smaller structure: `0!8` is one leaf, its eight copies eight. So Shorten undoes the de-sugaring wherever the sugar is smaller.

The probe found something worse along the way: **two of Shorten's results don't play the same** (*Pachelbel*, *Baustelle*). Shorten checks no rewrite by S1. Each rule is trusted to check itself, and two don't:
- `runs` counts `~ ~` as `~!2` in a cell that a pick reads by its units (the unit-reads case above);
- `same` merges two alike volume cells that sit in two steps of a mix braid, so the mix hears the two entries as one.

The first also shows on a written piece: `&j step=8 &a &a &b &b`, read as `&j[<<]`, is offered `&a!2 &b!2`, which plays differently. Filed as [#477](https://github.com/yggi/cells/issues/477).

**A core fold:** Shorten's rewrites that stay in the core (`phrase`: a phrase as one cell used at its places, moved by `^$n`, `^n`, `[<<]` or backwards; `same`: alike cells as one; `default`: a stated default dropped), the best each round, each checked by S1. All 83: 13,040 → **12,648**, every one S1-exact, 81 steps. It ends below the written source on 12 examples, BWV 847 the clearest: 1,113 written, 1,221 de-sugared, **1,102** core-folded. So the core with its phrases found is more compact than the hand-written sugar there.

Answer: compile's measure is the same structure measure, over the core grammar. Its fold is a separate rule set: Shorten's core kinds, which move into a module both tools call. #157's ranking holds for both. Shorten keeps the respellings and runs, and compile never takes them. On decision 050's ladder this is the minified identity (E4 after Shorten, as `identity.ts` names it), read over the core.

## 4. What compile promises

- **S1 against the source**, as every rewriting tool does (049). The probe holds it on all 83, for each family, for all of them, for minify and for the core fold.
- **Idempotent.** The mechanical families are, on all 83. The fold is too by construction, since it stops when nothing pays.
- **Constant on Normalise's orbit:** `compile(normalise(x)) = compile(x)`. This is what makes the compiled text a hash's input. It follows from compile writing every sugar row out, and the tool's test should check it over the examples. The probe doesn't, yet.
- **No inverse.** Re-sugar is roughly Normalise, but compile drops the comments and the names (minify), writes `from` lines in, and folds into phrases the author didn't write. `normalise(compile(x))` plays as `x` and reads as a stranger's text. That is what a machine reader wants, and the reason a frontend shows the source, never the compiled text.
- **`from`:** writing the fragment in makes the compiled text independent of the library's version: a hash of it is a hash of what plays. It costs +1,556 structure over the examples. The other way, keeping `from id@hash`, is #49's question.

## Decision 069, as ruled

The owner's answers (2026-11-05): 1 "draw should not be keyed on the name", 2 "fragments line goes in, from is sugar", 3 "a". [Decision 069](../decisions/069-compile-writes-the-core.md) has the rest:

1. Compile is de-sugar, minify, a core fold. Each step is checked by S1, and the whole is idempotent and constant on Normalise's orbit.
2. De-sugar reads the compiled program.
3. `from` is sugar: the fragment's lines are written in.
4. A subsequence is the chain on its own tap (`8n*2`), with the line's legato stated where the meter sets one by level. It is core dilate where no tap plays it.
5. Minify keeps the interface names, the names used but not defined, and a drum's name.
6. A draw is keyed on its cell's content (#481).
7. The fold is Shorten's core kinds, each checked.

## Follow-ups

- [#477](https://github.com/yggi/cells/issues/477): Shorten checks no rewrite by S1. Its `runs` breaks a cell read by its units, a written piece's too, and its `same` breaks two entries of a mix braid (*Pachelbel* de-sugared).
- [#482](https://github.com/yggi/cells/issues/482): the tool itself (`src/engine/compile/`), with `compile(normalise(x)) = compile(x)` over the examples.
- [#481](https://github.com/yggi/cells/issues/481): a draw keyed on its cell's content.
- `canonicalText` (rung E2) treats every own name as free. A drawing cell's name isn't, until #481 keys draws on content; then E2 implies S1 for draws, and a drum's name on a MIDI card is the one name that means something.
