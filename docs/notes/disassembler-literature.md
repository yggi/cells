# The disassembler's literature: what to reuse, which swamps to avoid

Date: 2026-10-13 · Status: done (all 9 topics) · Issues: #365, the epic #364, the frame
[disassembler.md](disassembler.md)

## Introduction

**Why this note.** Before the disassembler grows further ([disassembler.md](disassembler.md), #364), #365 asked what
the literature already has: algorithms, datasets and metrics to reuse, and the dead ends others have spent years in.

**How it was done.**
- Nine topics, one a session, each answering five questions: the state of the art, what we take, what we leave, the
  nearest swamp, and our numbers against theirs.
- Every reference was opened and read at least to its abstract and results. Where only a record or a secondary
  account was readable, the reference says so.
- Where the literature and our code measure the same thing, ours was measured on the same files today: the bench,
  music21's key finders, probes of the importer. The leads are in the issue, not repeated here.

**What came out, in three lines.**
1. **Where we could compare, our methods hold up.**
   - Keys: 65 of 69, against 61–65 for five classic methods.
   - Voices: link F1 within 2 points of the best published on the sinfonias, by the field's own metric.
   - The description-length frame itself: shorter descriptions are measurably closer to analysts' readings.
2. **What the bench lacks is the field's ground truths and metrics, not its algorithms.** Most of what we take is
   measurement:
   - JKU-PDD (patterns), MCMA (voices), ASAP (beats), When-in-Rome (keys and chords), Essen and the GTTM database
     (phrases and grouping);
   - `mir_eval`'s metrics.
3. **The literature has solved by learning what we should load, and left open what is ours.**
   - Transcription and beats from performances are learned models, so we take them as loaders.
   - A repeated transformation found in a piece has no published finder: a path of transpositions shared by lines,
     one structure at two scales. That is where the project adds something.

The [summary and outlook](#summary-and-outlook) at the end distils the nine topics, the lessons that cut across them,
an order of work, and the decisions left for the owner.

## 1. Compression as analysis

**State of the art.**
- **Grammar induction.**
  - Sequitur [NW97] builds a grammar online in linear time, by two constraints: no pair twice, every rule used at
    least twice. Re-Pair [LM00] is offline: the most frequent pair becomes a rule, again and again, in linear time and
    space. That is our `fold/pairs.ts`.
  - The smallest grammar is NP-hard, and hard to approximate within a constant factor [CLL+05]. The best
    polynomial ratio proved is O(log(n/g*)). For Re-Pair the lower bound is now Ω(log n / log log n) [BHH+19]: no
    guarantee, but good in practice.
  - **On music**, Sidorov, Jones & Marshall [SJM14] take each voice of a fugue as a string of diatonic intervals
    (transposition-free, rhythm ignored). They search for the smallest grammar by iterative repeat replacement:
    - each step takes the "locally most compressive" repeat, F = L·N − (L + 1 + N), over maximal repeats (found by
      suffix array);
    - it backtracks over the w best candidates to a depth of 2–3 ("more … usually does not yield any further
      reduction").
  - Their results:
    - The rules match a musicologist's analysis of WTC I/10 (|G| = 217).
    - Their grammar is smaller than Sequitur's on two chorales: 50 against 59.
    - As a spell-checker: undoing one wrong note shrinks the grammar. The error ranks among the top 1.55 % (I/10)
      to 16.71 % (a Berlioz string part) of all notes.
- **MDL.** Rissanen [Ris78]: the best model is the shortest description. Grünwald [Grü04; Grü07] separates *crude*
  two-part MDL (minimise L(H) + L(D|H), with L(H) chosen by hand) from *refined* MDL. Its §1.4 names the weak spot of
  crude MDL: the hypothesis' code L(H) is arbitrary.
- **Point sets** (SIA and its family; Meredith's survey [Mer16] has the full text and every number below):
  - A piece is a set of points (onset, pitch), with every voice in it.
  - **SIA** [MLW02] finds every maximal translatable pattern (MTP), the points that a vector (Δt, Δp) maps onto other
    points. It takes Θ(kn² log n) time and Θ(kn²) space.
  - **SIATEC** adds each pattern's translational equivalence class (TEC): the pattern and every vector it occurs at.
    It takes O(kn³) time.
  - **COSIATEC** covers the piece greedily. At each step it takes the TEC with the best compression factor (points
    covered ÷ (pattern points + translators)), breaking ties by compactness.
  - Morphetic (diatonic) pitch works better than chromatic for tonal music.
  - On BWV 846's fugue (728 notes), COSIATEC reaches a compression factor of **2.90** (3.12 without its residual of
    26 notes). The subject's entries (less their first note) are one TEC.
  - **Folk-song tune families** (the Annotated Corpus, 360 melodies, 1-nearest neighbour on a compression distance):
    COSIATEC classifies **84 %**, against BZIP2's 12.5 %. BZIP2 compresses best (2.77 against 1.58) and still classifies
    worst.
  - **JKU-PDD themes and sections:** a mean three-layer F1 of about 0.49, rising to 0.71 for one piece. The journal
    version [Mer15] (best SIATECCompress variants): themes 45 % precision / 60 % recall; fugue subject and
    countersubject entries 21 % / 55 %.
  - **General-purpose compressors on fugues** [LM16]:
    - With no voice information, COSIATEC finds subject and countersubject entries at a mean F1 of **0.123**,
      against LZ77's 0.053.
    - Fed a voice at a time, LZ77 reaches **0.124**.
    - Across all algorithms, compression and F1 are significantly correlated.
  - **Later work:**
    - RecurSIA-RRT [Mer19] runs the cover recursively within each pattern: more compression, less precision.
    - SIATEC-C [Bjö22] is subquadratic in space and no less accurate on JKU-PDD. Plugged into COSIATEC, it didn't
      improve COSIATEC.
    - Maximal transformable patterns [Mer22] find patterns related by inversion, retrograde, augmentation and
      diminution in polynomial time. These classes improved folk-song classification but **not, on average,
      compression**.
- **IDyOM** (Pearce [Pea05], from Conklin & Witten's multiple viewpoints [CW95]) is a prediction model:
  - variable-order Markov models over several viewpoints (pitch, interval, scale degree, …), combined, long-term
    (the corpus) and short-term (the piece);
  - on 185 Bach chorale melodies (10-fold), pitch at **1.953 bits a note** with the viewpoints it selects, against
    2.342 for chromatic pitch alone (thesis §7.5);
  - since then, one model for expectation, segmentation, memory, similarity and meter [Pea18].

**What we take.**
1. **Sidorov's choice of repeat, as a variant of `fold/pairs.ts`.**
   - Our Re-Pair takes the *most frequent pair*. [SJM14] instead takes the repeat of any length that saves the most,
     F = L·N − (L + 1 + N), with a shallow backtrack, and beats the greedy grammar (50 against 59 on the chorales).
   - The bench decides whether it pays in our characters: a tool in `fold/index.ts`'s list, judged on `bare`. Only the
     algorithm is taken; the paper is CC BY 4.0.
   - Our `variants.ts` seeds (phrases grown from five steps) are already halfway there.
2. **The point-set view, for the higher-order tool.**
   - A TEC is a pattern and its vectors (Δt, Δp). With morphetic pitch, a canon per tonos is one TEC: the whole
     canon at vectors (a pass, +1 scale step), (two passes, +2), …
   - That is the *path shared by lines* that [disassembler.md](disassembler.md) names as the next tool, found
     without separating voices.
   - Take SIATEC's vector table (SIA's sorted inter-point vectors) as how `tools/disasm/higher.ts` looks for a path
     across lines. Port it: about 50 lines from [Mer16]'s pseudocode.
   - For reference runs, offline and outside the repo:
     - OMNISIA (Java, **GPL-3.0**, github.com/chromamorph/omnisia-recursia-rrt-mml-2019: SIA, SIATEC, COSIATEC,
       SIATECCompress, Forth, RecurSIA);
     - ostinato (Python SIATEC, **MIT**, github.com/pauldhein/ostinato).
     - The repo states no licence of its own, so no GPL code goes in.
3. **A comparable size column on the bench.**
   - Meredith's compression factor is notes ÷ (pattern points + translators).
   - Ours, as near as the cells allow: notes ÷ (notes written in cells + splices). Then `bare` stays the judge and the
     factor is the bridge to the literature (*Our numbers*, below).
4. **Sidorov's spell-check, as a corpus tool.**
   - Our Mutopia MIDI and the voices written are typeset by hand. A note whose correction shortens the fold a lot is
     a suspect. The same move as their Table 2, on `bare`.
5. **The name for what we do.**
   - `bare` plus `STRUCTURE` (15 %) and `SAID` (2 a step) is crude two-part MDL: the two constants are our hand-chosen
     L(H).
   - That is [Grü04] §1.4's objection, and the bench is our answer: the constants are tuned on phrases back, not
     argued.
   - [LM16]'s correlation (shorter is closer to the analyst) is the evidence that the frame holds.

**What we leave, and why.**
- **The smallest grammar as a target.** It is NP-hard, and [SJM14] saw no gain past a backtrack of 2–3. Take the
  better heuristic, not optimality.
- **Sequitur.** Online and greedier than Re-Pair, and worse on music ([SJM14]: 59 against 50). We have the whole piece.
- **COSIATEC as the folder.**
  - A cell is a line on a clock. A TEC is a set of points that can span voices and leave gaps, so it can't be printed
    as one cell unless the language grows a polyphonic, gapped cell (decision-sized: stop and recommend).
  - It also drops durations, and our fidelity gate (`sameNotes`) needs them.
  - So it is a reference and a finder, not the folder.
- **General-purpose compressors and normalised compression distance.** BZIP2 compresses best and classifies worst
  (12.5 %). Compression without the music's moves isn't analysis.
- **IDyOM, for now.**
  - It is GPL-3.0 Common Lisp, trained on a corpus, and it predicts. Its bits a note are a listener's surprise, not a
    piece's description.
  - It is a lead for the *heard* metric (topic 6): its information content predicts where listeners segment
    [Pea18]. That is where `tools/disasm/heard.ts` falls short on counterpoint.

**The nearest swamp.**
- **Too many patterns.**
  - SIA finds O(n²) patterns, and almost all of them are musically meaningless [Bjö22, §1].
  - A decade went into choosing among them: compactness trawlers, SIAR, categorisation, CFP [Mer16; Bjö22]. Each one
    trades precision against recall on five JKU-PDD pieces.
  - We have a selection principle they lack: the fold must play the notes and be shorter. Don't import the trawler
    zoo; use the point set to *find* candidates and let `bare` choose.
- **Richer transformations.** Inversion, retrograde and augmentation as pattern classes [Mer22] cost an algorithm
  each and didn't improve compression on folk songs. Evidence for the language question in
  [disassembler.md](disassembler.md): ask the canons, not the general case.

**The key question: is SIA an alternative to the voices step or a complement?** **A complement.**
- [LM16] measured both routes on Bach's fugues:
  - SIA without voices: F1 0.123;
  - a string compressor a voice at a time: 0.124.
  - The two are equal, and both are low.
- The voice route is the one the cells can print (a line a voice), and ours is better than the typesetters' split by
  hand (`voices.ts`: 96 % / 93 %).
- SIA adds what the voice route can't see:
  - a pattern handed between voices;
  - a pattern in two voices at once (a subject in thirds);
  - the shared path of a canon per tonos, found as one vector set.
- Run it after the voices, over all the notes, as the higher-order finder. Its patterns that cross voices are also
  evidence against the voice split (a check on `voices.ts`, not a replacement).

**Our numbers against theirs.**
- **WTC I/1 fugue (BWV 846), 728 notes.** It is the same note count as [Mer16]'s, so it is the same piece and the
  same notes. (`BENCH=… SET=wtc ONLY=wtc1-01-fugue,wtc1-10-fugue npx vitest run tools/disasm/bench.test.ts`, today.)

  | | ratio | unit |
  |---|---|---|
  | ours, a line a hand | 3,722 → 2,994 = **1.24** | characters (`bare`) |
  | ours, a line a voice (the typesetter's) | 3,722 → 2,620 = **1.42** | characters |
  | COSIATEC [Mer16] | **2.90** | points ÷ (pattern points + translators), durations dropped |

  This is not the same measure. A point or a vector costs COSIATEC 1, whatever its size. We count every character,
  durations and syntax included. The comparable column (*What we take*, 3) closes the gap.
- **WTC I/10 fugue, 811 notes, 2 voices:**
  - [SJM14]: |G| = 217 symbols, for intervals without rhythm.
  - Ours: 2,651 → 1,416 characters (1.87), with rhythm.
  - Not comparable either. A count of our tokens with durations stripped would be.
- **IDyOM's bits a note.** No counterpart: we describe a piece, it predicts from a corpus.

**Next.**
- #380: *the fold's choice of repeat* (Sidorov's F with a shallow backtrack, as a variant of `pairs.ts`, judged on
  the bench).
- #381: *the higher-order finder by translation vectors* (SIA's vector table over all notes, morphetic pitch).
  - Its test is the canon per tonos' plan (`higher.test.ts`).
  - It goes into `higher.ts`.
- The bench: a compression factor column comparable with COSIATEC's, and the spell-check as a corpus tool (later, with
  the corpus' own issue).
- Topic 2 (the JKU-PDD and its metrics): below.

**References** (each opened; DOIs checked against Crossref).
- [Bjö22] O. Björklund, "SIATEC-C: computationally efficient repeated pattern discovery in polyphonic music",
  ISMIR 2022. https://archives.ismir.net/ismir2022/paper/000006.pdf
- [BHH+19] H. Bannai, M. Hirayama, D. Hucke, S. Inenaga, A. Jeż, M. Lohrey, C. P. Reh, "The smallest grammar problem
  revisited", arXiv:1908.06428 (short version SPIRE 2016).
- [CLL+05] M. Charikar, E. Lehman, D. Liu, R. Panigrahy, M. Prabhakaran, A. Sahai, a. shelat, "The smallest grammar
  problem", IEEE Trans. Inf. Theory 51(7):2554–2576, 2005. doi:10.1109/TIT.2005.850116. The preprint was read
  ("Approximating the smallest grammar", 2002).
- [CW95] D. Conklin, I. H. Witten, "Multiple viewpoint systems for music prediction", JNMR 24(1):51–73, 1995.
  doi:10.1080/09298219508570672. Its number was read as cited in [Pea05]: 1.87 bits an event.
- [Grü04] P. Grünwald, "A tutorial introduction to the minimum description length principle", arXiv:math/0406077.
- [Grü07] P. Grünwald, *The Minimum Description Length Principle*, MIT Press, 2007. doi:10.7551/mitpress/4643.001.0001
- [LM00] N. J. Larsson, A. Moffat, "Off-line dictionary-based compression", Proc. IEEE 88(11):1722–1732, 2000.
  doi:10.1109/5.892708
- [LM16] C. Louboutin, D. Meredith, "Using general-purpose compression algorithms for music analysis", JNMR
  45(1):1–16, 2016. doi:10.1080/09298215.2015.1133656
- [Mer15] D. Meredith, "Music analysis and point-set compression", JNMR 44(3):245–270, 2015.
  doi:10.1080/09298215.2015.1045003. Read as its abstract (on vbn.aau.dk); the full text read is [Mer16]'s.
- [Mer16] D. Meredith, "Analysing music with point-set compression algorithms", in D. Meredith (ed.),
  *Computational Music Analysis*, Springer, 2016, 335–366. doi:10.1007/978-3-319-25931-4_13. Full text:
  https://vbn.aau.dk/ws/files/221242362/MeredithCMA2016.pdf
- [Mer19] D. Meredith, "RecurSIA-RRT: recursive translatable point-set pattern discovery with removal of redundant
  translators", arXiv:1906.12286 (MML 2019).
- [Mer22] D. Meredith, "Understanding and compressing music with maximal transformable patterns", arXiv:2201.11085.
- [MLW02] D. Meredith, K. Lemström, G. A. Wiggins, "Algorithms for discovering repeated patterns in multidimensional
  representations of polyphonic music", JNMR 31(4):321–345, 2002. doi:10.1076/jnmr.31.4.321.14162. No open full
  text; its algorithms were read in [Mer16].
- [NW97] C. G. Nevill-Manning, I. H. Witten, "Identifying hierarchical structure in sequences: a linear-time
  algorithm", JAIR 7:67–82, 1997. doi:10.1613/jair.374, arXiv:cs/9709102
- [Pea05] M. T. Pearce, *The construction and evaluation of statistical models of melodic structure in music
  perception and composition*, PhD thesis, City University London, 2005. https://openaccess.city.ac.uk/id/eprint/8459/
  Code: IDyOM, github.com/mtpearce/idyom, GPL-3.0.
- [Pea18] M. T. Pearce, "Statistical learning and probabilistic prediction in music cognition", Ann. N.Y. Acad. Sci.
  1423:378–395, 2018. doi:10.1111/nyas.13654
- [Ris78] J. Rissanen, "Modeling by shortest data description", Automatica 14(5):465–471, 1978.
  doi:10.1016/0005-1098(78)90005-5
- [SJM14] K. Sidorov, A. Jones, D. Marshall, "Music analysis as a smallest grammar problem", ISMIR 2014, 301–306.
  https://archives.ismir.net/ismir2014/paper/000226.pdf

## 2. Pattern discovery benchmarks

**State of the art.**
- **The task.** MIREX's *Discovery of Repeated Themes & Sections* ran from 2013 to 2017, captained by Collins and
  later by Janssen, Ren, Collins and Volk [MX13; MX17].
  - An algorithm reads one piece and returns patterns. A pattern is a set of (onset, pitch) points heard at least twice,
    each with its occurrences, exact or not.
  - There are four versions: symbolic or audio, crossed with polyphonic or monophonic. In the monophonic version a
    fugue's voices are laid end to end.
- **The data.**
  - The **JKU Patterns Development Database** (JKU-PDD, August 2013) [JKU] is public: 5 pieces, about 40 MB without
    audio.
    - Bach's fugue BWV 889 (WTC II/20), Beethoven op. 2/1 iii, Chopin op. 24/4, Gibbons' *The Silver Swan* and Mozart
      K. 282 ii.
    - Each comes as kern, csv (onset in crotchets, MIDI pitch, morphetic pitch, duration, staff), MIDI and a PDF of
      the score.
    - By my count (the readme's annotation folders): **27 polyphonic patterns**.
    - BWV 889 has 3 patterns, after Bruhn's analysis (subject and countersubjects): 21 occurrences over 733 notes.
  - The ground truth comes from Barlow & Morgenstern's dictionary of themes, Schoenberg, Bruhn, the repeat signs, and
    the captain's own annotations.
  - The **test database** (JKUPTD) is another 5 pieces. The results pages don't publish it.
  - **MTC-ANN** is monophonic: 360 Dutch folk songs, 1,657 annotated occurrences of motifs in 26 tune families
    [Ren20], under **CC BY-NC-SA 3.0** [MTC].
  - **BPS-Motif** [HHC+23] covers the first movements of Beethoven's 32 sonatas: 263 motifs, 4,944 occurrences, 28.9 %
    of 126,943 notes. Its repository states no licence.
- **The metrics** [MX13; mir_eval]:
  - Similarity between two occurrences is |P ∩ Q| / max(|P|, |Q|) (cardinality).
  - **Establishment** P/R/F: was each pattern found once, scored by its best match?
  - **Occurrence** P/R/F at c = .75 and .5: of the patterns found, were all their occurrences found?
  - **Three-layer** P/R/F (Meredith): F1 nested over notes, occurrences and patterns.
  - Also: first-five precision and target proportion, runtime, and the strict standard P/R/F, which needs exact
    patterns up to translation.
  - 2017 added *coverage* and *lossless compression* [MX17].
- **The results** (symbolic polyphonic, on the test database; means over 5 pieces, from MIREX's own csv files):

  | year | algorithm | F_est | F_occ(.75) | three-layer F | standard F |
  |---|---|---|---|---|---|
  | 2014 | SIATECSegment (DM10, Meredith) | 0.55 | 0.64 | 0.46 | 0.00 |
  | 2014 | motives_poly (NF2, Nieto & Farbood) | 0.40 | 0.52 | 0.29 | 0.00 |
  | 2016 | SIATECCompress-TLR (DM3, Meredith) | 0.54 | 0.61 | 0.46 | 0.00 |

  - Every algorithm scores standard F about 0: none finds a pattern exactly.
  - In 2013 the captain's conclusion: repeated sections are "addressed well"; themes and motifs "require more
    attention" [MX13 results].
  - **In 2017, compression and retrieval disagreed.** The compression measures were "not highly correlated" with
    retrieval. Overlapping patterns (a motif inside a theme, as annotators write them) compress worse [MX17].
- **On JKU-PDD itself, the numbers depend on who ran the code** [HHC+23 Table 2b]. Their Python SIA family:

  | algorithm | three-layer F |
  |---|---|
  | SIATEC | 0.12 |
  | COSIATEC | 0.10 |
  | SIATECCompress | 0.15 |
  | their own motif finder | 0.16 (F_est 0.34) |

  Meredith's own runs of the same family reach about 0.49 (topic 1, [Mer16], "Segment" mode).
- **What the algorithms agree on** [Ren20]:
  - They diverge from the annotators and from each other.
  - Rhythmic features explain most of the gap: many algorithms ignore meter.
  - Ren et al. recommend inspecting and choosing algorithms per application over a single ranking, and synthetic
    pieces with planted patterns.

**What we take.**
1. **JKU-PDD as the bench's pattern ground truth, fetched rather than committed.**
   - No licence is stated, and the kern comes from KernScores. So a script downloads the zip into a gitignored cache.
     Unlike `midi/`, which is committed, these files stay out of the repo.
   - A loader reads its csv: onset, MIDI pitch, duration, staff, a staff a track.
   - The readme discourages its MIDI files: they are shifted and end with an extra quiet note.
   - BWV 889 comes with it; it is a fugue that isn't in `midi/wtc` yet.
2. **The fold's patterns, in MIREX's format.**
   - A cell spliced twice or more is a pattern, and each place it plays is an occurrence: `engine/time/structure.ts`
     already gives each node's cell, output and time.
   - A copy (`base=`) is an inexact occurrence of its base, as JKU's are.
   - Occurrences are written as (onset in crotchets, MIDI pitch): MIREX's output format.
3. **The metrics, ported from mir_eval** (`mir_eval.pattern`, **MIT**) to TypeScript in `tools/disasm/`.
   - Port: establishment, occurrence (.75) and three-layer P/R/F.
   - The JKU zip has a test fixture for free: seven made-up outputs for the Mozart piece and the MATLAB scores in
     `matlab/results/results.txt`. Algorithm 1 is the ground truth itself, which must score 1.
4. **The scoring rule for the bench:** three-layer F and establishment F as the headline, occurrence F (.75) beside
   them, per piece, with the means over the 5. Those are the columns MIREX and [HHC+23] report.

**What we leave, and why.**
- **The audio versions:** synthesised from the same kern files. The audio layer is its own epic.
- **The monophonic versions:** they lay voices end to end, which is our voices step done by hand.
- **MTC-ANN, for now.** It is non-commercial share-alike and its tunes are monophonic, so it tests the folder's motifs
  but not voices. It is a later corpus, if folk tunes become a set.
- **BPS-Motif, for now.** Its repository has no licence, it is only first movements, and its motifs are short. It is
  the next pattern corpus if its licence is clarified, and the largest there is.
- **First-five measures and runtime.** We don't rank our patterns, and time is already a column.

**The nearest swamp.**
- **Tuning to five pieces.**
  - The development and test databases are 5 pieces each.
  - Implementation, "mode" (raw, segment or bounding box) and post-processing move the same algorithm family from
    0.10 to 0.49 on them.
  - A bench number is a reading, not a target. The gates stay fidelity and size; pattern F is reported and never
    tuned on.
- **Compression against annotations.**
  - [LM16] (topic 1) found shorter descriptions closer to the analysts; MIREX 2017 found compression and retrieval
    poorly correlated.
  - Both are true: annotators nest patterns (a motif inside a theme), and a cover that partitions the notes can't
    report both levels.
  - Our splice tree does nest. So report every level of the tree as patterns, not only the cover's top.

**The key question: can the bench run on it, and how do we score?** **Yes, with a loader and a writer.**
- The loader reads JKU's csv into notes.
- The writer turns the fold's splice tree into MIREX patterns.
- The score is a port of mir_eval's three metrics, checked against JKU's own `results.txt`.
- Nothing in the language or the folder changes.

**Our numbers against theirs.** None yet: the bench can't read JKU-PDD until the loader exists. Two partial
readings:
- The ratchet's *phrases back* (`fold/ratchet.slow.test.ts`: 62 of 191 over the examples) is an establishment recall
  at similarity 1, on our own examples rather than on annotations.
- The bench has no fugue in common with JKU-PDD: BWV 889 is not in `midi/wtc`.

**Next.**
- #383: *the bench reads JKU-PDD and scores the fold's patterns* (the loader, the writer, the metrics port with
  its fixture).
- Topic 3 (voice separation): below.

**References.**
- [HHC+23] Y.-W. Hsiao, T.-Y. Hung, T.-P. Chen, L. Su, "BPS-Motif: a dataset for repeated pattern discovery of
  polyphonic symbolic music", ISMIR 2023, 281–288 (CC BY 4.0). https://archives.ismir.net/ismir2023/paper/000032.pdf
  Data: github.com/Wiilly07/Beethoven_motif (no licence stated). Code: github.com/Tsung-Ping/motif_discovery.
- [JKU] T. Collins, JKU Patterns Development Database, August 2013.
  http://tomcollinsresearch.net/research/data/mirex/JKUPDD-noAudio-Aug2013.zip (downloaded and read: the readme,
  the ground truth folders, the MATLAB example results; no licence stated).
- [mir_eval] `mir_eval.pattern`, MIT. https://mir-eval.readthedocs.io/stable/api/pattern.html,
  github.com/mir-evaluation/mir_eval
- [MTC] The Meertens Tune Collections, CC BY-NC-SA 3.0. https://www.liederenbank.nl/mtc/
- [MX13] T. Collins, "2013: Discovery of Repeated Themes & Sections", MIREX wiki (task, data, metrics).
  https://music-ir.org/mirex/wiki/2013:Discovery_of_Repeated_Themes_%26_Sections. Results:
  https://music-ir.org/mirex/wiki/2013:Discovery_of_Repeated_Themes_%26_Sections_Results. 2014 and 2016 results:
  the same pages for those years, and their csv files (`/mirex/results/<year>/drts/symPolyResults<year>.csv`).
- [MX17] B. Janssen, I. Ren, T. Collins, A. Volk, "2017: Discovery of Repeated Themes & Sections Results", MIREX
  wiki. https://music-ir.org/mirex/wiki/2017:Discovery_of_Repeated_Themes_%26_Sections_Results
- [Ren20] I. Y. Ren, A. Volk, W. Swierstra, R. C. Veltkamp, "A computational evaluation of musical pattern discovery
  algorithms", arXiv:2010.12325.

## 3. Voice separation

**State of the art.**
- **What a voice is.**
  - Cambouropoulos [Cam08] separates the *voice* a score writes from the *stream* a listener hears. A stream may hold
    synchronous notes (a chord), and a voice in the narrow sense is monophonic.
  - Most methods and every benchmark below take monophonic voices.
  - Kilian & Hoos [KH02] allow chords in a voice (stochastic local search over slices, a cost for voice leading and
    for grouping). They show their results on typical problems, not with a benchmark number.
  - So does the piano engraving work of 2024 [FKN+24].
- **Rule-based and probabilistic methods:**
  - **Chew & Wu's contig mapping** [CW04] is what `fold/voices.ts` follows.
    - It cuts the piece into *contigs* where the number of sounding voices is constant, and connects voices across contig boundaries by the smallest pitch distance.
    - Its project sheet reports "90 % precision on Bach's pieces" [VoSA]. As de Valk et al. tabulate it, its *average
      voice consistency* is 84.39 % on 48 fugues of 3–5 voices [dVWB13, Table 5].
    - I could not read the paper itself (Springer, no open copy). Its method is read from these secondary sources and
      our own code's comment.
  - **Jordanous** [Jor08], a Markov model learned per note, scores note precision / recall 80.88 / 80.85 on 45
    fugues of 3–4 voices (as tabulated in [dVWB13]).
  - **Duane & Pardo** [DP09] cast it as constraint satisfaction plus sequence alignment. They define the metric that
    became standard: precision and recall over *links*, pairs of notes that are consecutive in one voice.
  - **McLeod & Steedman** [MS16] use an HMM over voice assignments with Huron's two principles (small pitch steps,
    short gaps), with an incremental, pruned search. It works on performed MIDI too. Code: Java, **MIT**.
- **Learned methods:**
  - **de Valk et al.** [dVWB13] use a neural network over note features, built for lute tablature and also tested on
    the first 10 fugues of WTC I: **soundness / completeness 94.07 / 93.42**.
  - **Gray & Bunescu** [GB20] rank voices per note or per chord, with a voice allowed to split and to merge:
    - 95.30 / 96.01 on the same 10 fugues;
    - 95.72 / 95.90 on 30 inventions and sinfonias plus 48 fugues.
  - **Karystinaios, Foscarin & Widmer** [KFW23] treat it as link prediction with a graph neural network.
    - They trained on 1,136 pieces: MCMA and KernScores (chorales, Haydn and Mozart quartets). Code: Python, **MIT**.
    - Link F1, with McLeod & Steedman's numbers as they report them:

    | set | McLeod & Steedman | graph network |
    |---|---|---|
    | Inventions | 0.992 | 0.997 |
    | Sinfonias | 0.982 | 0.985 |
    | WTC I fugues (12) | 0.964 | 0.976 |
    | WTC II fugues (12) | 0.964 | 0.972 |
    | Haydn quartets | 0.781 | 0.872 |

    - Before scoring they keep only the highest note where a voice sounds two at once, which removes 0.72 % of the
      notes (as McLeod did).
  - **Foscarin, Karystinaios et al.** [FKN+24] separate homophonic voices (chords allowed) and staves for piano:
    voice F1 96.6 on J-Pop, 89.9 on the DCML Romantic corpus. Code: **MIT**.
- **The metrics** [MS18 §2.2; dVWB13 §7]:
  - **Average voice consistency** (Chew & Wu): one note a voice scores 100 %.
  - **Note precision / recall** (Jordanous).
  - **Soundness / completeness** (Kirlin & Utgoff [KU05]): of the consecutive pairs in a voice found, the share in
    one voice written, and the other way round.
  - **Link P/R/F1** (Duane & Pardo): the same pairs, as a binary classification.
  - McLeod's MV2H [MS18] uses link F1 for its voice score, after removing notes the transcription missed.
  - The definitions aren't always used as written: de Valk et al. note that Madsen & Widmer's (2006) text and
    numbers disagree.

**The key question: are their numbers comparable to our 96 % / 93 %, and which metric?**
- **The metric is the same kind.** `voiceAgreement` (`tools/disasm/truth.ts`) is soundness and completeness: pairs of
  notes one after another in a voice found, and in a voice written. That is the link P/R the field reports. Keep it,
  and report F1 beside it.
- **The numbers are close but not yet strictly comparable.** Three things differ:
  - **The ground truth:** our voices are Mutopia's LilyPond voices (`tools/mutopia.py voice`). Theirs are KernScores'
    spines or MCMA's tracks.
  - **The pieces:** ours are those whose voices are clean, 29 of 3 voices or more. Theirs are all 12 fugues of a book,
    or 10.
  - **The preprocessing:** a chord in a written voice is kept in ours and cut to its top note in theirs. A unison
    counts once in ours, and is dropped as a duplicate in theirs.
- With that said, ours against theirs by set (`BENCH=… SET=<set> npx vitest run tools/disasm/bench.test.ts`, today):

  | set | ours P / R (files) | ours F | McLeod F | graph network F |
  |---|---|---|---|---|
  | Sinfonias | 97 / 96 (15) | ≈ 96.5 | 98.2 | 98.5 |
  | WTC fugues | 95 / 90 (13) | ≈ 92.4 | 96.4 | 97.2–97.6 |
  | Ricercar a 3 | 96 / 96 (1) | 96 | — | — |
  | all | 96 / 93 (29) | ≈ 94.5 | | |

  The first 10 fugues of WTC I, de Valk et al.: 94.07 / 93.42.
- **Reading:**
  - On the sinfonias we are within 2 points of the best published, with no training and three constants.
  - On the fugues our **recall** lags by about 6 points: we split a written voice where they keep it.
  - That is where to look: a voice crossing (our cost `CROSS` penalises it heavily), and an entry after a long rest. McLeod's
    gap probability handles the second.
  - Our constant `THICK` was tuned on these same 29 pieces. Theirs are trained or tuned elsewhere and tested
    held-out, so ours is a little flattered.

**What we take.**
1. **The metric's name and its F1:** soundness / completeness = link P/R, F1 beside them in the bench.
   - A strict mode with their preprocessing (a voice's top note where it holds a chord) makes the numbers directly
     comparable.
   - Where: `tools/disasm/truth.ts`, `bench.test.ts`.
2. **MCMA** [AKMN21] as the voice ground truth for comparison. It is **CC BY 4.0**, one track a voice.
   - It has the WTC (both books), the Inventions and Sinfonias, the Goldberg Variations, and **the Art of Fugue
     (21)**: the issue's corpus lead.
   - Its pieces are the ones [KFW23] tested on, so the same files give the same comparison.
   - Fetch it as `midi/<set>/voices/` (a set of its own, not shipped).
3. **McLeod & Steedman's HMM (MIT) as an offline reference.** Run it on the same files to separate "our method" from
   "our ground truth" in the gap. Not ported: it is a Java tool.
4. **Two ideas for `voices.ts`, each to be judged on the bench:**
   - a gap term, so a voice can rest and come back (McLeod's second principle);
   - a voice crossing that is allowed when both voices continue by step.

**What we leave, and why.**
- **The graph networks in the app.** They are trained models in Python on PyTorch, with a few points to gain on Bach,
  and we have a rule-based method within reach of them. They are a ceiling to cite, not a dependency.
- **Average voice consistency.** It is gameable: one note a voice scores 100 % [MS18].
- **Cambouropoulos' streams, for counterpoint.** A fugue's voices are the written lines. For homophonic music (pop,
  the examples' chords), though, a *stream with chords* is what our IR already is: a line of chords. So [KH02] and
  [FKN+24] are the leads when the bench gets non-contrapuntal pieces. Note it, don't build it.
- **Global optimisation** (Duane & Pardo's constraint satisfaction). It is exponential in voices and length; the
  literature moved to incremental search and to learned links.

**The nearest swamp.**
- **The metric zoo and its definitions.** Five metrics, papers that mislabel them, and preprocessing that drops
  notes. A number without its ground truth, its pieces and its preprocessing isn't comparable.
  - We have already been bitten once: `disassembler.md` first had voices making the fold 6.6 % longer, from a
    heuristic split.
  - So the bench pins all three: MCMA, the same files, the strict mode.
- **Chasing the last points on Bach.** The graph network's 97–99 % comes from training on 1,000 pieces. The size gain is bounded: the typesetters' voices fold 6.1 % shorter than hands (64 files), and the importer's own split already saves 2.6 % over the library. Measure what a point of recall buys in `bare` before chasing it.

**Next.**
- #384: *voices on the literature's terms* (MCMA as `voices/`, link F1 and a strict mode, McLeod's HMM run
  offline on the same files).
- Topic 4 (meter, beat and tempo): below.

**References.**
- [AKMN21] A. Aljanaki, S. Kalonaris, G. Micchi, E. Nichols, "MCMA: a symbolic multitrack contrapuntal music
  archive", Empirical Musicology Review 16(1):99–105, 2021. https://mcma.readthedocs.io/ (collections: WTC I 48,
  WTC II 48, Goldberg 31, Kunst der Fuge 21, Inventions 15, Sinfonias 15). Licence CC BY 4.0, per the release
  announcement: https://auditory.org/postings/2020/657.html
- [Cam08] E. Cambouropoulos, "Voice and stream: perceptual and computational modeling of voice separation", Music
  Perception 26(1):75–94, 2008. doi:10.1525/mp.2008.26.1.75 (abstract read)
- [CW04] E. Chew, X. Wu, "Separating voices in polyphonic music: a contig mapping approach", CMMR 2004, LNCS 3310,
  1–20. doi:10.1007/978-3-540-31807-1_1 (not read in full: no open copy)
- [DP09] B. Duane, B. Pardo, "Streaming from MIDI using constraint satisfaction optimization and sequence alignment",
  ICMC 2009 (its metric read as described in [MS18] §2.2)
- [dVWB13] R. de Valk, T. Weyde, E. Benetos, "A machine learning approach to voice separation in lute tablature",
  ISMIR 2013, 555–560. https://archives.ismir.net/ismir2013/paper/000221.pdf
- [FKN+24] F. Foscarin, E. Karystinaios, E. Nakamura, G. Widmer, "Cluster and separate: a GNN approach to voice and
  staff prediction for score engraving", arXiv:2407.21030. Code: github.com/CPJKU/piano_svsep (MIT).
- [GB20] P. Gray, R. Bunescu, "From note-level to chord-level neural network models for voice separation in
  symbolic music", arXiv:2011.03028.
- [Jor08] A. Jordanous, voice separation by a Markov model (2008). Its numbers were read as tabulated in [dVWB13].
- [KFW23] E. Karystinaios, F. Foscarin, G. Widmer, "Musical voice separation as link prediction: modeling a musical
  perception task as a multi-trajectory tracking problem", IJCAI 2023, 3866–3874. doi:10.24963/ijcai.2023/430,
  arXiv:2304.14848. Code: github.com/manoskary/vocsep_ijcai2023 (MIT).
- [KH02] J. Kilian, H. H. Hoos, "Voice separation: a local optimisation approach", ISMIR 2002.
  https://www.cs.ubc.ca/~hoos/Publ/KilHoo02.pdf
- [KU05] P. Kirlin, P. Utgoff, "VOISE: learning to segregate voices in explicit and implicit polyphony", ISMIR 2005, 552–557. Its metric was read as defined in [MS18] and [dVWB13].
- [MS16] A. McLeod, M. Steedman, "HMM-based voice separation of MIDI performance", JNMR 45(1):17–26, 2016.
  doi:10.1080/09298215.2015.1136650 (abstract read; the full text is behind a 403). Code:
  github.com/apmcleod/voice-splitting (MIT).
- [MS18] A. McLeod, M. Steedman, "Evaluating automatic polyphonic music transcription", ISMIR 2018, 42–49.
  https://ismir2018.ismir.net/doc/pdfs/148_Paper.pdf
- [VoSA] E. Chew, X. Wu, VoSA project sheet, USC IMSC. https://infolab.usc.edu/imsc/research/project/vosa/vosa_tech.pdf

## 4. Meter, beat and tempo

For #347: a file played in falls on no grid, so it needs a tempo map from its notes.

**Where we are.**
- The importer takes the coarsest grid every start falls on, within a 96th of a quarter (`midiimport.ts` `gridOf`).
  The file's own tempo map becomes the scan of the steps.
- Nothing infers a beat from the notes. The time view draws the meter from the tempo cell, which is known, not found.
- The 10 examples that lose notes in the MIDI path ([ratchet.md](ratchet.md)) don't lose them to rubato:
  - **two clocks at a ratio:** Phase (80:81), 888 starts moved;
  - **ratchets and tuplets:** IDM, Cellscape 2;
  - **a motor slowing down:** Musicbox;
  - **pitches that are no MIDI key:** DTMF, the Metronome.
- So #347 has two problems, and the literature mostly addresses only the first:
  - a *performed* single pulse (rubato, loose starts);
  - *several* pulses at once.

**State of the art.**
- **Symbolic meter, from durations and onsets:**
  - Longuet-Higgins & Lee [LHL82; LHL84] infer meter from note lengths, building and discarding hypotheses as the
    sequence unfolds. Monophonic, and tested on examples. Their rule: prefer the reading that isn't syncopated.
  - Desain & Honing [DH89] quantise with a connectionist network, also monophonic and without a benchmark number.
  - Temperley [Tem09] uses one probabilistic model for meter, harmony and stream.
  - **Inner metric analysis** (PRIMA [dHV16]) gets meter and first downbeat from onsets alone:
    - duple / triple right in 94–97 % of ragtime and pop MIDI files, against MIDI Toolbox's autocorrelation at 74–76 %;
    - the exact time signature in 80–94 %.
- **Rhythm quantisation of performances:**
  - Cemgil & Kappen [CK03] treat tempo as the hidden state of a switching state-space model and quantisation as MAP
    inference, by particle filter or MCMC. Abstract read; their test pieces are small.
  - Nakamura, Yoshii & Sagayama [NYS17] use a **merged-output HMM, a voice at a time**, so voices may be loosely
    synchronised or polyrhythmic. On classical piano MIDI it beats the other methods by more than 12 points of
    accuracy on polyrhythmic pieces, and roughly ties the best elsewhere. Code released.
- **Meter and alignment of performed MIDI:** McLeod & Steedman [MS18b] use an HMM with a lexicalised PCFG of
  rhythms and label bar, beat and sub-beat. Code: Java, **MIT**. Their metrical F (every grouping at three levels):

  | method | metronomic (48 WTC fugues, 15 inventions) | live (13 WTC files, CrestMusePEDB) |
  |---|---|---|
  | Temperley [Tem09] | 67.7 | 47.6 |
  | McLeod & Steedman | 78.7 | 39.6 |
  | McLeod & Steedman, all options | 80.5 | 56.5 |

- **Neural beat tracking of performance MIDI:**
  - **PM2S** [LKMB22] uses a CRNN that predicts which notes fall on beats, then dynamic programming for the beats
    between notes. It outputs beats, downbeats, time signature, key, note values and hands. Code: PyTorch, **MIT**.
    - Beat F 85.7–86.2, downbeat F 63.3–69.8 on its own test set.
    - On MV2H, metrical alignment 61.7 against Finale's 9.9 and MuseScore's 15.3.
  - **A transformer, MIDI to beat tokens** [MH25]. On ASAP, beat / downbeat F as that paper measures them:

    | method | beat F | downbeat F |
    |---|---|---|
    | PM2S | 82.95 | 14.14 |
    | the transformer | 78.13 | 27.81 |
    | Shibata et al.'s HMM | 43.6–47.7 | ≈ 13.5 |

    On A-MAPS (score MIDI with its tempo varied), the transformer reaches 98.0 / 76.6.
  - **The pattern:** beats from a performance are nearly solved (≈ 80–86 F). **Downbeats are not** (14–28 F on
    real performances).
- **Audio** (for the audio epic, not #347):
  - Ellis [Ell07] estimates a global tempo, then runs dynamic programming over an onset-strength envelope: the local
    match against a transition cost for a steady beat. "Just under 60 %" beat accuracy on the MIREX-06 data. It
    follows tempo changes of ±10 %.
  - madmom [BKS+16] has RNN beat and downbeat trackers with a DBN. Code **BSD**; its trained models are
    **CC BY-NC-SA 4.0**.
- **Data: ASAP** [FMK+20] has 222 scores aligned with 1,067 performances (MIDI, about 92 h; audio via MAESTRO).
  - It has beats, downbeats, time and key signatures, and note alignments (n)ASAP.
  - Bach among its 15 composers. **CC BY-NC-SA 4.0**.

**What we take.**
1. **ASAP as #347's measure**, fetched and not committed, because it is NC. It is exactly the issue's "played files
   with known scores", with beats annotated. It is also the set the MIDI beat trackers report on, so our number sits
   in their table.
2. **The metric:** beat F at ±70 ms (`mir_eval.beat`, **MIT**), with the ratchet's own beside it: notes kept, their
   timing, the folded size. Downbeat F is reported but not targeted.
3. **The method in the app: Ellis' dynamic programming, over the notes instead of audio.**
   - The onset strength is the time engine's `impulses` signal (`time/signals.ts`), and the global tempo is the
     scalogram's strongest ridge in the beat band (`time/wavelet.ts` `ridges`).
   - It is pure TS, about 100 lines, no model, and it fits `engine/`'s rules. The beats become the tempo map (#347's
     step 1), and notes land on a grid within it.
   - PM2S (MIT) is run offline on ASAP as the reference to beat. A gap of more than about 10 points of beat F would
     argue for a learned model later; it shouldn't be guessed now.
4. **For several pulses** (Phase, IDM, Cellscape 2): Nakamura's idea, *a voice at a time*.
   - Run the grid finder (and later the beat tracker) per line, not per file. Each line gets its own clock:
     `ratchet.md`'s "a meter per clock".
   - The language already says a line on its own clock. This is the case the literature's single-pulse trackers
     can't handle and our IR can.
5. **Meter for a file without a time signature:** PRIMA's idea (inner metric analysis folded into a bar profile) is
   cheap and accurate (94–97 % duple / triple). It is a later step: our files carry their time signatures.

**What we leave, and why.**
- **Learned beat trackers in the app.** PM2S and the transformer are PyTorch models. The gain over a DP tracker on
  *our* files is unmeasured. Measure first (above).
- **Particle filters and switching state-space models** [CK03]: heavy, and the HMM and neural lines superseded them
  on the benchmarks.
- **Longuet-Higgins & Lee, Desain & Honing, Temperley:** historical, monophonic, or outperformed (Table 1 of
  [MS18b]). Their *preference for the unsyncopated reading* is still the right tie-break for the grid finder.
- **madmom in the app:** its models are non-commercial, and it is the audio epic's question.

**The nearest swamp.**
- **Bars from a performance.** Downbeat F is 14–28 on ASAP even for the best MIDI trackers.
  - Take the beat from the notes and the bar from the file's time signature, or from the fold (a phrase's length).
  - Don't promise bars from a played file.
- **Quantising away the performance.**
  - A played file's timing is much of what it is. #347 already asks for a tolerance the user chooses, and velocities
    as levels.
  - Keep the residual (what moved, and by how much) rather than snapping silently. The literature's MV2H scores
    quantisation, not keeping.
- **One pulse for everything.** Every benchmark above assumes one beat per piece. Our own losses are two clocks at
  80:81 and tuplets. Measure the per-line grid on the examples before tuning a single-pulse tracker on ASAP.

**Our numbers against theirs.**
- None on played files: we have no beat tracker yet, and ASAP isn't in the bench.
- On score MIDI the grid finder moves few notes. Measured today with `cellsFromMidi`'s `moved`:
  - the MIDI library (WTC, Inventions, Anna Magdalena, Offering): **122 notes in 24 of the 88 files**, at most 26
    (anh117b's polonaise). Most likely ornaments and tuplets in LilyPond's MIDI; not checked note by note;
  - the examples: every note in 64 of the 74.
- The 10 examples that lose notes are multi-clock or off-key pitches, not rubato. That is the A-MAPS end of the table
  (score MIDI, tempo varied), where the transformer gets 98 % beat F. The open ground is ASAP's: real performances.

**Next.**
- #387: *a beat tracker from the notes, measured on ASAP*: Ellis' DP over `impulses`, the scalogram's tempo,
  PM2S offline as the reference, beat F and the ratchet's measures. A step of #347.
- #388: *a grid per line* (ratchet.md's meter per clock), measured on the 10 examples that lose notes and the
  24 library files that move some.
- Topic 5 (key and harmony): below.

**References.**
- [BKS+16] S. Böck, F. Korzeniowski, J. Schlüter, F. Krebs, G. Widmer, "madmom: a new Python audio and music signal
  processing library", ACM Multimedia 2016, 1174–1178. doi:10.1145/2964284.2973795, arXiv:1605.07008. Code:
  github.com/CPJKU/madmom (BSD; models CC BY-NC-SA 4.0).
- [CK03] A. T. Cemgil, B. Kappen, "Monte Carlo methods for tempo tracking and rhythm quantization", JAIR 18:45–81,
  2003. doi:10.1613/jair.1121, arXiv:1106.4863 (abstract read).
- [DH89] P. Desain, H. Honing, "The quantization of musical time: a connectionist approach", Computer Music Journal
  13(3):56–66, 1989. doi:10.2307/3680012 (record only: no open copy read).
- [dHV16] W. B. de Haas, A. Volk, "Meter detection in symbolic music using inner metric analysis", ISMIR 2016.
  https://archives.ismir.net/ismir2016/paper/000033.pdf
- [Ell07] D. P. W. Ellis, "Beat tracking by dynamic programming", JNMR 36(1):51–60, 2007.
  doi:10.1080/09298210701653344
- [FMK+20] F. Foscarin, A. McLeod, P. Rigaux, F. Jacquemard, M. Sakai, "ASAP: a dataset of aligned scores and
  performances for piano transcription", ISMIR 2020. https://zenodo.org/records/4245490 Data: github.com/CPJKU/asap-dataset (CC BY-NC-SA 4.0; read
  from its README).
- [LHL82] H. C. Longuet-Higgins, C. S. Lee, "The perception of musical rhythms", Perception 11(2):115–128, 1982.
  doi:10.1068/p110115 (abstract read)
- [LHL84] H. C. Longuet-Higgins, C. S. Lee, "The rhythmic interpretation of monophonic music", Music Perception
  1(4):424–441, 1984. doi:10.2307/40285271 (abstract read)
- [LKMB22] L. Liu, Q. Kong, V. Morfi, E. Benetos, "Performance MIDI-to-score conversion by neural beat tracking",
  ISMIR 2022. https://zenodo.org/records/7316682 Code: github.com/cheriell/PM2S (MIT).
- [MH25] S. Murgul, M. Heizmann, "Beat and downbeat tracking in performance MIDI using an end-to-end transformer
  architecture", arXiv:2507.00466.
- [MS18b] A. McLeod, M. Steedman, "Meter detection and alignment of MIDI performance", ISMIR 2018, 113–119.
  https://ismir2018.ismir.net/doc/pdfs/136_Paper.pdf Code: github.com/apmcleod/met-align (MIT).
- [NYS17] E. Nakamura, K. Yoshii, S. Sagayama, "Rhythm transcription of polyphonic piano music based on merged-output
  HMM for multiple voices", IEEE/ACM TASLP 25(4):794–806, 2017. arXiv:1701.08343 (abstract read)
- [Tem09] D. Temperley, "A unified probabilistic model for polyphonic music analysis", JNMR 38(1):3–18, 2009.
  doi:10.1080/09298210902928495 (its numbers read as [MS18b] reports them)

## 5. Key and harmony

**Where we are.**
- **One key for a piece:** `fold/degrees.ts` `bestKey` takes, of 36 keys (major, natural and harmonic minor on 12
  tonics), the one whose notes need the fewest accidentals. Ties go to the tonic the bass ends on.
- **Keys per section:** `fold/sections.ts` runs a Viterbi a bar at a time over 36 collections. A change of key costs 12
  accidentals, and an area lasts at least 2 bars.
- **Chords:** none as such. `figure.ts` finds a figure over a table of chords, but doesn't name them.

**State of the art.**
- **Key profiles:**
  - Krumhansl & Kessler [KK82] measured how well each pitch class fits a key, by listeners' ratings: the *probe-tone
    profiles*.
  - The **Krumhansl–Schmuckler** algorithm [Kru90] correlates a piece's duration-weighted pitch-class distribution
    with the 24 rotated profiles.
  - **Temperley** [Tem99] revised it in four ways: a simpler match, new profile values, pitch classes *present or
    absent* per short segment instead of summed durations, and a penalty for changing key between segments. Tested on
    the 48 WTC fugue subjects and the Kostka–Payne excerpts.
  - **Bayesian:** Temperley's MIREX 2005 model [Tem05] finds the most probable key *structure* (a key per segment,
    staying in key with probability 0.998). It got 1,127 of 1,252 excerpts right (91.4 % with partial credit).
  - **Trained on corpora:** Albrecht & Shanahan [AS13] use Euclidean distance instead of correlation, trained on 490
    kern pieces and tested on 492. They are better than the earlier models, especially on **minor-mode pieces, where
    most models are weaker**.
- **Geometry:** Chew's spiral array [Che00; Che02] puts pitches, chords and keys on one helix. Its *centre of effect*
  of the notes so far, nearest to a key, finds the key of the 24 WTC I fugue subjects sooner on average than the
  earlier methods (thesis abstract). It also finds key boundaries.
- **Chords:** Pardo & Birmingham [PB02] split chord labelling into segmenting the music and labelling the segments.
  Abstract only, via a review of the issue.
- **Functional harmony (Roman numerals) by neural networks** [NGF21], AugmentedNet. Accuracy on the held-out test
  sets, a frame at a time:

  | test set | key | full Roman numeral |
  |---|---|---|
  | all six datasets | 82.9 | 46.4–51.5 |
  | WTC I preludes | 77.2 | 46.2–47.9 |
  | BPS | 85.0 | 45.4 |

  Earlier models are lower (Chen & Su 2018–21; Micchi et al. 2020). Code on GitHub.
- **Data for harmony:** **When-in-Rome** [WiR] gathers Roman-numeral analyses in RomanText. Among them are **all 24
  preludes of WTC I** and the 371 chorales. New content is **CC BY-SA 4.0**; analyses from elsewhere keep their own
  licences.

**The key question: does our Viterbi over accidentals hold up against these on the 69 named keys?**
- **For the one key of a piece, yes.**
  - I ran music21's (**BSD-3**) implementations of the profile methods on the same 69 MIDI files: WTC 37, Inventions
    and Sinfonias 30, the two ricercars. Each profile method correlates duration-weighted pitch classes with its
    profiles.

    | method | right, of 69 |
    |---|---|
    | **ours** (`bestKey`) | **65** |
    | Krumhansl–Schmuckler | 64 |
    | Aarden–Essen | 64 |
    | Bellman–Budge | 62 |
    | Temperley–Kostka–Payne | 61 |
    | Sapp's simple weights | 65 |

  - **The errors are complementary.** Ours misses 4, and every profile method gets those 4 right:

    | piece | written | ours |
    |---|---|---|
    | Invention 2 | C minor | B♭ major |
    | Invention 9 | F minor | E♭ major |
    | Sinfonia 7 | E minor | D major |
    | WTC I/12 fugue | F minor | E♭ major |

    Each is **a minor piece read as the major a tone below its tonic**. That major is the tonic's Dorian: B♭ major holds C minor's ♭3 and ♭7 and the raised 6th of its melodic minor. Our key counts accidentals and nothing else, so a piece that uses the melodic minor going up and the natural minor going down reads best there. That is my reading of the four, not checked note by note.
  - The profile methods miss 14 other files that ours gets right. They give the relative major or minor (WTC I/11 prelude, F major → D minor by four of the five), or a key a fifth away.
  - A vote of the six gets **68 of 69**.
  - A simpler rule gets 68 as well: take Krumhansl–Schmuckler's key where it agrees with Aarden–Essen and differs
    from ours. That fixes our 4 and breaks one (WTC I/11 prelude).
  - 69 files are too few to choose between the two rules; the finding is that the methods' errors don't overlap.
- **For keys per section, not measured.** Our corpus names one key a piece and no local keys.
  - AugmentedNet's frame-wise key accuracy (77–89 %) is the comparable number.
  - When-in-Rome's WTC I preludes give local keys to measure `sections.ts` against.

**What we take.**
1. **A profile's tonic weighting as `bestKey`'s tie-break** instead of the last bass alone.
   - It goes where the accidentals are close: within a few accidentals of the best, take the key whose
     Krumhansl–Schmuckler correlation is highest.
   - That is the minor pieces' fix, measured above. The profiles are published numbers [KK82]; take them as music21
     has them.
   - Where: `fold/degrees.ts`. Judge it on the bench's keys (69) and the ratchets: a key changes the degrees, and so
     the fold.
2. **When-in-Rome's WTC I preludes as ground truth for local keys and chords.**
   - Local keys: `sections.ts` against the analysts' keys, a frame at a time, AugmentedNet's measure.
   - Chords: `figure.ts`'s chord tables against the Roman numerals' roots and qualities. BWV 847's prelude (I/2) is the example that already folds into a figure over chords. The other figuration preludes among the 24 (I/1 first) are the test.
   - CC BY-SA 4.0: fetch it, don't commit it (#365's rule for data with terms).
3. **Temperley's two revisions for `sections.ts`.**
   - *Pitch classes present per segment* rather than counted. Our accidentals are counted per note, so a long run of
     one chromatic note weighs heavily.
   - A *probabilistic* change cost instead of the fixed 12 (`SWITCH`), so its size has a meaning.
   - Both are judged on When-in-Rome's local keys before anything changes.

**What we leave, and why.**
- **AugmentedNet and the neural Roman-numeral models in the app.** They are trained models, at 46–52 % for a full
  Roman numeral, and the language has no Roman numerals. We need the key and the chord's notes, which the fold
  already has. They are a reference.
- **The spiral array as the key finder.** Its strength is speed (fewest notes to the key), which a whole-file
  importer doesn't need. Its *geometry* (keys, chords and pitches as one space) is topic 9's.
- **Chord labelling in its own right** [PB02]. The cells say chords as tables of notes; naming them is for display,
  not the fold.

**The nearest swamp.**
- **Functional harmony as a target.** Even the best model gets a full Roman numeral right about half the time, on
  analyses that differ between analysts. The fold needs *which notes are a chord, and which key reads them*, not
  their names.
- **Tuning on 69 files.** Every method here is between 61 and 65. Two more right is a vote's worth, so take the
  complementary signal, not a new constant.

**Our numbers against theirs.** Above:
- **Global key:** ours 65 / 69, the five profile methods 61–65 / 69, a vote 68 / 69, all on the same files.
- **Local keys and chords:** not yet measured.

**Next.**
- #389: *the key's tie-break by a profile, and When-in-Rome's WTC I preludes for local keys and chords*.
- Topic 6 (structure and form): below.

**References.**
- [AS13] J. Albrecht, D. Shanahan, "The use of large corpora to train a new type of key-finding algorithm", Music Perception 31(1):59–67, 2013. doi:10.1525/mp.2013.31.1.59 (abstract
  read)
- [Che00] E. Chew, *Towards a mathematical model of tonality*, PhD thesis, MIT, 2000.
  https://dspace.mit.edu/handle/1721.1/9139 (abstract as the repository record summarises it; the page itself was rate-limited)
- [Che02] E. Chew, "The spiral array: an algorithm for determining key boundaries", ICMAI 2002, LNCS 2445, 18–31.
  doi:10.1007/3-540-45722-4_4 (record only)
- [KK82] C. L. Krumhansl, E. J. Kessler, "Tracing the dynamic changes in perceived tonal organization in a spatial
  representation of musical keys", Psychological Review 89(4):334–368, 1982. doi:10.1037/0033-295X.89.4.334 (record;
  its profiles used as music21 implements them)
