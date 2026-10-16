# Swing on several levels: what the research and the drums say, and one form for it

Date: 2026-10-16 · Status: research, and the owner's direction; no ruling on the spelling yet · Issues: [#18](https://github.com/yggi/cells/issues/18) (swing on a level), the meter epic [#15](https://github.com/yggi/cells/issues/15) (rulings 3–5; #17 groups, #20 agogic), [yggi/jambot#259](https://github.com/yggi/jambot/issues/259) (the meter heard: "secondary swing, tertiary lean"), [yggi/jambot#144](https://github.com/yggi/jambot/issues/144) and Jambot's T11 and T16 (`docs/language-time.md`) · Measured with: [groove-measure.md](groove-measure.md)

The question: what swing is when more than one level of a meter can lean (8ths and 16ths, a ternary beat, a bar of three), and how cells writes it so that swing, aksak and agogic are one thing.
Two sources: a review of the research, each claim checked against its source, and the Groove MIDI Dataset measured again for the positions of every stroke within its beat.

## The owner's direction (2026-10-16)

"I would like to avoid separate swing-subdivider nodes but have the full swing-tree in the Meter-Cell (`&bar`), potentially with overrides at the tap-level."
So the meter cell holds the whole tree of a bar's divisions and their proportions; a line that steps by it (taps it) may override them for itself. No separate cell divides or swings a grid.

## What the research says

Tags: **[R]** full text read, **[A]** abstract only, **[2]** second-hand (through the source named).

1. **Swing is a proportion of a division, not a time warp.** Every empirical source measures the gaps between the strokes of one level; none models swing as a continuous warp of time, and the one direct test contradicts one: in jembe music swung pairs at 58:42 sit beside triplets at 25:33:42 (Polak 2010 [R]), where a linear warp of even triplets by 58:42 would put them at 0, .387, .72. The triplets keep their own proportions, and their third stroke meets the swung off-beat (25 + 33 = 58).
2. **One level swings at a time, and deeper levels nest unevenly.** Funk swings the 16ths over straight 8ths (Frane 2017 [A]: median 1.2:1, uncorrelated with tempo; Ainsworth 2025 [R]: 1.07–1.8:1). Mande drumming divides only the long element when it goes faster, L-S becoming s-S-S ("incomplete bifurcation", Polak & London 2014 [R]). Whether jazz double-time 16ths swing is not measured anywhere found.
3. **One share per level is not enough.** Samba moves only the 3rd and 4th 16ths early, by 0.025–0.05 of a beat (Gouyon 2007 [R]; Naveda et al. 2009 [R]); jembe's ternary beats are 25:33:42 to 27:33:40, suku 22:34:44 (Polak 2010); the Viennese waltz's bar is about 27:37:35 (Yang 2022 [R]; Johnson & Gotham 2023 [R]: beat 2 early); springar is 28:39:33 as a norm, with a large variance (Johansson 2017 [R]).
4. **Tempo dependence is a player's, not a style's.** Drummers' ride swing falls with tempo, 3.5:1 slow toward 1:1 fast, not linearly and differently per player (Friberg & Sundström 2002 [A]; Honing & de Haas 2008 [R], about 2.2:1 at longer beats and no 100 ms floor; Dittmar, Pfleiderer & Müller 2015 [R], Elvin Jones about 2.5 at 150 bpm to 1.0 at 300, Art Taylor nearly constant). Jazz soloists play mostly 0.9–1.5:1 (Benadon 2006 [R]; Corcoran & Frieler 2021 [A], about 1.3), with their downbeats about 30 ms late against the band (Nelias et al. 2022 [R]). Funk 16ths and jembe hold their proportions across tempo.
5. **Meter theory has room for it.** Lerdahl & Jackendoff's well-formedness wants equal weak beats below the tactus [2: arXiv 1705.04792]; London allows uneven subdivisions tied to an even beat, and his "many meters" are learned, style-specific templates (London 2004 [R], 2012 [2: Polak & London 2014]); Polak reads the uneven patterns as metre itself ("rhythmic feel as meter").
6. **Tools.** The MPC's swing is one share per level, on 16ths (Linn 2013 [R]); Ableton's groove pool is a per-position template (manual [R]); Strudel's `swingBy(x, n)` is `inside(n, late(seq(0, x/2)))`, a rigid shift of the second half of each slice that doubles or splits a triplet's middle note (run); Tidal's `swingBy` drops and doubles notes on 16ths and triplets, against its own doc comment (simulated). Neither is a model of any measured practice.
7. **Not supported by their sources:** "swing is 2:1" (soloists play about 1.2–1.5, drummers reach 2:1 at one tempo); "a constant 100 ms short note" (drummers in one study, not found by Honing & de Haas); "the Viennese waltz's first beat is long" (it is short).

