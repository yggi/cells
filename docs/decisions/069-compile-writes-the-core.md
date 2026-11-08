# 069 · Compile writes the core: de-sugar, minify, a core fold; `from` is sugar; a draw is keyed on what its cell is

**Date:** 2026-11-05 · **Status:** accepted (the owner's answers on #441, 2026-11-05: 1 "draw should not be keyed on the name", 2 "fragments line goes in, from is sugar", 3 "a")

*Amended by [077](077-the-core-is-sound-up-to-an-interface.md): the core is sound only, cored up to a named interface (§5); `x!n` is core, a count, and compile writes runs (§2, §7).*

*The scoping and its numbers are [441-compile.md](../notes/441-compile.md), measured by `tools/compileprobe.ts` over every example. Read with [068](068-the-core-grammar.md) (the core and its sugar), [049](049-four-tools-over-a-piece.md) (the four tools) and [050](050-the-equalities.md) (the ladder).*

## Context

Decision 068 left the core to a tool of its own: Normalise stays at the sugar level, and **compile** writes the core, for a machine reader (a hash, the learned layer, a comparison of two pieces). #441 scoped that tool with a probe that de-sugars all 83 examples family by family, each rewrite checked by S1 and measured by structure.

Three things it found that a design must answer:
- Some sugar rows rewrite from the letters alone, and the rest need the compiled program.
- Names are not free: a chance draw is keyed on the playing cell's name (031), and a drum's name is its MIDI note (054).
- Shorten run over the core writes sugar back (`!n`, the respellings), and two of its rules don't check what they rewrite (#477).

## Decision

### 1. Compile is de-sugar, then minify, then a core fold

Each step is checked by S1 against the text it starts from. The whole is idempotent and constant on Normalise's orbit: `compile(normalise(x)) = compile(x)`. It has no inverse: comments and names go. A frontend shows the source, never the compiled text.

### 2. De-sugar reads the compiled program

The rows the letters settle are rewritten as the probe does: comments, units, note names (every digit of the double), `&( … )`, `x!n` and table scans. The rest are written from what the compiler resolved:
- a tap as the meter's pulse with its chain: `16n` is `pulse*4` in 4/4 and `pulse*2` in 7/8, `4n.` is `pulse/3` in 6/8, `1m` is `pulse/4` in 4/4, exact by S1 straight, swung and with legato by level. Never the meter cell's own steps (`&bar*k`), which decision 040 retired as a written form, though 068's rows 54–55 rewrite into them (their S1 checks stand: both read the same steps). `beat` stays, a look up of the meter's levels (7/8's are unequal);
- a key as its mode and its tonic;
- a meter as its levels;
- a gate as its products, and `pitch=` as a sum in each.

Each row of #27's table gets its rewrite into the core, tested as `core.test.ts` tests the 45.

Three exceptions the probe found:
- **A slider keeps its unit.** The performer moves `free(124bpm, 112..132)` in bpm.
- **A quoted string is not code.**
- **`x!n` stays in a cell read by its units.** `&a!2` is one unit and `&a &a` two, and a pick or a rotation counts them.

### 3. `from` is sugar

A `from` line is written as the fragment's lines (`expand`), so the compiled text holds no reference to the library, and a hash of it is a hash of what plays. A lockfile's `id@hash` (#49) is the source's business, not the core's.

### 4. A subsequence is a finer step of the same tap, where one plays it

`step=T 0 [2 4] 5` is written `step=T*2 0@2 2 4 5@2`, the chain on the line's own tap: `8n*2`, `beat*2`, `pulse*3`. This is exact in 4/4, under a swing whose tree holds the finer level, and in 7/8, where halves of unequal beats are no note value. It needs no lookup in the meter. It never writes the meter cell's own steps (`&bar*k`), which decision 040 retired. Where the meter sets legato by level, the line states the legato it played (`legato=.9`). A `<a b>` is `[a b]/2`, a slower step: a line of its own.

**Where no finer tap plays it, `[ ]` stays in the core** (the owner's (a)). A subsequence's parts are placed through the swing (#121). A tap of a division the swing doesn't hold (`8n*3` or `16t` under swung eighths) is even within its beat, as documented: "`8t` under swung eighths stays straight". So the thirds of a swung eighth are dilate inside a step, the primitive itself. Row 16 of 068's table is sugar wherever a finer tap is exact, and core dilate where it isn't. Nothing changes how a piece sounds.

**Amended (2026-11-05, the owner on #15):** the parts of a step and a tap now follow one rule, *a division is even within the finest node of the tree its length divides*, so a finer tap plays every subsequence of a swung tap: the thirds of a swung eighth are `8n*3` (and `16t`), even within the eighth; the thirds of a beat are `4n*3` (and `8t`), even in the beat. Before, a part was placed between the points of the finest level that leans, so `step=4n [0 0 0]` under swung eighths played its thirds at .44 and .78 of the beat where `step=8t` plays .33 and .67, and `step=16t` played two notes at once. No example's notes or events moved. The one place `[ ]` stays core dilate is a part of a step the swing doesn't place itself (`step=8t [2 4]` under swung eighths: its halves even between its thirds, where `8t*2` is `16t`, even within each eighth).

### 5. Minify keeps the interface names, the names a text uses but doesn't define, and a drum's name

A drum's name is its MIDI note on a MIDI card (054), by design. The rest are renamed freely.

### 6. A draw is keyed on what its cell is, not its name

A chance draw is keyed today on `seed|cell name|lap|step`. It will be keyed on the playing cell's content, the hash of its canonical text with what it splices (#481). Then:
- a renamed text draws as it did;
- rung E2 implies S1;
- Shorten may merge alike cells that draw;
- minify needs no exception for them.

Every example that draws sounds different once, its event snapshot moved and named in the CHANGELOG. No Migrate rule is possible: a draw has no old spelling.

**Amended (#481, built):** the key is what the cell *plays*, not its text. Keyed on its canonical text, a cell respelled would draw differently: Shorten's run (`0? 0?` as `0?!2`), a phrase made a cell of its own, a chance said on the cell (`chance=.3`) or on the step (`x?.3`). So the key is the hash of the cell's flattened steps (where each plays, how long, its value, its chance, its options, its laps and choices), its seed and its sound's parameters, a cell one names read as that cell's key in turn (`src/engine/drawkey.ts`). A choice's id leaves out the name of the cell it was flattened in. A noise's grain, where a noise note starts in its noise, is keyed on the voice's place among the noise voices in the order the text declares them. A send changed then leaves its noise where it was, and S1 hears a noise by its colour and level, not its samples (070). Minify keeps no drawing cell's name.

**Keys (the owner, 2026-11-06: "keys (a)"):** a key whose tonic is a cell (`&key scale(minor, &tonic)`, as Normalise writes it, decision 060) keeps the tonic a cell read, and writes its mode out as a table: `&mode 0 2 3 5 7 8 10`, `&key scale(&mode, &tonic)`. `scale(&mode, …)` reads a mode's table for that, any mode of the twelve. A shift that reads a cell (the other option) would duplicate a sum in the mix and a stepped tonic, so it isn't built.

**Two rows are core, not sugar (2026-11-07, #482's last rungs; the owner on #563: levels "a, following your reasoning. terminal"; the core drops inert data).** The note's table counted both as sugar the compiler resolves. Neither has another spelling in the language:
- **A meter scan** (amended by [080](080-a-meter-is-a-tree-placed-through-a-time-map.md): the sugar of a meter bent, `bend=`): `scan(27 23 26 24) step=…`, a scan with a rate. It is the one meter of uneven steps. `meter("…")` writes even steps, and a braid with `@` is no meter a tap reads (`step=&a:pulse` refuses it). It is a dilate of each step, the look up a tap makes of it, core.
- **A hit's gain:** `&hh:0:.5`, its velocity. Its one other spelling is a voice of its own with `gain=`, one per gain. That costs a voice for each, renames a drum (on a MIDI card, a drum's name is its note: decision 054), and plays the gain as a level that S1 reads apart from the hit's gain. It is a terminal, not a product: a step whose value says which drum it plays and how hard, as a pitched step's value is its pitch (Strudel spells it as one token, `hh:0:.4`, and MIDI keeps velocity on the note). Encoding it as a voice or a volume line writes a note's own data as structure.

So `Core.left` lists neither, and 66 of 83 examples are wholly in the core. What is left is the rows with a choice or a reader in them: a subsequence a finer grid would change, a cell read by its units, a gate a role reads, a pitch written in place.

**Inert data in the core:** a note, `label=`, `show=`, `size=`, `about=`, `title=` and `tier=` go, as comments and names do (§1), since the core is for a machine reader. 068 §3's "passes through every tool unchanged" holds for the tools that write a source (Normalise, Shorten, Migrate). `tags=` stays: what it groups is read.

### 7. The fold is Shorten's core kinds, checked

The fold takes `phrase` (a phrase as one cell used at its places, moved by `^$n`, `^n`, `[<<]`, backwards), `same` (alike cells as one) and `default` (a stated default dropped). It takes the best each round, each checked by S1, and lives in a module that both tools call. Shorten keeps runs and the respellings, and compile never takes them. Over the examples, this fold takes the de-sugared text from 13,040 to 12,648, all exact; BWV 847 compiles below its hand-written source (1,113 → 1,102).

## Consequences

- **The tool:** `toCore` in `src/engine/core/` (#482; named `core`, not `compile/`, beside `compile.ts`). Its first rung runs Normalise first (so the core of a text and of its normal form agree by construction), the seven families the letters settle, the core fold with the lines nothing reads, and minify, until the text stops changing. It reports the rows it leaves (`Core.left`). Its tests check S1, idempotence and `toCore(normalise(x)) = toCore(x)` over the examples (`core.slow.test.ts`). Its second rung reads the program: a tap of a note value as the pulse with its chain (every tap over the examples), and a subsequence on its line's finest grid, left where a finer grid would change what the line plays (it draws, it is spliced or read by its units, a stack, `<a b>`, a euclid, legato by level). Its third rung writes a meter as its levels (before the taps, which then read the pulse the levels count), a copy with no braid of its own as its base's braid and attributes, and a chain as one ratio. Its keys family writes each key as its mode's table, a cell of its own, and its tonic a cell read or its pitch class (`scale(&_m1, &tonic)`, `&_m1 0 2 3 5 7 8 10`). Its sliders family writes a slider in the core's numbers with its unit an argument, `free(2, 1.5..2.5, unit=bpm)` for `free(120bpm, 90..150)` (the owner's (a); the unit written inline, and a tempo marking, its sugar). Its gates family writes a gate as its products in the card's mix, one entry per receiver (`(&t + -12) * &acc * .4 * &a`), and its pitch family a voice's `pitch=&x` as a sum in each product the voice is in (`(&t + &vib) * &lead`); a gate a role reads stays, the role being a performer's part. What nothing plays goes first: a note, and `label=`, `show=`, `size=`, `about=`, `title=` and `tier=`.
- **#481 (draws):** the one change here to how pieces sound.
- **#477:** Shorten's rules checked by S1, which the core fold already does.
- **068's row 16:** "sugar" except where swing doesn't hold the finer level (note 418 says so).
- **Rung E2:** `identicalUpToRenaming` holds for sound once #481 lands. A drum's name on a MIDI card stays the one name that means a note.