- [Kru90] C. L. Krumhansl, *Cognitive Foundations of Musical Pitch*, Oxford University Press, 1990 (2001 online).
  doi:10.1093/acprof:oso/9780195148367.001.0001 (record)
- [music21] `music21.analysis.discrete`: KrumhanslSchmuckler, AardenEssen, TemperleyKostkaPayne, BellmanBudge,
  SimpleWeights; music21 10.5.0, BSD-3-Clause. The run was a one-off script over `midi/` (not committed); its results are above.
- [NGF21] N. Nápoles López, M. Gotham, I. Fujinaga, "AugmentedNet: a Roman numeral analysis network with synthetic
  training examples and additional tonal tasks", ISMIR 2021.
  https://archives.ismir.net/ismir2021/paper/000050.pdf Code: github.com/napulen/AugmentedNet.
- [PB02] B. Pardo, W. P. Birmingham, "Algorithms for chordal analysis", Computer Music Journal 26(2):27–49, 2002.
  doi:10.1162/014892602760137167 (not read: no open copy; its scheme as a review of the issue describes it)
- [Tem05] D. Temperley, "A Bayesian key-finding model", MIREX 2005 abstract.
  https://music.informatics.indiana.edu/courses/I546/pdf/temperley.pdf
- [Tem99] D. Temperley, "What's key for key? The Krumhansl–Schmuckler key-finding algorithm reconsidered", Music
  Perception 17(1):65–100, 1999. doi:10.2307/40285812 (abstract read)