| Style | Level | Measured | Tempo-dependent? | Source |
|---|---|---|---|---|
| Jazz ride cymbal | 8th | 3.5:1 slow → 1:1 fast; about 2.2:1 below about 170 bpm | yes, not linear, per player | Friberg & Sundström 2002; Honing & de Haas 2008; Dittmar 2015 |
| Jazz soloists | 8th | mostly 0.9–1.4; about 1.3; downbeat about 30 ms late | weak | Benadon 2006; Corcoran & Frieler 2021; Nelias 2022 |
| Funk, breakbeats | 16th, 8th straight | 1.07–1.8; median 1.2 | no | Ainsworth 2025; Frane 2017 |
| Samba | the 16ths of a beat | 0, .25, ≈.475, ≈.725 | untested | Gouyon 2007; Naveda 2009 |
| Jembe, ternary | 3 in a beat | 25:33:42 to 27:33:40; suku 22:34:44 | stable | Polak 2010 |
| Jembe, binary | 2 in a beat | 53:47 to 60:40 | stable | Polak 2010 |
| Viennese waltz | 3 beats in a bar | about 27:37:35 | untested | Yang 2022; Johnson & Gotham 2023 |
| Springar | 3 beats in a bar | 28:39:33 (norm); 34.5:34.4:31 measured | claimed, untested | Johansson 2017 |

## What the drums say

The 231 performances of [groove-measure.md](groove-measure.md), measured again for where the hi-hat's and ride's strokes fall within their beat: a histogram of each performance's positions at 1/48 of a beat, its peaks taken from its own downbeat.
A probe run in the session at cells `main` (2315ef4) with `tools/groove.ts`'s reader; the script is not committed yet, so these numbers are reproducible only once it is (a follow-up below).

- **Two levels never swing together.** None of the 231 swings its 8ths and also plays 16ths. Where the 8ths swing, nothing sounds between them (11 performances: the swung 8th at 0.625–0.77 of the beat, jazz 0.667–0.77 at 102–125 bpm and 0.625–0.667 at 180–185), or the beat divides in three (15).
- **16th swing is one share per level, the 8th straight.** Of the 60 performances with four strokes a beat, the 8th stays at 0.46–0.51; where the 16ths swing (New Orleans, soul, gospel, jazz), the beat's two halves take nearly the same share: 0.58 and 0.59, 0.61 and 0.60, 0.58 and 0.55, 0.58 and 0.62, 0.59 and 0.60; gospel 0.61 and 0.67.
- **A beat in three leans.** The 15 ternary performances divide the beat 0.332 : 0.323 : 0.351 (medians), the last third longest by about 3 % of a beat (14 ms at 120 bpm): gentler than jembe's 25:33:42, and the first measurement against T16's straight default.

## One form: a tree of proportions in the meter cell

Every finding fits one description: **a meter is a tree, and each node divides its span among its children in proportions** (equal by default).
Swing, aksak, agogic and the waltz are the same thing at different nodes, which is the language's "everything is the same" at the meter:

| Written today | In the tree |
|---|---|
| `scan(27 23 26 24)`, agogic | the bar node's proportions |
| `meter("3+2+2")`, aksak | the bar node's children and their sizes |
| `swing=.6` on 8ths | (.6 .4) at every beat node |
| 16th swing, jembe's three, the waltz, samba | the proportions of the nodes where they act, per node where they differ |

What follows from it:

- **Nesting is well-formed by construction.** A node's span is fixed by its parent, so every level keeps its ends; levels swung independently against even time can cross their strokes when the lean is strong.
- **A level's accent is its depth in the tree**, which is what the hub's meter contract writes (yggi/music-commons `contracts/meter/`).
- **One share per level is a shorthand** for a level whose nodes all share one proportion; samba and the Mande nesting need the per-node form.
- **A division the tree doesn't hold** (a triplet in a binary beat, a long note) is even within its node, not warped: what the jembe data and Butterfield 2011 [R] suggest, and what jazz triplets at moderate tempo do (Nelias 2022, supplementary [R]). cells today warps it: `swing=` is a piecewise-linear map of each pair of steps, so a triplet over a swung pair at `swing=.6` lands at 0, .4, .733.
- **Overrides at the tap** (the owner's direction) are what the evidence asks for: the soloist leans less than the drummer on the same beat (Benadon 2006; Friberg & Sundström 2002), so a line stepping by `&bar` may carry its own proportions for a level.
- **What stays with the player, not the text:** tempo curves (per player, absent in funk and jembe), offsets between parts (the soloist's late downbeat), phrase-level surges (Benadon's), random microtiming (Senn et al. 2016 [R], Datseris et al. 2019 [R]: no groove gained). Decision 037's row "score and playing" already puts them there.

## Open for the owner

1. **Spelling the tree in the meter cell.** The mini-notation's own forms read as the tree: brackets subdivide, numbers are proportions, `!` repeats: `scan([3 2]!4)` swings 8ths 3:2 in four beats, `scan([[3 2] [3 2]]!4)` the 16ths, `scan([25 33 42]!4)` jembe's three, `scan([[1 1] 1]!4)` the Mande nesting. And `meter("4/4", 4)` with a level's share as its shorthand.
2. **Spelling an override at the tap:** a line's own share for a level (`step=&bar swing=…`), or its own tree.
3. **A division the tree doesn't hold, even within its node:** a sound change for a triplet over a swung pair; the event snapshots show which examples move before anything is decided.
4. **Two divisions of one node side by side** (jembe's binary and ternary, aligned): the mini-notation's comma, `scan([58 42, 25 33 42]!4)`, now or later.
5. **Jambot's axis** (T11's lean per level, T16's straight ternary default) as vectors onto the tree's shares (ruling 4).

## Follow-ups

- The probe above as a mode of `tools/groove.ts` with its test, so its numbers are reproducible.
- The literature review's working files (the papers' text, the Strudel and Tidal runs) are not committed; the sources are below.

## Sources

Friberg & Sundström 2002, Music Perception 19(3):333–349, https://doi.org/10.1525/mp.2002.19.3.333 · Honing & de Haas 2008, Music Perception 25(5):471–476, https://mcg.uva.nl/mcg-2023/papers/honing-haas-2008.pdf · Benadon 2006, Ethnomusicology 50(1):73–98, https://doi.org/10.2307/20174424 · Butterfield 2011, Music Theory Spectrum 33(1):3–26, https://doi.org/10.1525/mts.2011.33.1.3 · Collier & Collier 2002, Music Perception 19(3):463–483, https://doi.org/10.1525/mp.2002.19.3.463 · Ellis 1991, Perceptual and Motor Skills 73(3):707–713, https://doi.org/10.2466/pms.1991.73.3.707 · Corcoran & Frieler 2021, Music Perception 38(4):372–385, https://doi.org/10.1525/mp.2021.38.4.372 · Nelias et al. 2022, Communications Physics 5:237, https://doi.org/10.1038/s42005-022-00995-z · Datseris et al. 2019, Scientific Reports, https://doi.org/10.1038/s41598-019-55981-3 · Dittmar, Pfleiderer & Müller 2015, ISMIR, https://www.ismir2015.uma.es/articles/143_Paper.pdf · Prögler 1995, Ethnomusicology 39(1), https://doi.org/10.2307/852199 · Gouyon 2007, SBCM, https://compmus.ime.usp.br/sbcm/2007/papers/sbcm-2007-17.pdf · Naveda et al. 2009, SBCM, https://compmus.ime.usp.br/sbcm/2009/papers/sbcm-2009-0.pdf · Naveda et al. 2011, Journal of New Music Research 40(3):225–238, https://doi.org/10.1080/09298215.2011.603833 · Polak 2010, Music Theory Online 16(4), https://mtosmt.org/issues/mto.10.16.4/mto.10.16.4.polak.html · Polak & London 2014, Music Theory Online 20(1), https://www.mtosmt.org/issues/mto.14.20.1/mto.14.20.1.polak-london.html · Yang 2022, Musicologica Austriaca, https://www.musau.org/parts/neue-article-page/view/135 · Johnson & Gotham 2023, ISMIR, https://archives.ismir.net/ismir2023/paper/000010.pdf · Johansson 2017, Studia Musicologica Norvegica 43(1):58–89 · Frane 2017, Music Perception 34(3):291–302, https://doi.org/10.1525/mp.2017.34.3.291 · Ainsworth 2025, ZGMTH 22(1), https://storage.gmth.de/zgmth/pdf/1224 · Senn et al. 2016, Frontiers in Psychology, https://doi.org/10.3389/fpsyg.2016.01487 · London 2004, Hearing in Time (introduction) · Linn 2013, Attack Magazine, https://attackmagazine.com/?p=10694 · Ableton Live 12 manual, Using Grooves, https://www.ableton.com/en/manual/using-grooves/ · Strudel `pattern.mjs`, https://codeberg.org/uzu/strudel/raw/branch/main/packages/core/pattern.mjs · Tidal `UI.hs`, https://raw.githubusercontent.com/tidalcycles/Tidal/main/tidal-core/src/Sound/Tidal/UI.hs
