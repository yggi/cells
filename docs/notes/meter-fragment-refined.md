# The meter fragment refined: named points, common meters only, the style's meters apart

Date: 2026-11-23 · Status: open, filed; nothing built · Issues: #902 (the meter fragment), #900 (a name on its facet's axes), #901 (an offset as a sum), #899 (the stray `&bar_swing`), yggi/cell-studio#701 (the swing subwheel); follows #507 and decisions 065, 072, 076, 089, 090

The owner's five suggestions, checked against the language, Jambot and Cell studio, with a sketch of the fragments they lead to. The sketches are in ` ```text ` blocks: three of their spellings don't parse yet (marked **new**).

## What is there today

`fragments/meters/meter.md` is one template with thirteen declaration lines, each a set of numeric points (`&(map=style sync=… harm=… bite=…)`) and its arguments:

```text
&bar from (&grouping, &swing) &tempo style=(…13 points…)
&bar from (&grouping, &swing) &tempo style=(…) swing=8n:2/3
…
&bar base=&grouping step=&tempo swing=&swing
&grouping meter("4/4")
&swing swing=8n:1/2
```

Each numeric point read against `styles` (`sync harm bite`; a meter leaves `mood` out, decision 076 §2):

| arguments | its points, as named styles |
|---|---|
| none (4/4, straight) | `&synthPop` `&techno` `&bossaNova` `&kinderlied` `&acid` `&happyHardcore` `&elektro` `&darkAmbient` `&baroque` `&seaShanty` `&chiptune` `&salsa` `&tripHop`, all exact |
| `swing=8n:2/3` | `&bluesShuffle` `&swingJazz` `&electroSwing`, exact |
| `swing=16n:.65` | `&lofi` |
| `swing=16n:.6` | `&deepHouse` `&funk`, and `&acid` +.1 bite at weight .5 |
| `swing=16n:31/60` | `&ambient` |
| `meter("3/4")` | `&waltz`, and `&spooky` +.08 bite (both .75) |
| `meter("2/4")` | `&march` (.75), and one point on no style |
| `meter("6/8")` | `&spooky` −.08 bite (.75), and one point on no style |
| `meter("5/4")` | `&spooky` (weight 1), and one point on no style |
| `meter("2/2", 2)`, `meter("12/8")`, `meter("7/8")`, `meter("10/8")` | on no style: the nearest is 0.12 to 0.42 away |

## The suggestions, checked

### 1. Named points and offsets: yes, with two rules missing