- [WiR] M. Gotham et al., When in Rome: Roman-numeral analyses in RomanText. github.com/MarkGotham/When-in-Rome (new
  content CC BY-SA 4.0; WTC I preludes 24, chorales 371; read from its README)

## 6. Structure and form

**Where we are.**
- **Sections by key:** `sections.ts`.
- **Boundaries heard in the scalograms:** `time/boundaries.ts`, with three finders:
  - cones (Mallat & Hwang);
  - novelty (Foote 2000);
  - swells.
- **The fold's splice tree** (`time/structure.ts`): which cell plays where, nested.
- **Two measures, both boundary precision / recall within a tolerance** of at least 1 s:
  - Swells against the examples' written sections find about 60 % at 56–72 % precision, chance 19 %
    ([scalogram.md](scalogram.md)).
  - The fold's phrases against the swells (`tools/disasm/heard.ts`): dances 52 / 30 (chance 27), counterpoint
    25 / 24 (chance 20) ([disassembler.md](disassembler.md)).

**State of the art.**
- **Audio structure analysis.** Paulus, Müller & Klapuri [PMK10] sort methods three ways:
  - **repetition** (the fold's kind: what comes back);
  - **novelty** (Foote's checkerboard kernel on a self-similarity matrix [Foo00]: what changes);
  - **homogeneity** (what stays alike: the swells are closest to it).

  "None of the approaches is clearly superior." Two people annotating the same pieces agree at **89.4 %** F, where a
  method reached **62.4 %**.
- **McFee & Ellis' spectral clustering** [ME14] reads repetition structure off the eigenvectors of a recurrence
  graph, and gives a hierarchy of segmentations, one per number of segment types. Boundary F at 0.5 s and at 3 s:

  | corpus | McFee & Ellis | with the best level per piece | Serrà et al. |
  |---|---|---|---|
  | Beatles (174) | 0.31 / 0.58 | 0.41 / 0.68 | 0.29 / 0.70 |
  | SALAMI (735) | 0.30 / 0.46 | 0.41 / 0.58 | — |

  Code: librosa.
- **Symbolic phrase boundaries** (melodies, Essen folk songs [PMW08]). Precision / recall / F1 against the phrase
  marks:

  | model | P | R | F1 |
  |---|---|---|---|
  | a logistic hybrid of the four below | 0.87 | 0.56 | 0.66 |
  | Temperley's Grouper | 0.71 | 0.62 | 0.66 |
  | Cambouropoulos' LBDM | 0.70 | 0.60 | 0.63 |
  | GTTM's GPR2a (a rest) | 0.99 | 0.45 | 0.58 |
  | IDyOM (unexpectedness) | 0.76 | 0.50 | 0.58 |
  | "always a boundary" | 0.13 | 1.00 | 0.22 |

  The journal version [PMW10] extends the comparison to listeners' boundaries.
- **GTTM implemented.** Hamanaka, Hirata & Tojo's ATTA [HHT05; HHT06] implements 26 of GTTM's 36 rules with adjustable parameters. Hand-tuned, it beats its default settings on 100 eight-bar melodies;
  its per-piece F-measures are in a figure we couldn't extract.
  - The **GTTM database** [HHT14] has 300 eight-bar monophonic classical pieces with grouping, metrical and time-span
    analyses (gttm.jp).
  - Two musicologists agreed on 267 of the 300. On the other 33, 233 of 2,310 time-spans differed.
- **Schenkerian reduction by learning.** Kirlin [KJ11; Kir15] represents an analysis as a maximal outerplanar graph
  and learns triangle probabilities from SCHENKER41 (41 excerpts, 907 triangles). The most probable analysis is found
  by dynamic programming.
  - Edge accuracy beats a random baseline (in a figure).
  - Three experts graded its analyses **half to a full letter grade below** the textbook's.
  - Marsden [Mar10] is the earlier proof of concept by search.

**What we take.**
1. **The literature's boundary metric, for comparison:** boundary F at 0.5 s and 3 s (`mir_eval.segment`, MIT), beside
   our tolerance-scaled score in `boundaries.ts` and `heard.ts`. Report both: ours scales with the phrase, theirs is
   what everyone else prints.
2. **Symbolic phrase boundaries as ground truth for the fold.**
   - Essen folk songs' phrase marks (music21 ships 31 ABC files of them; **non-commercial permission, legal status
     "unclear"**: offline only).
   - Score the fold's phrase starts (`time/structure.ts`) by boundary F1 against Grouper's 0.66, LBDM's 0.63, IDyOM's
     0.58 and "always"'s 0.22.
   - This asks what `heard.ts` asks, but against analysts instead of the sound. It is the symbolic counterpart of the
     counterpoint gap (25 / 24) that the swells leave.
3. **The GTTM database's grouping trees as ground truth for the splice tree's nesting:** 300 pieces, two analysts at
   267 / 300.
   - The fold is repetition-based and GTTM's grouping isn't. A large disagreement is a finding, not a bug.
   - The data's licence is not stated in the paper; check before fetching.
4. **The repetition / novelty / homogeneity frame** for `boundaries.ts`' docs. Our three finders map onto two of the
   three, and the fold is the third.

**What we leave, and why.**
- **Spectral clustering on audio** [ME14]. It is the audio epic's tool. On symbolic input, the fold's splice tree is a
  repetition hierarchy already, with exact rather than approximate repeats.
- **ATTA as an analyzer.** Dozens of hand-tuned parameters for GTTM's preference rules. GTTM's **well-formedness** is the useful part, already in the frame
  ([disassembler.md](disassembler.md), *Known swamps*).
- **Schenkerian reduction.** It is a reduction to the *Urlinie*, not a description of repetition. 41 excerpts of
  training data, graded a letter below a textbook. It is far from the fold's job.

**The nearest swamp.**
- **One true structure.** Annotators agree at 89 % on audio sections and 267 / 300 on GTTM trees. Hierarchies differ
  by level, and a method that picks its level per piece gains 10 points of F [ME14].
  - So score every level of the splice tree, and take the best match per piece as a reading, never as a target.
  - Report how far apart the analysts are, where a dataset has two.
- **GTTM in full** (confirmed). The preference rules interact, and the implementations spent a decade tuning them.
  Take well-formedness, and let description length prefer.

**Our numbers against theirs.**
- **Same kind of metric, different data.**
  - Our swells find the examples' written sections at about 60 % recall and 56–72 % precision with a tolerance of
    ≥ 1 s, close to F3-level tolerance. Audio methods reach F3 0.46–0.70 on SALAMI and the Beatles. Our examples'
    sections are cleaner than a song's, so this is not a win.
  - The fold's phrases against swells score F ≈ 0.38 in the dances and 0.24 in the counterpoint. That is not against
    annotations at all.
- The Essen and GTTM scores (*What we take*, 2–3) would put the fold in the literature's tables.

**Next.**
- #391: *the fold's structure against analysts* (Essen phrase boundaries offline, the GTTM database's grouping
  trees, boundary F at 0.5 / 3 s beside ours).
