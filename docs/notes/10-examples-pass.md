Moved from yggi/cell-studio docs/notes/10-examples-pass.md @ 4036a0b; its issue numbers (#n) are Cell studio's.

# #10, an examples pass: drums on a kit, no extra mixers

Date: 2026-10-12 · Status: open (section mixes folded in 9 pieces; drums moved onto a kit with a voice's `level=` in 5 pieces; the rest of the drums wait on the findings below) · Issue: [#10](https://github.com/yggi/cell-studio/issues/10) · Follows [10-corpus.md](10-corpus.md), [gate-example.md](https://github.com/yggi/cell-studio/blob/main/docs/notes/gate-example.md)

> **Respelled since** (decision 027, #306's notes): a voice's `level=` is `gain=`, `x%n` is Strudel's `&x:0:g`, `legato` is `glide=t`. The text below keeps the spellings of the time.

The owner asked for a pass over the 75 examples with the current best practices (drums go on a kit, no extra mixers, the gate spelling of [decision 023](../decisions/023-gate-spelling.md), what Shorten still suggests), and for what it teaches #10: what is open, what reads badly, what is redundant, what the true shape is. The rule for the pass: no piece may sound different. Every rewrite was checked note for note before it was kept or dropped: `tools/corpus.mjs` (voice, onset, length, frequency, gains) and a stricter scratch compare of every field of every event over 0–120 s (levels, envelopes, bends, parameters too). Read from the working tree on 2026-10-12.

## 1. What was changed

| piece | what | mixes removed | corpus: chars, lines, cells |
|---|---|---|---|
| `arrangement` | `&click … 12 0 0 0` → `12 0!3` (Shorten's run rule; tier 5 has `!n`, tier 1) | — | 0, 0, 0 |
| `baustelle` | section mixes into `&out`; `&metalPart` and `&einsturz` kept (below) | `&platePart` `&subPart` `&riffPart` `&federPart` `&grindPart` `&drillPart` `&schreiPart` (7) | −83, −4, −7 |
| `brothers` | section mixes into `&out` | `&breakPart` `&acidPart` `&riffPart` `&sirenPart` `&buildPart` `&subPart` (6) | −80, −1, −6 |
| `cellscape` | section mixes into `&out` | `&drone` `&sequence` `&leader` `&follower` `&chimes` `&pulses` `&shine` (7) | −74, −1, −7 |
| `grids` | section mixes into `&out` (tutorial, tier 6: the tier test passes) | `&edoPart` `&fifthsPart` `&justPart` (3) | −16, −1, −3 |
| `hypercell` | section mixes into `&out`; the four `&eq` reads kept, with a comment saying so | `&stabPart` `&risePart` `&rollPart` (3) | +44, −2, −3 |
| `korobeiniki` | section mixes into `&out`; `&sectionsNote` now about `(&tune &chorale)`, not the mixes | `&leadA` `&leadB` `&bassA` `&bassB` `&chordsA` `&chordsB` `&drums` (7) | −82, −1, −7 |
| `onemore` | section mixes into `&out` | `&groove` `&choppy` `&disc` `&rob` (4) | −31, −1, −4 |
| `pop` | section mixes into `&out` | `&hatsPart` `&beatPart` `&bassPart` `&keysPart` `&hookPart` `&endPart` (6; `describe.test.ts` given a mix of its own) | −101, −1, −6 |
| `zell` | section mixes into `&out` | `&ticksPart` `&beatPart` `&bassPart` `&arpPart` `&melodyPart` (5) | −102, −1, −5 |

48 mixes removed, 6 kept. Each folded mix's products are written into the card in its place, one section a line (the comma continuation), so the card still reads section by section; `baustelle`'s card has two or three sections a line. Comments that described "the parts' sound" (`pop`, `zell`, `korobeiniki`) now describe the taps only. `hypercell` grows by its new comment.

**Checked:** `node tools/corpus.mjs --check /tmp/corpus-base.json`: every piece `same notes`; `total: chars -525, lines -13, cells -48; 0 pieces changed sound unexpectedly`. The stricter compare of every field of every event: identical in all 10 pieces except the event's `instrument`, which named the outermost mix a note went through (`"instrument":"hatsPart"`) and is now absent; nothing in `audio/` plays from it. The snapshot was refreshed (`engine/snapshot.txt` (in `@yggi/cells`), 9 lines): in each the `notes` column (and the count) is unchanged; `events` moved by the `instrument` field; `values` by the removed cells only (the kept cells' values at the four times are equal, checked cell by cell); `live` by the removed mixes' nodes and edges only (cells, voices, bars, beats, steps and phases equal with the removed names left out).

**Kept, and why:**

- `hypercell`: `&beat`, `&bassPart`, `&hookPart`, `&padPart`: the spectrum scope `&eq` reads them.
- `baustelle`: `&metalPart` and `&einsturz`. `src/audio/wiring.test.ts` reads them by name (*a mix's wheel hears only the notes that go through it: Baustelle's &einsturz …*, #77, which also expects `&beams`' notes in `&metalPart`): a real case of what a mix's wheel hears, so they stay until that test has a fixture of its own. (`pop`'s `&hookPart`, kept at first for `describe.test.ts`, is folded: the test now has its own mix.)

### The kit pass: a drum's gain on its voice

After 5db16a7 (*level= on a voice, its own gain*, [sound.md](../language/sound.md)), a drum's gain moves from its product onto the voice (`&bd level=.8`), and the drums that share a clock become one groove of voices. Base re-recorded on 6810161 (`/tmp/corpus-base2.json`).

| piece | before | after |
|---|---|---|
| `acid` | `&kick map=amp step=&bar 1 1 1 1`, `&clap map=amp step=&bar ~ 1 ~ 1`; `&kick * &bd * .8, &clap * &cp * .35` | `&beat step=&bar &bd [&bd,&cp] &bd [&bd,&cp]`; `&bd level=.8`, `&cp level=.35`; `&beat` in the card |
| `arrangement` | `&kick step=&drumBar 0 ~ 0 ~`; `&kick * &bd * .6` | `&kick step=&drumBar &bd ~ &bd ~`; `&bd level=.6`; `&kick` in the card |
| `hypercell` | `&kick … 0!4`, `&clap … ~ 0 ~ 0`, `&hats …/2 ~ 0 …`, `&roll … 0!8 0*2!4 …`; `&beat [&kick * &bd * .8, &hats * &hh * .2, &clap * &cp * .35]`, `&roll * &sn * .25` | `&kick step=&beatBar &bd [&bd,&cp] &bd [&bd,&cp]`, `&hats … ~ &hh ~ &hh …`, `&roll … &sn!8 &sn*2!4 …`; `level=` .8 .2 .35 .25 on `&bd` `&hh` `&cp` `&sn`; `&beat [&kick, &hats]`, `&roll` in the card |
| `pop` | `&kick map=amp … 1 ~ 1 ~`, `&snare map=amp … ~ 1 ~ 1`; `&kick * &bd * .8, &snare * &sd * .4` | `&beat tags="drums" step=&beatBar &bd &sd &bd &sd`; `&bd level=.8`, `&sd level=.4`; `&beat` in the card |
| `zell` | the same as `pop`, the snare at .35 | `&beat tags="beat" step=&beatBar &bd &sd &bd &sd`; `&bd level=.8`, `&sd level=.35` |

**Checked:**

- `node tools/corpus.mjs --check /tmp/corpus-base2.json`: all five `same notes`; `total: chars -52, lines -4, cells +1; 0 pieces changed sound unexpectedly`. Characters grew where a comment was added (*the kick, and the clap on two and four*); `arrangement` gained the groove's implicit kit as a cell.
- The strict compare covers every field: onset, length, pitch, gains, levels per hit, envelope, bends, parameters and `instrument`. All five are identical. Only the event's `value` differs: it is now the kit index (`0` or `2`) where it was the pitch `0` or the amp value `1`.
- The snapshot was refreshed: in each piece `notes` and the count are unchanged, `events` moved by `value` alone, `values` and `live` because the drum cells changed (a groove, renamed or merged).
- `docs/examples.md`: its generator (`tools/examples-doc.ts`, `levelOf`) took the first `level=` in a file as the card's; with a voice's `level=` above the card it would have listed the drum's. Fixed to read the card's line (the one with `map=sample`); regenerated, the one row that moves is `gate`'s, listed at `.5` (its `&drumOut`'s) before and at its card's `0` now: a bug that was already there.
- **The layout baseline** (`physics.library.test.ts`, crossings weighed by what they cross) passes. Per piece against 6810161, seeds 0–2: `pop` 3.3 → 1.1, `acid` 0 → 0.7, `zell` 6.3 → 7.3, `hypercell` 19.7 → 25.2, `arrangement` 0 → 0. **`onemore` was moved as well and put back**: its kit took it from 0.3 to 7.1 and the library over the baseline (134.7 → 137.5). Its kit form (`&kick step=&grooveBar &bd [&bd,&cp] &bd [&bd,&cp]`, `&open … ~ &oh …`, levels .8 .3 .15) plays note for note the same; it waits on the layout, not the language: a kit is drawn as one wheel its members' wires leave, and in `onemore` that crosses its other parts.

The library was already further along than the request assumed:

- **No old gate spelling is left.** No piece writes `trigger=`, `velocity=`, `gate=` or `gain=`. One piece has gates (`gate`, two of them); it already writes `play=` and `level=`.
- **Shorten finds 10 things in 3 pieces**, and only the one in `arrangement` reads better (section 2 has the other two).
- **8 pieces already play their drums through a kit**: `automaton`, `brothers`, `drums`, `idm`, `midi-out` and `sailor` as a groove of voices, `gate` by a kit gate, `metronome` by a meter read through a kit of clicks.
- **Every mix that is not a section's is needed**, and stays: it is a stereo channel (`canon`, `pertonos`), an instrument (`prelude`'s `&moog`, `waveforms`' `&bass`), what a tape records (`fiveto12`, `resonanz`, `soundtape`, `testtones`, `worn`) or what a resonator is excited by (`resonanz`'s `&echo`, `sympathy`'s `&played`).

## 2. Not changed, and why

**Drums onto one kit: what stayed, and why.** Before 5db16a7 every one of the 12 pieces was blocked by its per-drum gains: a kit had one gain for all its members. The voice's `level=` removed that block, and 5 pieces moved (section 1; a sixth, `onemore`, was put back for its layout). What still stays a product, per piece:

| piece | stays | why |
|---|---|---|
| `acid` | `&closed * &hh * .25`, `&open * &oh * .2` | each hit's own level (`.3 .2 .5 .2`; the open hat's `.5`): a level pattern on the kit would act on the kick and clap too, and a groove note's level is 1 |
| `arrangement` | `&click * &rim * .1` | pitched (`12 0!3`) |
| `bell` | all three | each hit's own level (`&strokes`, `&drum`, `&pulse`), at three different rates |
| `bossa` | both | each hit's own level (`&rim`, `&shaker`) |
| `chance` | both | chance keyed on the voice (below); the tutorial for `?` |
| `five` | both | each hit's own level (`&ride`, `&rim`) |
| `ghosts` | all three | chance keyed on the voice (`0?`, `0?.25`), and the glitch is pitched (`[0|7|12]`) |
| `hypercell` | — | (its hats, eighths, are a groove of their own beside the kick's quarters: below) |
| `onemore` | all its drums (`&shake * &sh * .1`: chance keyed on the voice, `0? 0?.3`; the rest: the layout, section 1) | |
| `pop` | `&hats * &hh * .2` | each hit's own level |
| `rhythm` | all three | the tutorial for a volume as a gate (tier 4, `map=amp`), and the hats' and shaker's own levels |
| `tape` | both | a kit drum doesn't follow the capstan's varispeed (below) |
| `zell` | `&ticks * &metal * .12` | each hit's own level |
| `swing` | `&ride * &cymbal * .1` | pitched (`12!3`) |

**One groove holds one clock.** A note of a groove lasts its step. A quarter-note kick and an eighth-note hat on the off-beat can't share one braid: the hat starts inside the kick's step, and a chord gives both the same length. So `hypercell`'s and `onemore`'s eighth-note hats are a second groove line (`&hats … ~ &hh ~ &hh`), on the same implicit kit, beside the quarter-note one. Written at the eighths, the kick would last half as long, and its release would come sooner.

**What else was measured before 5db16a7, and why it didn't hold:**

- **Move the balance into a level pattern.** Where drums never sound together (pop's and zell's kick and snare alternate), `&beat step=&beatBar &bd &sd &bd &sd` with `level=&weight` (`&weight map=amp step=&beatBar .8 .4`) plays the same onsets, lengths, pitches, and the same product of gain and level. But the gain moves into the note's level, which is what MIDI out sends as velocity. Where drums do sound together at different gains, no level pattern can say it. The voice's `level=` keeps the gain a gain, so this is no longer needed.
- **Chance draws by voice.** A note's chance is keyed on its cell, **its voice**, its lap and its step (`realize.ts`, `chanceOf`). In a groove, the voice is the groove's kit, so the same `?` rolls other dice. `chance` (`&hats … 0?.3` written as `&hh?.3`) went from 1300 to 1340 notes; `onemore` (`&shake … 0?`) from 3658 to 3604.
- **A kit drum doesn't follow its clock's varispeed.** `tape` runs on a varispeed capstan. Its kick, a product, bends with the tape (30.12 Hz, sliding); as a groove it is a kit member, played at pitch 0 (36.71 Hz, steady). The same holds for pitch modulation: a kit read takes none (`realize.ts`: `!t.output.kit`).
- **Pitched hits.** A kit plays its member at the member's own pitch, and a groove's voice can't be transposed (`&hh^12` is no groove).

**Shorten's two other suggestions:**

- `steps`: *`loop=SAMPLE_RATE` is what the sound card turns at anyway — leave it out*. `steps` is the only piece that writes `loop=SAMPLE_RATE`, so the only one that shows the form `rate loop=NAME`, which tier 1 must cover (`ladder.ts`); its note explains it. Applied, the tier test would fail.
- `bwv847`: 8 phrases written several times (−645 characters). Applied (`shortenAll`, 14 steps), they cut the fugue's entries into fragments that are no musical unit (`&subject` becomes `&m6^$24 &m2^$24 3`, `&s11s` becomes `&m6^$27 12@2 &m15^$27 &m11^$27 12@4 10 8 7`). The hand-labelled entries read better. The subject's seven entries are not one cell because each is bent (a note changed, the last one held longer): the language has no "this motif, with this note changed".

**Two cards a piece, `&mix` and `&out`**: 19 pieces name the card `&mix`, 56 `&out`. A rename changes no note, but it is naming (#150), and the implicit `&out` is deferred ([gate-example.md](https://github.com/yggi/cell-studio/blob/main/docs/notes/gate-example.md)): left.

## oneshot, legato and `%`

Three forms from the working tree (uncommitted when this was written; [sound.md](../language/sound.md), [cell.md](../language/cell.md)): `oneshot` on a voice (each note lasts its envelope's attack and decay, whatever its step), `x%n` (a step's own level), `legato` on a voice (a run of tied notes is one note, the pitch bending to each next one). Base recorded first: `node tools/corpus.mjs > /tmp/corpus-base4.json`.

The pieces were compared with a strict compare: the same note means the same voice, onset and pitch, with every other field equal (gains, levels per hit, envelope, bends, params, `instrument`).

- A rule-1 change ("same sound") may differ only in two ways:
  - the event's `value` (now a kit index);
  - a `oneshot` note's length, and only when the note was already long enough for its whole envelope (old length ≥ attack + decay + release, with sustain 0): the envelope has ended before the step does.
- Everything else is listed under the sound changes below.

### Simpler, same sound (rule 1)

| piece | what | the lengths that moved |
|---|---|---|
| `pop` | hats `map=amp … .5 .25 …` → `&hats step=&hatsBar/2 &hh%50 &hh%25 …`, `&hh level=.2` | none |
| `korobeiniki` | hats → `&noise%50 &noise%15 &noise …`, `&noise level=.2` | none |
| `idm` | hats (seven to the bar) → `&tick%60 &tick%30 …`, `&tick level=.2` | none |
| `coltrane`, `jazz` | ride → `&ride step=&swing &cym%90 ~ &cym%60 &cym%50 …`, `&cym level=.22` / `.25` | none |
| `bossa` | rim on the clave and shaker → `&rim step=&clave &click &click%80 …`, `&shaker step=&bar/4 &shh%50 …`, levels on the voices; two lines kept, so the rim still steps with the clave (the piece's point) | none |
| `bell` | the bell's strokes → `&strokes step=&bell &gankogui &gankogui%50 …` (still on the bell's scan, the piece's point); the low drum and the pulses in one groove on the twelve pulses, `[&dundun,&shekere%50] &shekere%20 …`, `&dundun oneshot` | 200 dundun notes: a beat (0.6 s) → 0.35 s, its envelope's end |
| `five` | ride and the rim on 3 and 5 in one groove on the swing: `… [&cym%90,&click%70] …`, `&click oneshot` | 137 click notes: a beat → 0.03 s |
| `hypercell` | kick, clap and hats in one groove on the eighths: `&beat step=&beatBar/2 &bd &hh [&bd,&cp] &hh …`, `&bd` `&cp` oneshot; the `&beat` mix gone (the groove is `&beat`, which `&eq` reads); `&fourFloorNote` about `&beat` | 384 kick and clap notes: a quarter (0.375 s) → 0.28 s / 0.12 s |
| `onemore` | kick, clap and open hat in one groove on the eighths, `&bd` `&cp` oneshot; `&fourFloorNote` about `&beat` (the shaker stays: chance keyed on the voice) | 288 kick and clap notes: a quarter (0.49 s) → 0.3 s / 0.14 s |
| `acid` | kick, clap, closed and open hats in one groove on the sixteenths, two motifs: `&b1 [&bd,&hh%30] &hh%20 [&hh%50,&oh%50] &hh%20`, `&b2` with the clap; `&bd` `&cp` `&oh` oneshot | 378 kick and clap notes inaudible; the open hat's 252 notes are a sound change (below) |

All are checked note for note. `corpus --check` shows `same notes` for `pop`, `korobeiniki`, `idm`, `coltrane` and `jazz` (their levels moved into `%`, which the corpus doesn't hash, and the strict compare finds them equal). It shows `notes changed (expected)` for the oneshot pieces, because the corpus fingerprints each note's length.

`%` costs characters: `&hh%50 &hh%25` is longer than `.5 .25`. The gain is in cells and products: no `map=amp` drum pattern is left outside `rhythm`, and no `* &voice * gain` for a drum outside the exceptions.

### Sound changes (rule 2 and the tutorial)

- **`acid`, the open hat.** `oneshot` on a sixteenth grid: 252 notes from 0.238 s (an eighth) to 0.2 s, its attack and decay. Its decay ends at 0.2 s with sustain 0, so the tail after it is silent either way. By the rule (old length < a + d + r = 0.3 s) it counts as a change.
- **`brothers`, the break's kick** (`&bd oneshot`): 160 notes rang 0.134 s (a sixteenth) of a 0.3 s decay. Now they ring the whole decay: a fuller kick under the break.
- **`idm`, the break's kick** (`&bd oneshot`): 320 notes, 0.094 s → 0.2 s. The ratcheted snare stays cut, because the cut is the drill.
- **`musicbox`, the comb** (`&comb`, `&combLow` oneshot): a music box's tines ring. They were cut at their step: 149 notes, e.g. 0.51 s → 1.1 s and 0.85 s → 1.4 s.
- **`tines`, the bells** (`&bell oneshot`): FM bells with a 3 s decay were cut at an eighth (0.357 s). 136 notes now ring 3 s.
- **`bossa`, the flute** (`&flute legato`): its phrases (`4@3 3 2@2 ~@2 …`) are each one breath. 987 → 943 notes: the tied ones are now bends of the first.
- **`stereo`, the cello** (`&cello legato`, tutorial tier 6, with `&legatoNote`): the bass line is one bow, each note a change of pitch with no new attack. 86 → 56 notes. The line has no rest, so a run is restarted only by the 256-note limit (or a repeated note: it merges).
- **`drums`** (tutorial tier 4, with `&levelNote`): the off-beat hats at half, `&beat &bd ~ &hh%50 ~ &sd ~ &hh%50 [&bd,&hh]`. 86 notes from level 1 to 0.5. The corpus shows `same notes`, because it doesn't hash levels.
- The tier test passes: `%` is shown in tier 4 (`drums`), `legato` in tier 6 (`stereo`).

### Tried and taken back

- **`pertonos`, the reed `legato`.** Musically right (a blown line with rests, the King's theme), but `engine/realize.test.ts` (in `@yggi/cells`) (*canon per tonos: rises a whole tone every pass*) reads the reed's notes one by one. Legato turns the tied ones into bends, so the test sees *D D*. It is reverted. It needs the test to read pitches through bends.
- **`zell`, the ticks to `%`.** Note-identical, but the drawing of the new groove raised the library's drawn crossings from 46.3 to 46.7 (zell 1.3 → 3). It is reverted, to keep the layout baseline. With zell reverted the library passes.

### What still doesn't fit

- **The live view doesn't know `oneshot`.** `engine/routing.test.ts` (in `@yggi/cells`) (*the drawn states agree with each other and with what plays*) fails for `acid`, `bell`, `brothers`, `hypercell`, `idm` and `onemore`, e.g. *&bd sounds at 0.71 s, not live*. A oneshot note sounds past its step, but `live.ts` (no mention of `oneshot`) marks the voice live only for the step. `musicbox`, `tines` and `five` pass, because the same voice is live from a neighbouring note or the oneshot is shorter than its step. This is an engine fix in `live.ts`, not in the examples. Until it lands those 6 tests fail.
- **Stays a product:**
  - `rhythm` (tier 4 teaches the `map=amp` gate);
  - `chance` and `ghosts` (chance keyed on the voice), and `onemore`'s shaker for the same reason;
  - `tape` (varispeed);
  - the pitched hits (`swing`, `arrangement`'s click, `ghosts`' glitch).
- **The roll ratchets** (`hypercell`'s `&sn*8`, `idm`'s `&sd*4`) stay cut on purpose: `oneshot` would smear them.
- **`legato` was not put** on the 303 lines (`acid`, `moving`, `brothers`: the filter envelope fires per note), on plucks, on stabs and chops (`onemore`), or on bells. It was not put on `pachelbel`'s violins either, though they are bowed: the line has no rest, and a canon of three copies on one voice would blur.

## 3. Open for the language to decide

1. **A kit member's balance: settled by a voice's `level=` (5db16a7).** A drum's gain is its own, times every gain it is played at. With it, 5 of the 12 pieces play their plain drums as one groove of voices, note for note. What it leaves open:
   - **Per-hit levels for one member.** A drum with accents of its own (acid's closed hat `.3 .2 .5 .2`, pop's and zell's hats, bell's, bossa's, five's, rhythm's: 13 lines in 7 pieces) can't join the kit. A gate's `level=&accent` acts on every drum at that step, and a groove's notes have level 1. It needs an accent per member, or a pattern whose steps carry a level (the spelling is open).
   - **One clock per groove.** Drums at two rates make two groove lines (section 2).
   - **`level=` now means three things** (item 5).
   - The voice's level also acts on every other place the voice plays. No drum in the library plays anywhere else, but `baustelle`'s `&sub` (a kick and the rubble of the collapse) would.
2. **Chance keyed on the voice.** Respelling a line (a voice renamed, a pattern moved onto a kit) rolls new dice. Should the key be the cell and the step only? It would change every piece with `?` or `[a|b]` once (9 pieces use one of them), and never again.
3. **What a kit drum follows.** A kit read takes no pitch modulation and no varispeed: a tape stop bends the bass but not the kick (`tape` stays a product for it). Is that the meaning of a kit (a drum has no pitch), or a gap?
4. **A section's mix: done, in the library; the form is not.** Since 016 a tap switches a section and its mix only grouped it: 54 mixes in 9 pieces, each read by the card (4 also by a scope). This pass folded 48 into their cards, note for note (section 1), as `arrangement`, the tutorial for arranging, already wrote it. What stays open: nothing stops a piece writing them again (Shorten could suggest the fold for a mix read only by the card, as it does for wrappers); the tag a section mix carried (`tags="drums"`) now lives only on its cells; and a send or a bus (#149) would be the one reason for a mix of its own. One test in `src/` still reads two of them by name (section 1).
5. **`level=` means three things.** dB on the card (75 of 75 pieces write one), a linear product on a gate, and now a voice's own gain (5db16a7, item 1): three meanings. Every piece also has a linear gain on nearly every product. The lin/log seam of decision 023, from a third side.
6. **A motif with a change.** BWV 847 writes its subject seven times because each entry bends a note or holds the last one longer. A form for "&subject, its 13th step a semitone up" (a pick written into, `&subject[$12]+1`?) would let a fugue say what it is. #141's sequence and #31's pitch spaces are where it belongs.
7. **Shorten against the tutorial.** A suggestion that removes the only use of a form a tier must show (`loop=SAMPLE_RATE` in `steps`). Either Shorten leaves tutorial pieces' required forms alone, or `rate loop=NAME` leaves tier 1.

## 4. Bad forms that should or could be improved

- **One drum hit, three spellings.** A drum line is written as volumes (`&kick map=amp step=&beatBar 1 ~ 1 ~`, 24 lines in 11 pieces, some with a level per hit), as pitches (`&kick step=&beatBar 0!4`, about 22 lines in 12 pieces) or as voices (`&groove … &bd ~ &hh`, 6 pieces). The first two then need `* &bd` in a product. A beginner meets two of them in one tier (tier 4: `drums` teaches the groove, `rhythm` the volume as a gate).
- **`0` means "the drum" and `1` means "the drum".** A pitch pattern of zeros and a volume pattern of ones say the same thing; neither names the drum.
- **The drum recipes are copied.** The kick (`s=sine loop=A1 pitch=0..24 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .3 0 .05)`) and its kin (a sine with a pitch drop: toms, a dundun, a woodblock) are written 24 times in 19 pieces, with small differences; 81 envelopes are `&(map=adsr 0 d 0 r)` (a hit: no attack, no sustain); 51 voices are noise. There is no library of voices to read from. A beginner copies a line they can't read yet.
- **Envelopes are never shared.** 239 envelopes are written in place, `env=&(map=adsr …)`; not one piece names one and shares it (`env=&pluck`), the form [sound.md](../language/sound.md) shows.
- **Stereo by two chords repeats the shared part.** In 8 stereo pieces the two channels write 13 entries twice (`echotape`'s `&tune * &bell * .22` and `&far * &soft * .08` in both; `worn`'s and `soundtape`'s `&dry`). `pan=` (decision 007) places a voice; what differs per side here is a read head or a canon's entry, so both chords are written out, the common part twice.
- **A long card.** With the section mixes folded, the arranged pieces' cards hold every product (`cellscape`'s 7 lines, `korobeiniki`'s 7); the comma continuation is the only way to break them, and a section's name now lives only in its tap.
- **Boilerplate at the top.** 51 pieces start with `&bar scan(1 1 1 1)`; 14 write `label="{mode} on {tonic}"`; 20 write a mode as `scan(2 2 1 2 2 2 1)` where 20 others write `scale(major)`.

## 5. Redundant and superfluous

- **Volume pattern vs pitch pattern vs groove** for drum hits (above): three spellings, one meaning when the hits are plain.
- **Section mixes**: 54 mixes the selector no longer needed; 48 folded here (section 1), 6 kept for a scope or a test.
- **The `instrument` of an event** names the outermost mix a note passes through; nothing plays from it, so folding a mix changed it and nothing else (and moved the snapshot's `events` hash).
- **`&mix` and `&out`**: two names for the card (19 and 56 pieces).
- **`scan(…)` and `scale(…)`** for the same seven modes: 20 and 20 pieces.
- **A volume as a gate** (`[&hats * &hh]`, notes started by a `map=amp` step: 24 lines in 11 pieces) and **a gate** (`&g play=… level=…`, 1 piece): two ways to start notes from a level pattern, besides the kit gate, which does it from a pattern of numbers.
- **The card's `level=` and each product's gain**: two places for loudness, one in dB and one linear, in every piece.

## 6. The emerging true shape

The library converges on few things. **Cells** hold braids, and a braid is steps, rests, holds, chords, motifs and choices. **Clocks** are cells too: a bar (`scan(1 1 1 1)` at a tempo), its subdivisions, a swing, a meter, a belt, a tape's reel; everything moves by `step=` on one of them. **Tables** turn numbers into something: a scale into pitches (`over=`), a kit into voices, a table of taps into sections. **Voices** are sources with an envelope and parameters that move with cells. **Products** meet a pattern, its levels and a voice; named, a product is a **gate**. The **card** is the last mix, with its stereo pair and its master level.

Read that way, a drum part is a pattern read through a table of voices, exactly as a melody is a pattern read through a scale. The 8 pieces that were on a kit already wrote it so, and with a voice's `level=` 5 more do (`acid`, `arrangement`, `hypercell`, `onemore`, `pop`, `zell`). What still keeps a drum off the kit is narrower now: an accent of its own (section 3, item 1), a chance key, varispeed or a pitched hit (section 2). With those settled, a piece's drums are one groove line per clock, and `* &bd` products, zero-patterns and one-patterns as drum hits leave the library.

Arranging the same way: since 016 a section is a switched tap of the clock, so its mix is only a group. With the section mixes folded, the arranged pieces' cards read their products directly, as `arrangement` does: one table of taps, one selector, one card.

What would be left: cells and braids; clocks; tables (scales, kits, taps); voices; gates (products, named or not); the card. The volume-as-gate, the pitch pattern of zeros, the section mix (folded here), the second card name and the duplicated stereo chord are what would go. The open questions are about where loudness lives (a voice, a kit member, a note's level, a product's gain, the card's dB) and what a respelling may not change (chance keys, varispeed on a kit). Both come back to #151's canonical forms: one place for each fact, and a respelling that plays the same.