- **Named points work today.** `style=&funk` is read by `src/repository/declarations.ts` (`readPoint`), and 30-odd fragments use it (`funk_bass`, `creeping_bass`). Every swing point and every straight 4/4 point above is a style's exactly.
- **An offset has no spelling.** Motifs and harmonies say "0.1 higher in bite (its energy offset, #572)" in prose and write the numbers. Proposed (**new**): a point is a sum, as an intensity is (decisions 079, 096): `[&acid + &(map=style bite=.1)]`, the axes the offset leaves out unmoved.
- **A named point brings `mood`, and a meter leaves it out** (076 §2: a distance runs over the axes both points have). `style=&funk` in a meter would weigh mood in every query between presets. Proposed rule: **a name is read on the axes its facet speaks to** (meter, rhythm, performer, module and form: `sync harm bite`), so a meter's `&funk` is Funk's three. At the presets themselves nothing moves; between them, a query finds what it finds today.
- **Seven points have no style to name.** These are the meters placed for their own sake (#572). They stay numeric, or wait for a style that owns them (a Balkan preset for 7/8 and 10/8, say). Nothing forces a name.

### 2. The common meters only, the rest in a style's own fragment: yes

Decision 090 already provides for it: "a generic … generator with no style, used with parameters by styled" fragments. It also meets 072 §3's aim, that the library says where a meter comes from: `funk_meter` is `meter` swung, and its text says so.

- **`meter`**: 4/4, 3/4, 2/4, 6/8, 12/8 and 2/2, straight, no swing.
- **One fragment per style's feel**, each taking `meter` and naming its styles: `funk_meter`, `swing_meter`, `lofi_meter`, `spooky_meter`, and the odd groupings in `odd_meter`.
- **Ambient's `16n:31/60` is a lean of 1.7 %**, about 7 ms at 72 bpm, and audible to no one: Ambient joins the straight list (the owner, 2026-11-23: "drop ambient_meter"). Its events move by that lean: the one event snapshot this proposal moves on purpose.

### 3. `&grouping` and `&swing` as placeholders: they dissolve, and need no default syntax

They exist only because 065 §2 binds a keyword to a cell (`swing=` binds `&swing`), so an optional parameter must be a cell whose line is its default. Both are already the head's own values:

- **Swing is the head's attribute,** and 065 §4 already lets a use set it: `&bar swing=16n:.6 from meter &tempo` plays the same 16n:.6 as `meter(swing=16n:.6)` (measured at 7da5fc0). Today it also leaves the placeholder behind: `&bar_swing` stays in the program, and the compiler warns "swing= acts on a meter … on &bar_swing it does nothing". That false warning is a bug, #899.
- **With no placeholder, the default is the head line itself:** `&bar meter("4/4") step=&tempo`, straight because it writes no `swing=` (`8n:1/2` is the no-op that `&swing` spells out). So **no syntax for default values is needed**: a parameter's default is what the head writes, and a use changes the head where it says (065 §6, applied to the head).

### 4. `grouping=` dissolves into the bar's braid: yes, with one form (**new**)

`base=&grouping` is a copy of a meter (#507), there so that the grouping can be a cell. Written as the braid, the head is `&bar meter("4/4") step=&tempo`, and a use gives the head a braid before `from` as it gives attributes (065 §4 extended from attributes to the braid; a token before `from` that isn't `key=value` is unambiguous):

```text
&bar meter("7/8") swing=8n:2/3 from meter &tempo
```

That is the line `&bar meter("7/8") step=&tempo swing=8n:2/3` with its source named. A declaration line then reads as a use at a point, the id left out:

```text
&bar meter("3/4") from &tempo style=&waltz * .75
```

- **Normalise** (`src/engine/normalise/library.ts`, `libraryTemplates`) rewrites `&bar meter("7/8") step=&tempo` into `&bar from meter(grouping=meter("7/8")) &tempo` today. With no parameters left, the template's form is never shorter than the plain line, so the rule would keep the line as it is.
- **Variant ids** (`src/repository/variants.ts`, `takenAs`) are `meter(grouping=meter("7/8"))` today. They would become the head's braid, `meter "7/8"` say, or the style fragments' own ids.

## The sketch

```text
# meter: the common meters, straight
&bar from &tempo style=(&synthPop | &techno | &ambient | &bossaNova | &kinderlied | &acid | &happyHardcore | &elektro | &darkAmbient | &baroque | &seaShanty | &chiptune | &salsa | &tripHop)
&bar meter("3/4") from &tempo style=&waltz * .75
&bar meter("2/4") from &tempo style=(&march | &(map=style sync=0 harm=.1 bite=.6)) * .75
&bar meter("6/8") from &tempo style=&(map=style sync=.3 harm=.2 bite=.2) * .75
&bar meter("12/8") from &tempo style=&(map=style sync=.7 harm=.6 bite=0) * .75
&bar meter("2/2", 2) from &tempo style=&(map=style sync=.2 harm=.6 bite=.9) * .75
&bar meter("4/4") step=&tempo
```

```text
# funk_meter: the sixteenths leaning, Funk's and Deep house's
&bar from &tempo style=(&funk | &deepHouse | [&acid + &(map=style bite=.1)] * .5)
&bar swing=16n:.6 from meter &tempo
```

```text
# swing_meter: the eighths in triplet swing, jazz's
&bar from &tempo style=(&swingJazz | &electroSwing | &bluesShuffle)
&bar swing=8n:2/3 from meter &tempo
```

```text
# lofi_meter: Lo-fi's lean
&bar from &tempo style=&lofi
&bar swing=16n:.65 from meter &tempo
```

```text
# spooky_meter: five beats, and the waltz and the 6/8 at either side of it
&bar from &tempo style=&spooky
&bar meter("3/4") from &tempo style=[&spooky + &(map=style bite=.08)] * .75
&bar meter("6/8") from &tempo style=[&spooky + &(map=style bite=-.08)] * .75
&bar meter("5/4") from meter &tempo
```

```text
# odd_meter: the groupings of no style yet (aksak among them)
&bar from &tempo
&bar meter("5/4") from &tempo style=&(map=style sync=.4 harm=.9 bite=.5) * .75
&bar meter("7/8") from &tempo style=&(map=style sync=.8 harm=.6 bite=1) * .75
&bar meter("10/8") from &tempo style=&(map=style sync=.6 harm=.9 bite=.8) * .75
&bar meter("7/8") from meter &tempo
```

The weights are today's: every point keeps its place, so each preset finds what it finds today. An aksak swung on its pairs stays one line, `&bar meter("7/8") swing=8n:2/3 from meter &tempo` (decision 071 keeps its three straight).

**Open:** whether a style fragment with several groupings (`spooky_meter`) writes its head as the default one, as above, or as `&bar from meter &tempo` with every grouping on a declaration line.

## What it does to Jambot

Jambot (pinned at v0.29.0) takes every fragment of the facet `meter` (`packages/engine/src/library.ts:11`), compiles it, and reads only the compiled `&bar`'s meter (`repository.ts:68-98`). It never reads the names `grouping` and `swing` or the cells `&grouping` and `&swing`. So at runtime, finding a meter and its swing for a style is unchanged, provided that:

- each fragment keeps the facet `meter` and a `&bar` with `step=` (`setTiming`);
- each grouping is still one of Jambot's `METERS`, swung on one level of 8n or 16n (`odd_meter`'s are today's).

What would break at its next pin:

- **Ids.** `repository.test.ts:70-90` expects thirteen meters with ids such as `meter(swing=8n:2/3)`. Also `layer.test.ts:178-265`, `bass-loop.test.ts:162` and `kept-twinkle.fixture.json:55-85`.
- **Learned layers and co-use** store a meter's id (`meterFragment`, `plan.ts:353-371`; `rhythms.ts:141`'s bench). A release needs a map from each old id to its new one (`meter(swing=16n:.6)` → `funk_meter`).
- **Rankings move only between presets, if at all.** With the facet's axes rule they don't; without it, mood enters every meter distance.
- **Its own plan agrees:** `docs/ROADMAP.md:59` (the Meter-Cell, #306) wants a style to carry its meters, with swing and aksak as one operator. That is what `funk_meter` and `odd_meter` are.

## What it does to Cell studio

- **Today a taken meter is three nodes:** `&bar` (the meter wheel: `isMeter`, cells `graph.ts:238`, `keepsTime`), `&bar_grouping` (an ordinary braid wheel, with a `base` edge into the bar) and `&bar_swing` (a `swing` wire that carries nothing, `flowedges.ts:87-92`). See `modules.test.ts:20-23` and `piece.test.ts:67-69`.
- **With 3 and 4, it is one cell, `&bar meter("…") step=&tempo swing=…`, so one meter wheel**, the special one the app already draws (`cellview.ts:245-277`: beats, the downbeat, bpm over N/bar, the bar's count while playing, the net). This needs no change in Cell studio, only the tests above updated.
- **Swing as a subwheel is new in Cell studio.** `layout/subwheels.ts` has rules for sections, read heads, kit voices and splices, none for a meter. Today swing only bends the wheel's steps (`Clock.swung`, `cellview.ts:345-350`) and says `swung 8n` in the hub. A rule would draw the swung level as an inner ring of long and short pairs, its share the subwheel's control. It reads the head's `swing=` (level, share), not a cell. That is yggi/cell-studio#701.
- **The fragment preview's control** is the `grouping` text at its default (`preview.ts`, `preview.test.ts:61`). It would become the head's braid.

## Steps, if the owner agrees

1. cells: a name is read on its facet's axes; an offset as a sum. Each is a decision, then the fragments rewritten with names, where no point moves.
2. cells: a use's braid before `from`; `meter` without parameters; the style fragments. A decision (amends 065 §4 and §6, and #507's head), a `changes/` entry naming the id map for Jambot, and Migrate for any `from meter(grouping=…, swing=…)`.
3. cells: the stray `&bar_swing` warning, if 2 is not taken.
4. Cell studio: the swing subwheel. Jambot: the pin, its id map and its tests.