- Topic 7 (audio to notes): below.

**References.**
- [Foo00] J. Foote, "Automatic audio segmentation using a measure of audio novelty", IEEE ICME 2000, 452–455.
  doi:10.1109/ICME.2000.869637 (record; the method as `boundaries.ts` and [PMK10] describe it)
- [HHT05] M. Hamanaka, K. Hirata, S. Tojo, "ATTA: automatic time-span tree analyzer based on extended GTTM", ISMIR
  2005. https://archives.ismir.net/ismir2005/paper/000015.pdf
- [HHT06] M. Hamanaka, K. Hirata, S. Tojo, "Implementing 'A Generative Theory of Tonal Music'", JNMR 35(4):249–277,
  2006. doi:10.1080/09298210701563238 (record only)
- [HHT14] M. Hamanaka, K. Hirata, S. Tojo, "Musical structural analysis database based on GTTM", ISMIR 2014 (CC BY 4.0).
  https://archives.ismir.net/ismir2014/paper/000257.pdf Data: http://www.gttm.jp/
- [Kir15] P. B. Kirlin, D. D. Jensen, "Learning to uncover deep musical structure", AAAI 2015.
  https://www.cs.rhodes.edu/~kirlinp/papers/kirlin15using.pdf
- [KJ11] P. B. Kirlin, D. D. Jensen, "Probabilistic modeling of hierarchical music analysis", ISMIR 2011, 393–398.
  https://archives.ismir.net/ismir2011/paper/000091.pdf
- [Mar10] A. Marsden, "Schenkerian analysis by computer: a proof of concept", JNMR 39(3):269–289, 2010.
  doi:10.1080/09298215.2010.503898 (record only)
- [ME14] B. McFee, D. P. W. Ellis, "Analyzing song structure with spectral clustering", ISMIR 2014.
  https://archives.ismir.net/ismir2014/paper/000319.pdf
- [PMK10] J. Paulus, M. Müller, A. Klapuri, "Audio-based music structure analysis" (state of the art report), ISMIR
  2010, 625–636.
  https://www.audiolabs-erlangen.com/content/05_fau/professor/00_mueller/03_publications/2010_PaulusMuellerKlapuri_STAR-MusicStructure_ISMIR.pdf
- [PMW08] M. T. Pearce, D. Müllensiefen, G. A. Wiggins, "A comparison of statistical and rule-based models of melodic
  segmentation", ISMIR 2008, 89–94. http://ismir2008.ismir.net/papers/ISMIR2008_228.pdf
- [PMW10] M. T. Pearce, D. Müllensiefen, G. A. Wiggins, "The role of expectation and probabilistic learning in auditory
  boundary perception: a model comparison", Perception 39(10):1367–1391, 2010. doi:10.1068/p6507
  (abstract read)

## 7. Audio → notes

**Where we are.**
- `time/spectrogram.ts` has a `waterfall` and spectral `peaks`. `owners` gives each band to a voice, *given the notes*.
- Nothing finds notes from sound. [disassembler.md](disassembler.md) proposes the audio layer as a loop (guess, render,
  subtract, explain the residual), with a published transcriber as its loader.

**State of the art.**
- **The surveys:**
  - Benetos et al. 2013 [BDG+13]: accuracies "seem to have reached a limit"; tailor methods to use cases; train on
    scores aligned to audio.
  - Benetos et al. 2019 [BDDE19]: AMT is "still … a challenging and open problem". The two families are **NMF**
    (spectral templates times activations) and **neural networks**.
- **NMF:** Smaragdis & Brown [SB03] model a polyphonic passage of notes with a fixed harmonic spectrum (the piano)
  as a non-negative basis times activations. It learns each note's spectrum and timing from the audio itself, with
  no training data. The 2019 survey's caveat: a plain NMF confuses notes whose partials overlap, which is most
  simultaneous notes in tonal music.
- **Piano, neural.** Note F1 with onsets only (and with offsets):
  - **Onsets and Frames** [HES+18], about 18M parameters: 82.3 (50.2) on MAPS, against Melodyne's 54.0 (18.4).
  - Its later MAESTRO-trained version scores 0.96 onset F1 (as MT3 tabulates it).
  - **Kong et al.** [KLS+21] regress onset and offset times: **96.72 %** onset F1 on MAESTRO, 20,218,778
    parameters. Code: PyTorch, **Apache-2.0** (`piano_transcription_inference`).
  - **The pattern:** solo piano is nearly solved.
- **Many instruments.** **MT3** [GSME22] is a T5 "small" transformer (about 60M parameters) from spectrogram to MIDI
  tokens, trained on six datasets at once. Onset F1:

  | MAESTRO | Cerberus4 | GuitarSet | MusicNet | Slakh2100 | URMP |
  |---|---|---|---|---|---|
  | 0.95 | 0.92 | 0.90 | 0.50 | 0.76 | 0.77 |

  - Onset + offset F1 is 0.33–0.80, and Melodyne's onset F1 0.04–0.52.
  - Code: JAX / T5X, **Apache-2.0**, run by Colab ("we do not (easily) support training").
- **Lightweight and instrument-agnostic.** **Basic Pitch** [BBR+22] jointly predicts onsets, notes and multipitch
  with pitch bends. The paper's model has 16,782 parameters.
  - Note F without offsets: GuitarSet 0.79, MAESTRO 0.71 (Onsets and Frames: 0.95), Slakh 0.42, Phenicx (orchestral)
    0.49, Molina (vocals) 0.52.
  - It is far below the specialists on piano, and their equal on monophonic vocals and guitar.
  - Peak memory 951 MB and 24 s for a 7′45″ file, in Python on a laptop.

**The key questions: which can run in the app, and which offline as a loader?**

| model | what | size (measured where marked) | runtime | licence (code) | in the app? |
|---|---|---|---|---|---|
| Basic Pitch (`@spotify/basic-pitch` 1.0.1) | any instrument, notes + bends | **185,598 parameters, a 742 KB weights file** (measured from the npm package's model) | TensorFlow.js 3 (browser, Node) | Apache-2.0 | **yes**, the only one |
| Onsets and Frames (`@magenta/music` 1.23.1) | solo piano | **60 MB** (30 MB quantised); 15,635,248 parameters (measured from its weights manifest) | TensorFlow.js; the Magenta repo is "inactive" | Apache-2.0 | possible, heavy, piano only |
| Kong et al. | solo piano, pedal | ≈ 20M parameters (paper) | PyTorch | Apache-2.0 | no: offline loader |
| MT3 | multi-instrument, labelled | ≈ 60M parameters (paper) | JAX / T5X, Colab | Apache-2.0 | no: offline loader |
| NMF with templates | instruments whose spectra we know | a matrix product | pure TS | — (a method) | yes, and fits `engine/` |

- **A caveat on the data.** Basic Pitch, Kong et al. and MT3 were trained on MAESTRO, among other sets (their papers' dataset tables). MAESTRO is **CC BY-NC-SA 4.0**. The browser Onsets and Frames checkpoint's page doesn't say what it was trained on. Code and weights are released under Apache-2.0, but what the training data's terms mean for
  the weights is not settled.
  - That is the owner's call (decision-sized, outward-facing) before any of them ships in the app.
  - Offline use as a loader, for research, raises the question less.

**What we take.**
1. **In the app, for real recordings: Basic Pitch** (TS, 742 KB, Apache-2.0).
   - It goes in a loader beside `midiimport.ts`, outside `engine/`, since TensorFlow.js is a dependency `engine/`'s
     rules forbid.
   - Audio → its notes and bends → `cellsFromMidi`. The bends are a reason to keep: a played file's glides are
     `glide=` (#334).
   - Measured the ratchet's way: notes kept against a known score.
2. **Offline, for the bench and for piano: Kong et al.** (Apache-2.0, 96.7 % on piano) as the reference transcriber.
   **MT3** for multi-instrument references.
3. **For audio we rendered ourselves: NMF with fixed templates.**
   - We know our voices' spectra: we can render each voice's every pitch. So NMF needs no learning, only the
     activations, which is the easy half. The 2019 survey's overlap problem is softened by knowing the templates
     exactly.
   - Pure TS, in `engine/time/` beside `spectrogram.ts`.
   - This is the analysis-by-synthesis loop's first step (guess notes from known instruments), and its test is
     exact: render an example, transcribe it, and compare with its own notes.
4. **The metric:** `mir_eval.transcription` (MIT): note F1 with and without offsets, 50 ms onset tolerance. It is
   what every table above uses.

**What we leave, and why.**
- **MT3 and Kong et al. in the app:** 20–60M parameters, and PyTorch or JAX.
- **Onsets and Frames in the app:** 60 MB for piano only, from an inactive repository. Basic Pitch covers more at
  1/80 of the size. Kong is better on piano offline.
- **Training our own transcriber:** 2013's advice (use cases, aligned scores) is what the published models did. We
  have nothing to add there, and a loader does the job.
- **Melodyne-style DSP:** 0.04–0.52 onset F1 in MT3's table.

**The nearest swamp.**
- **Transcription from scratch**, confirmed: a decade of work, then models trained on thousands of hours. Use a
  loader; our contribution is what comes after the notes.
- **Polyphonic offsets and multi-instrument labels.** Even MT3's onset-and-offset F1 is 0.33 on MusicNet and 0.57 on
  Slakh.
  - Take onsets and pitches as the reliable part. Let the fold's fidelity gate judge the rest by rendering: a render
    within a tolerance, not the transcriber's offsets.

**Our numbers against theirs.**
- None: nothing in the app transcribes audio.
- The first comparable number would be note F1 (`mir_eval.transcription`) of NMF-with-our-templates on our own
  renders. There the ground truth is exact, and a perfect score is reachable in principle. That makes it the right
  first test, before any recording.

**Next.**
- #399: *audio → notes, two loaders*:
  - NMF with our voices' templates on our own renders, pure TS, note F1;
  - Basic Pitch as the loader for recordings, outside `engine/`, measured against Kong et al. offline.
  - The training-data licence question goes to the owner first.
- Topic 8 (residual and analysis by synthesis): below.

**References.**
- [BBR+22] R. M. Bittner, J. J. Bosch, D. Rubinstein, G. Meseguer-Brocal, S. Ewert, "A lightweight
  instrument-agnostic model for polyphonic note transcription and multipitch estimation", ICASSP 2022.
  arXiv:2203.09893. Code: github.com/spotify/basic-pitch, github.com/spotify/basic-pitch-ts (Apache-2.0).
- [BDDE19] E. Benetos, S. Dixon, Z. Duan, S. Ewert, "Automatic music transcription: an overview", IEEE Signal
  Processing Magazine 36(1):20–30, 2019. doi:10.1109/MSP.2018.2869928. Author copy:
  https://labsites.rochester.edu/air/publications/benetatos19automaticmusic.pdf
- [BDG+13] E. Benetos, S. Dixon, D. Giannoulis, H. Kirchhoff, A. Klapuri, "Automatic music transcription: challenges
  and future directions", J. Intelligent Information Systems 41(3):407–434, 2013. doi:10.1007/s10844-013-0258-3.
  Postprint: https://openaccess.city.ac.uk/id/eprint/2524/
- [GSME22] J. Gardner, I. Simon, E. Manilow, C. Hawthorne, J. Engel, "MT3: multi-task multitrack music
  transcription", ICLR 2022. arXiv:2111.03017. Code: github.com/magenta/mt3 (Apache-2.0).
- [HES+18] C. Hawthorne, E. Elsen, J. Song, A. Roberts, I. Simon, C. Raffel, J. Engel, S. Oore, D. Eck, "Onsets and
  frames: dual-objective piano transcription", ISMIR 2018. arXiv:1710.11153. Browser checkpoints:
  github.com/magenta/magenta-js (music/checkpoints, `@magenta/music`, Apache-2.0).
- [KLS+21] Q. Kong, B. Li, X. Song, Y. Wan, Y. Wang, "High-resolution piano transcription with pedals by regressing
  onset and offset times", arXiv:2010.01815 (v3, 2021). Code: github.com/bytedance/piano_transcription
  (Apache 2.0).
- [MAESTRO] MAESTRO dataset, Google LLC, CC BY-NC-SA 4.0. https://magenta.tensorflow.org/datasets/maestro
- [SB03] P. Smaragdis, J. C. Brown, "Non-negative matrix factorization for polyphonic music transcription", IEEE
  WASPAA 2003, 177–180. doi:10.1109/ASPAA.2003.1285860. MERL TR2003-139:
  https://www.merl.com/publications/TR2003-139

## 8. Residual and analysis by synthesis

**Where we are.**
- **Voices** ([sound.md](../language/sound.md)): a waveform `s=` (sine tri saw square pulse white pink brown),
  `lpf=` / `hpf=`, an ADSR `env=`, a `pitch=` envelope and `gain=`. That is a handful of numbers a voice.
- **Resonators** ([physics.md](../language/physics.md)): `body=` one of nine mode sets, `loop=` the fundamental,
  `ring=`, `hard=`, `coupling=`.
- **Tapes:** `tone=` (a loss in Hz), `drive=`, `hiss=`, `wow=` (at a fixed 0.55 Hz), `print=`, `dropout=`.
- **Rendering:** Tone.js in an offline audio context (`audio/render.ts`), so in a browser, as the smoke test and the
  profile skill already run it. **It is not differentiable.**

**State of the art.**
- **Sinusoidal and spectral modelling:**
  - McAulay & Quatieri [MQ86]: sound as tracked sinusoids.
  - Serra & Smith's **SMS** [SS90]: *deterministic plus stochastic*, partials plus a filtered-noise residual.
  - Verma & Meng [VM00] add a third part for transients.
  - sms-tools [sms-tools] implements the sinusoidal, harmonic, stochastic, harmonic-plus-residual and
    harmonic-plus-stochastic models. Python, **AGPL-3.0**.
  - The classical analysis needs no learning; DDSP's own paper places itself after these.
- **DDSP** [EHGR20]: a harmonic oscillator plus filtered noise plus a reverb, driven by a network, trained on audio
  through a multi-scale spectral loss.
  - **It takes f0 from a pretrained pitch tracker (CREPE)** in its supervised setting.
  - It was trained on NSynth and on **13 minutes of one violinist**.
  - It re-synthesises that violin "very accurately" and transfers timbre.
- **Why f0 is given:**
  - **Frequency is not learnable by gradient descent on an audio loss.** "The error function is non-convex and densely
    populated with local minima" [HSF23a].
  - Even for a single sinusoid, most losses' gradients are "uninformative" about the true frequency (Turian & Henry
    2020, as the review reports it [HSF24]).
  - Hayes et al. give a surrogate that makes it work [HSF23a]; the field mostly gives frequencies from analysis instead.
- **Synthesizer sound matching** [HSF24 §2.1.4, §4]:
  - It finds a synth's parameters for a target sound: genetic algorithms historically, deep networks lately.
  - With a differentiable subtractive synth, **a spectral loss alone was ineffective**. Oscillator frequency and
    chorus delay were poorly optimised by it (Masuda & Saito 2021, 2023, as the review reports them).
  - Parameter losses on synthetic data, where the parameters are known, worked better.
- **Modal bodies from recordings:**
  - Ren, Yeh & Lin [RYL13] estimate a modal model's *material* parameters from a recorded clip, by an optimisation
    guided by perceptual features. A **second step compensates the residual** between the recording and the modal
    synthesis. The parameters transfer to other shapes and sizes, and listeners judged them close to real
    recordings.
  - Diaz et al. [DHS+23] train a network to output a bank of **differentiable IIR modal resonators** for a shape and
    material, with an audio loss. Shown on synthetic objects, "paving the way" for learning from recordings.
- **Source separation:** **HT Demucs** [RMD23] reaches **9.20 dB SDR** on MUSDB (with extra training data), in four
  stems: drums, bass, other, vocals.
  - The six-stem model's piano is "not working great".
  - Code **MIT**, needs 3–7 GB of GPU memory. **Archived** in January 2025 and no longer maintained.

**The key question: what does it take to fit our own voices, resonators and tapes to a recording?**

Less than DDSP, if the hard half comes from analysis rather than from the fit:

1. **Pitches and onsets from the transcriber** (topic 7, #399). Never fit frequencies by the render loss: that is
   the swamp [HSF23a; HSF24].
2. **For each note, an SMS analysis:** its harmonics' amplitudes over time, and the residual (sms-tools offline as
   the reference; our own in `time/spectrogram.ts`, which has peaks already). The voice's parameters follow almost in
   closed form:
   - **`s=`:** the harmonic profile. Saw falls as 1/k, square has only odd harmonics at 1/k, triangle odd ones at
     1/k² (textbook Fourier series). A discrete choice by best match.
   - **`env=`:** the ADSR fitted to the harmonics' summed energy curve.
   - **`lpf=` / `hpf=`:** the tilt of the harmonic profile against the waveform's own.
   - **`gain=`:** the level.
3. **Resonators, the same way:** a strike's partials and their decays give `loop=` (the lowest mode), `ring=` (the
   decay), `hard=` (the upper modes' weight), and `body=` (which of the nine mode sets fits the frequency ratios
   best, again a discrete choice). [RYL13] is this with materials instead of named bodies, and the residual
   compensated afterwards.
4. **Tapes** read off what is left: `wow=` from the f0 track's slow modulation, `hiss=` from the noise floor,
   `tone=` from the roll-off. No paper read here treats tape parameters; this is our extrapolation.
5. **The judge renders and compares.**
   - A multi-scale spectral loss (DDSP's) over the few parameters left, with a derivative-free search: a grid on the
     discrete choices, a local search on the continuous ones. A spectral loss is fine for amplitudes and envelopes;
     the frequencies are already fixed.
   - The render is the browser's (Tone.js offline), as `audio/render.ts` does.
   - This is the folder's `sameNotes` gate at the audio layer, "renders within N dB" ([disassembler.md](disassembler.md)).
6. **The residual left after that** is SMS's stochastic part: filtered noise (`s=white|pink|brown` with filters), or
   a resonator's `excite=` for a body that rings with it.

**What we take.**
- **SMS's decomposition** (harmonics plus residual) as the analysis, with sms-tools (**AGPL-3.0**) offline as the
  reference only. AGPL code doesn't go in the app; our own analysis is `spectrogram.ts`'s peaks grown into tracks.
- **DDSP's lesson, not its network:** give the frequencies, fit the rest. Its multi-scale spectral loss is the judge.
- **[RYL13]'s two steps for resonators:** fit the modal parameters, then explain the residual.
- **The first test on our own renders** (exact ground truth, as for #399): render an example's voice, fit a voice to
  it, compare parameters and renders. A perfect fit is reachable.

**What we leave, and why.**
- **A DDSP model per instrument.** Minutes to hours of one instrument's audio, a neural network, and the voice it
  learns isn't a cell anyone can read or edit. Our voices are the point.
- **Making Tone.js differentiable**, or porting our voices to an autodiff framework, to fit by gradients. A few
  parameters per voice don't need gradients, and the frequencies, which would need them, shouldn't be fitted that
  way.
- **Differentiable modal resonators** [DHS+23]: shown on synthetic objects only, and our bodies have named mode
  sets, which a discrete choice covers.
- **Demucs in the app or for our renders.** We render each line on its own; separation is for recordings only.
  - For recordings it is an optional offline step: MIT, but archived, GPU-hungry, and four stems (its piano stem is
    weak).
  - Separating a band recording's drums from the rest before transcription is its use.

**The nearest swamp.**
- **Fitting frequencies through the render.** Non-convex, local minima everywhere, gradients uninformative
  [HSF23a; HSF24]. Every successful system gives f0 from analysis.
- **A spectral loss for everything.** It fails on subtractive-synth parameters and on delays, as Masuda & Saito found.
  Fit what has a closed-form reading (harmonic profile, envelope) from the analysis, and use the loss only to judge
  and polish.
- **General source separation as the front door.** 9 dB SDR is good, not clean. Every artefact it leaves becomes a
  note or a residual to explain. Use it only where the instruments are unknown.

**Our numbers against theirs.** None: nothing fits voices yet. The first number would be the parameter error and
the render distance of a fitted voice against the voice that made the render, on our own examples.

**Next.**
- #400: *fit a voice and a resonator to a note, analysis first*: SMS-style harmonics and residual from
  `spectrogram.ts`; waveform, ADSR, filters and body read off; a rendered judge with derivative-free polish; tested on
  our own renders.
- Topic 9 (higher-order and cross-scale relations): below.

**References.**
- [DHS+23] R. Diaz, B. Hayes, C. Saitis, G. Fazekas, M. Sandler, "Rigid-body sound synthesis with differentiable modal
  resonators", ICASSP 2023. doi:10.1109/ICASSP49357.2023.10095139, arXiv:2210.15306.
- [EHGR20] J. Engel, L. Hantrakul, C. Gu, A. Roberts, "DDSP: differentiable digital signal processing", ICLR 2020.
  arXiv:2001.04643.
- [HSF23a] B. Hayes, C. Saitis, G. Fazekas, "Sinusoidal frequency estimation by gradient descent", ICASSP 2023.
  arXiv:2210.14476.
- [HSF24] B. Hayes, J. Shier, G. Fazekas, A. McPherson, C. Saitis, "A review of differentiable digital signal
  processing for music and speech synthesis", Frontiers in Signal Processing 3, 2024. doi:10.3389/frsip.2023.1284100
  (open access; its accounts of Turian & Henry 2020 and Masuda & Saito 2021, 2023 are used here, those papers not read)
- [MQ86] R. J. McAulay, T. F. Quatieri, "Speech analysis/synthesis based on a sinusoidal representation", IEEE Trans.
  ASSP 34(4):744–754, 1986. doi:10.1109/TASSP.1986.1164910 (record only)
- [RMD23] S. Rouard, F. Massa, A. Défossez, "Hybrid transformers for music source separation", ICASSP 2023.
  arXiv:2211.08553. Code: github.com/facebookresearch/demucs (MIT; archived 2025).
- [RYL13] Z. Ren, H. Yeh, M. C. Lin, "Example-guided physically based modal sound synthesis", ACM Trans. Graphics 32(1),
  2013. https://gamma.cs.unc.edu/AUDIO_MATERIAL (project page and abstract read)
- [sms-tools] X. Serra et al., sms-tools. github.com/MTG/sms-tools (AGPL-3.0; read from its README)
- [SS90] X. Serra, J. O. Smith, "Spectral modeling synthesis: a sound analysis/synthesis system based on a
  deterministic plus stochastic decomposition", Computer Music Journal 14(4):12–24, 1990. doi:10.2307/3680788
  (record only)
- [VM00] T. S. Verma, T. H. Y. Meng, "Extending spectral modeling synthesis with transient modeling synthesis",
  Computer Music Journal 24(2):47–59, 2000. doi:10.1162/014892600559317 (record only)

## 9. Higher-order and cross-scale relations

**Where we are.**
- **`time/necklace.ts`** writes a rhythm round a cycle and a scale round the octave in one form, the steps between
  marks whatever the starting slot. So the West African standard bell and the major scale are one necklace, 2 2 2 1 2
  2 1. It also tests maximal evenness (after Clough & Douthett).
  - Over the library it finds one such folding heard in sound: *5 to 12*'s rhythm and pitch classes, maximally even.
  - *Bell* writes it in its code, but heard within a cycle its melody is a pentatonic subset, so only a check on the
    code (one cell read by `step=` and by `over=`) would find it ([scalogram.md](scalogram.md)).
- **`time/motifs.ts`** finds a figure at two time scales (Korobeiniki's B section at half speed).
- **`tools/disasm/higher.ts`** finds runs of one cell at moving bases (a path of transpositions). After the fold
  there are 3 in the MIDI library, worth 16 characters, because Re-Pair folds a path into pieces itself. A path
  *shared by lines* (the canon per tonos) isn't looked for (#381).
- **The scalogram** (`time/wavelet.ts`) is Smith & Honing's continuous wavelet transform of rhythm.

**State of the art.**
- **Transformations as objects.** Lewin's *Generalized Musical Intervals and Transformations* [Lew87]: an interval is
  a transformation, and transformations compose. So a repeated transformation (a sequence, a canon per tonos) is a
  structure of its own, one level up.
  - Opycleid [Pop18] implements transformational theory's groups and categories in Python (**BSD-3**): the T/I group
    on pitch classes, the neo-Riemannian PRL group on triads.
  - It answers "which transformation takes this to that" (C major to B minor: I6). It **does not find** which
    objects in a piece to relate.
- **Geometry of chords and voice leading.** Tymoczko [Tym06; Tym11]: chords are points in an orbifold, and a voice
  leading is a line segment. Composers use short segments between nearly symmetrical chords. A *description* of
  which relations are near, with the measure (voice-leading size) that a finder would need.
- **Evenness, rhythm and scale as one structure:**
  - Clough & Douthett [CD91]: *maximally even sets*, the diatonic and pentatonic among them.
  - Toussaint [Tou05; Tou13]: the **Euclidean algorithm generates** the traditional timelines.
  - Demaine et al. [DGM+09] prove that Euclidean rhythms are exactly the ones that maximise evenness (the sum of
    distances between onsets on the circle), that almost all are *deep*, and that **"all of our results for musical
    rhythms apply equally well to musical scales"**.
  - Pressing [Pre83] first argued that the diatonic scale's interval pattern and the West African bell are a
    *cognitive isomorphism* (read through London 2002's account; no open copy).
- **Wavelets for rhythm.** Smith & Honing [SH08]: a continuous wavelet transform of the inter-onset intervals
  splits a rhythm into components over many time scales. It shows metrical structure and expressive timing (rubato as
  a gradual change, not as noise). The time-varying components are *ridges*, and choosing the most salient as the
  tactus models a beat tracker.
- **Compression and beauty.** Schmidhuber [Sch09]: data is interesting while an observer *learns to compress it
  better* ("compression progress"), and beauty is compressibility. A principle, not an algorithm for music.

**The key question: which of these relations has a published algorithm for *finding* it, not only describing it?**

| relation | describing | finding: published | finding: ours |
|---|---|---|---|
| maximally even / Euclidean (rhythm and scale) | [CD91], [Tou13] | **yes**: a test from the definition [CD91]; generation by the Euclidean algorithm and its proven equivalence to maximal evenness [DGM+09] | `maximallyEven` ✓ |
| one necklace as rhythm and as scale (the bell) | [Pre83] | **no** finder read | `necklace.ts` canonical form ✓ (heard); in the code, not yet |
| a transformation between two given objects | [Lew87], [Tym06] | **yes**, as a calculator: Opycleid (which T/I or PRL operation) | — (`degrees.ts` does transposition) |
| a repeated transformation in a piece (a sequence, canon per tonos) | [Lew87] | **partly**: point-set translators and transformation classes (topic 1: SIATEC [MLW02], maximal transformable patterns [Mer22]). They find patterns related by a class, not "a path of transformations" as such | `higher.ts` (one line); a shared path, #381 |
| periodicity across time scales | [SH08] | **yes**: wavelet ridges [SH08] | `time/wavelet.ts`, `ridges` ✓ |
| beauty as compression | [Sch09] | no (a principle) | the fold's description length is the working version |

- **What this shows:** the *rhythm–scale* relations have exact finders (evenness is a test, Euclidean rhythms a
  generator, necklaces a canonical form), and we have them.
- **Transformational relations** have calculators (given two things, which transformation) but no published finder
  of where a piece *repeats a transformation*.
- That finder is the higher-order tool [disassembler.md](disassembler.md) already names: SIA's translation vectors
  read as a path (#381), and Meredith's transformation classes for inversion and retrograde [Mer22]. This is the gap
  the project would fill rather than reuse.

**What we take.**
1. **Demaine et al.'s results as tests** for `necklace.ts`. Euclidean rhythms E(k, n) are the maximally even
   necklaces, so `maximallyEven` and the language's `euclid` must agree on every k, n: a property test, no
   literature needed beyond the theorem.
2. **The bell check in the code:** one cell read by `step=` and by `over=`, a check on the source and not the sound,
   since *Bell* shows that hearing alone misses it (scalogram.md). Pressing's isomorphism, found where it's written.
3. **Smith & Honing's ridges as the tempo source** for topic 4's beat tracker (#387). That links the two topics: the
   scalogram's strongest ridge in the beat band is the tactus.
4. **A transformation as a value** (Lewin): the higher-order finder (#381) should report *which* transformation
   repeats (T by a step, a fifth, I), as Opycleid names them, not only "a path of bases". Opycleid (BSD-3) offline
   is the reference for the names.
5. **Tymoczko's voice-leading size** as the cost when the finder compares chord paths: a short voice leading is a
   near relation [Tym06]. Read to its abstract only; for later.

**What we leave, and why.**
- **The orbifold geometry as an analyzer.** It describes; we need a finder and a cost, which we take.
- **Schmidhuber's compression progress.** It is the philosophy our MDL frame already is (topic 1). There is no
  algorithm to take.
- **Neo-Riemannian analysis of triads** (Opycleid's PRL): a harmonic vocabulary for chromatic Romantic music. Our
  corpus is Bach, and the folder needs transposition and inversion first.

**The nearest swamp.**
- **Describing without finding.** Transformational theory and the chord geometries are rich in description and give
  little to search. Every relation a tool adds must come with a finder and a test on the corpus (the canon per tonos
  for paths, the bell for necklaces), or it stays in this note.
- **Relations everywhere.** Any two things are related by *some* transformation. A finder that reports every
  relation reports nothing. As in topic 2 (SIA's too many patterns), the description length decides: a relation is
  kept when saying it shortens the piece.

**Our numbers against theirs.**
- **Ours only, nothing to compare:**
  - one rhythm–scale folding heard over the library (*5 to 12*), and one written but not heard (*Bell*);
  - 3 runs of a path left after the fold, worth 16 characters ([disassembler.md](disassembler.md)).
- None of the papers here measures a finder on a corpus. Demaine et al.'s results are theorems, and Smith & Honing's
  paper shows examples.

**Next.**
- #401: *higher-order relations: Euclidean ≡ maximally even as a property test, the bell found in the code, the
  transformation named by the higher-order finder*. #381 holds the path itself; #387 holds the ridges.
- #365's corpus leads (the canon per tonos, the Musical Offering's canons, the Art of Fugue with voices): MCMA has the
  Art of Fugue with a track a voice (topic 3, #384). The canons and a typeset canon per tonos are not in MCMA's
  listed collections; they stay open.

**References.**
- [CD91] J. Clough, J. Douthett, "Maximally even sets", Journal of Music Theory 35(1/2):93–173, 1991.
  doi:10.2307/843811 (record; the definition as `necklace.ts` implements it)
- [DGM+09] E. D. Demaine, F. Gomez-Martin, H. Meijer, D. Rappaport, P. Taslakian, G. T. Toussaint, T. Winograd, D. R.
  Wood, "The distance geometry of music", Computational Geometry 42(5):429–454, 2009. doi:10.1016/j.comgeo.2008.04.005,
  arXiv:0705.4085
- [Lew87] D. Lewin, *Generalized Musical Intervals and Transformations*, 1987 (Oxford UP edition, 2007).
  doi:10.1093/acprof:oso/9780195317138.001.0001 (record)
- [MLW02], [Mer22]: topic 1.
- [Pop18] A. Popoff, "Opycleid: a Python package for transformational music theory", JOSS 2018.
  doi:10.21105/joss.00981. Code: github.com/AlexPof/opycleid (BSD-3).
- [Pre83] J. Pressing, "Cognitive isomorphisms between pitch and rhythm in world musics: West Africa, the Balkans and
  Western tonality", Studies in Music 17:38–61, 1983 (not read: no open copy; its claim as J. London, JMT 2002,
  reports it)
- [Sch09] J. Schmidhuber, "Driven by compression progress: a simple principle explains essential aspects of subjective
  beauty, novelty, surprise, interestingness, attention, curiosity, creativity, art, science, music, jokes",
  arXiv:0812.4360, 2009.
- [SH08] L. M. Smith, H. Honing, "Time–frequency representation of musical rhythm by continuous wavelets", Journal of
  Mathematics and Music 2(2):81–97, 2008. doi:10.1080/17459730802305336 (abstract read)
- [Tou05] G. T. Toussaint, "The Euclidean algorithm generates traditional musical rhythms", BRIDGES 2005, 47–56.
  https://cgm.cs.mcgill.ca/~godfried/publications/banff.pdf
- [Tou13] G. T. Toussaint, *The Geometry of Musical Rhythm: What Makes a "Good" Rhythm Good?*, Chapman & Hall/CRC,
  2013 (record)
- [Tym06] D. Tymoczko, "The geometry of musical chords", Science 313(5783):72–74, 2006. doi:10.1126/science.1126287
  (abstract read)
- [Tym11] D. Tymoczko, *A Geometry of Music*, Oxford UP 2011 (record, via its review in Computer Music Journal 36(1),
  doi:10.1162/COMJ_r_00108)

## Summary and outlook

**The nine topics in one table.**

| topic | the finding | issues |
|---|---|---|
| 1. Compression as analysis | Point sets (SIA) complement voices: both routes score F1 ≈ 0.12 on fugue subjects. Pick the repeat that saves most; read SIA's vectors as a path. | #380, #381 |
| 2. Pattern benchmarks | The bench can run on JKU-PDD with a loader, a writer and `mir_eval.pattern`. MIREX best: three-layer F 0.46. | #383 |
| 3. Voice separation | `voiceAgreement` is the field's link P/R: within 2 points on the sinfonias, recall 6 behind on fugues. MCMA as a common ground truth. | #384 |
| 4. Meter, beat, tempo | Beats from performance MIDI ≈ 80–86 F, downbeats 14–28. A DP tracker on ASAP; our losses are several pulses, so a grid per line. | #387, #388 |
| 5. Key and harmony | Ours 65 / 69, profile methods 61–65, errors that don't overlap (a vote: 68). When-in-Rome for local keys and chords. | #389 |
| 6. Structure and form | Score the fold against analysts (Essen phrases, GTTM trees) and report boundary F at 0.5 / 3 s. | #391 |
| 7. Audio → notes | In the app only Basic Pitch fits (742 KB). NMF with our templates for our renders. ⚖ The training data's NC licence. | #399 |
| 8. Residual, analysis by synthesis | Frequencies from analysis, never from the fit. Our voices' parameters read off an SMS analysis, then a rendered judge. | #400 |
| 9. Higher-order relations | Rhythm–scale relations have finders (we have them). Repeated transformations have none published; that is ours to build. | #381, #401 |

**What cuts across the topics.**
- **Description length is a good preference and a poor target.**
  - Shorter descriptions sit closer to analysts (topic 1, Louboutin & Meredith).
  - But compression and annotation part ways where analysts nest patterns (topic 2, MIREX 2017), and a learned reduction is graded half to a full letter below a textbook (topic 6).
  - So keep fidelity as the gate and size as the judge, and report every level of the splice tree against
    analysts, as readings.
- **Ground truth is plural, and numbers depend on who ran the code.**
  - Analysts agree at 89 % on audio sections and on 267 of 300 GTTM trees.
  - Choosing the best level per piece adds about 10 points.
  - One algorithm family scores 0.10 to 0.49 on the same five pieces, depending on its implementation.
  - Every benchmark here is a reading to report, never a constant to tune on (topics 2, 3, 5, 6).
- **Give what analysis can give; fit only the rest.**
  - DDSP takes f0 from a pitch tracker because frequency can't be fitted by gradient (topic 8).
  - Beats come from a tracker before notes are quantised (topic 4).
  - A key is chosen by two signals whose errors don't overlap (topic 5).
  - In each case the hard, non-convex part comes from analysis, and the search is small.
- **Several of everything.** Our importer's losses are several pulses at once (topic 4), our voices several lines
  (topic 3), our patterns several levels (topics 2, 6). The literature mostly assumes one beat, one segmentation,
  one voice per stream. Our IR (lines on their own clocks, a splice tree) already holds the plural; the finders should
  too.
- **Licences shape the bench.** Much of the ground truth is non-commercial or unclear: ASAP, MAESTRO, MTC-ANN,
  Essen; JKU-PDD and the GTTM data state none. Fetch them, don't commit them. Nothing trained on non-commercial data
  ships in the app without the owner's decision.

**Outlook: an order of work.** Each step makes the next measurable.
1. **Measure first.** Cheap, and it turns later changes into numbers:
   - #383 and #391 share one writer, the splice tree as patterns and boundaries, scored against JKU-PDD, Essen and
     the GTTM trees;
   - #384 puts MCMA's voices and link F1 on the bench;
   - #389's When-in-Rome preludes give local keys and chords.
2. **Then the folder, judged by those numbers:**
   - #389's key tie-break (small, already measured);
   - #380's choice of repeat;
   - #381's path shared by lines, then #401's named transformations and the bell found in the code.
3. **Time, for the importer:**
   - #388's grid per line first: it recovers the examples that lose notes today;
   - then #387's beat tracker on ASAP, which is #347's tempo map.
4. **Audio, as a loop:**
   - #399's NMF on our own renders (exact ground truth);
   - #400's fitted voices and resonators;
   - then recordings through Basic Pitch, whose performed timing goes through #387.

**Decisions for the owner.**
- ⚖ **Models trained on MAESTRO** (CC BY-NC-SA) in the app: Basic Pitch, Kong et al., MT3 (#399).
- **Inversion and retrograde in the language.** Richer transformation classes didn't improve compression on folk
  songs (topic 1, Meredith 2022). Ask the canons once #381 and #401 can find them, not before.

**Still open from #365.** A typeset canon per tonos is not on Mutopia, and neither it nor the Musical Offering's other canons is among MCMA's listed collections. The Art of Fugue with voices is in MCMA (#384).
