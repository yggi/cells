# A music disassembler (Ghidra for music)

Date: 2026-10-13 · Status: open (the frame, the workspace and its first numbers) · Issues: the epic (#364), the literature
(#365), #234, #286, #307

The owner's framing: **we are building a music disassembler, a Ghidra for MIDI, and not only for MIDI.** A format is a
loader; MIDI is one of them. Strudel's mini-notation is an obvious next one, and audio (WAV) the deeper binary layer:
not WAV → MIDI → cells, losing what the MIDI step throws away, but WAV into cells more or less directly. The
owner's outline of a disassembly:

1. clock and bar recovery;
2. sections;
3. harmony;
4. voice separation;
5. instrument audio profiling;
6. per-instrument note recovery;
7. folding the spectrum on the partials;
8. physical models (resonators, tapes) for the residual;
9. full sub-hertz structure recovery.

And on the folder: **think scale-invariant.** It should find repetition at every level, not only notes, and
higher-order (symbolic) repetitions and dependencies too: things built on each other across frequency domains. The
bell and the scale are the prototype, Bach is full of these, the canon per tonos is the test for scales, and the
ricercar for voices and patterns.

This note evaluates the frame, maps it onto what exists, and sets up a workspace (a corpus with ground truth, tools,
metrics, a bench) so each step is measured rather than argued. The literature is its own issue (#365), so we don't
reinvent wheels or walk into known swamps.

## The analogy, evaluated

**What holds:**

| Ghidra | Cell studio | today |
|---|---|---|
| a loader per format | a reader per format into one IR | MIDI (`engine/midiimport.ts`); `.cells` itself |
| the program database: one IR that every analyzer annotates | the lines of chords on a grid (`fold/ir.ts`); the time engine's events | two IRs that don't share annotations yet |
| analyzers, run in order, each adding facts | the folder's tools (`fold/index.ts`: dilate, figure, stretch, variants, pairs, β); keys and sections (`degrees.ts`, `sections.ts`); voices (`voices.ts`); the time engine (`engine/time/`: meter, boundaries, foldings, motifs) | yes, as separate passes |
| the decompiler: a readable program out | the printer (`fold/print.ts`): cells a person can read and edit | yes |
| cross-references | the graph (which cell splices or reads which) and the time view (each cell where it plays) | yes |
| the listing | the code editor, and the time view as the listing over time | yes |
| user annotations survive a re-analysis | a renamed cell, a fold kept by hand | **no**: Convert starts over |
| scripts | the probes and the bench (`tools/disasm/`) | yes |

**What doesn't hold, and why it matters:**

1. **We can run the output and compare it with the input; a decompiler can't.**
   - Ghidra never re-runs its C.
   - The folder does: a fold is taken only if it plays the file's notes (`sameNotes`).
   - At the audio layer the same check is a render compared with the recording, within a tolerance.
   - This is the single strongest property of the project; every layer should keep it. **Fidelity is a gate, not a
     metric.**
2. **There is no one source.**
   - A binary was compiled from one program. A piece has many equally valid descriptions.
   - So disassembly is model selection: a description length (the characters, `fold/score.ts` `bare`) plus
     preferences for structure. Those are `STRUCTURE` and `SECTIONS`: a phrase said as a phrase, a piece read in its
     sections, at most 15 % longer.
   - These are GTTM's well-formedness and preference rules, in MDL's terms.
   - The bench has to measure both: how short, and how close to the structure a musician wrote (keys, voices,
     sections, phrases).
3. **The lower layers are inference, not decoding.**
   - MIDI → cells is lossless (every note kept).
   - Audio → notes is not: polyphonic transcription is an open research problem.
   - So below MIDI the pipeline becomes a loop, analysis by synthesis: guess cells, render, subtract, explain the
     residual. The owner's steps 5–8 are that loop, not a sequence (below).
4. **The target language is ours.**
   - A decompiler's C is fixed. Our language can grow an idiom when the analyzers keep finding a pattern it can't say
     (inversion and retrograde, below).
   - That is a strength with a cost: every idiom is a language decision (AGENTS.md: stop and recommend). The bench
     gives each such decision a number before it is asked.

## The stack, bottom up (the frequency tower)

Each layer is a band of the tower ([multiscale.md](multiscale.md)). In each band, repetition looks different:

- a partial series at audio rate;
- a pulse at the beat;
- a motif in the melody;
- a section in the form.

The same move finds all of them: **something said once and referred to again**. Each layer, its input, what it
recovers, what exists, what's missing:

| band | from → to | what is recovered | exists | missing |
|---|---|---|---|---|
| audio (20 Hz – 20 kHz) | samples → partials | sinusoidal peaks over time | `time/spectrogram.ts` (`waterfall`, `peaks`), `owners` (a voice per band, from known notes) | partial tracking; onsets from the sound (spectral flux) |
| audio | partials → notes | a harmonic series folded into its fundamental: **"folding the spectrum on the partials"** is a fold at audio rate, k·f a symbol used k times | — | pitch per frame, polyphonic (the literature: NMF, learned transcribers) |
| audio | notes → instrument | each instrument's profile: its partials' weights and envelope, a voice's `s=` `env=` | the voices' parameters in the language | fitting them (analysis by synthesis) |
| audio | residual → bodies | what the notes don't explain: a resonator's modes, a tape's noise, a room | resonators and tapes in the language ([physics](../language/physics.md)) | fitting them |
| pulse (1–20 Hz) | onsets → grid | the step, the beat, the bar; a tempo map | MIDI's own grid (`gridOf`); the scalogram's ridges (`time/wavelet.ts`); the meter from the scalogram (the time view) | a played-in file's tempo (#347); a meter from the notes rather than the file |
| pulse | notes → voices | which voice each note is in | **`fold/voices.ts` (#366)**: 96 % / 93 % against the typesetters' voices | a fugue of 5 voices; voices that cross |
| melody | voices → phrases | motifs, phrases, variants, figures, passages at another speed | the folder | inversion and retrograde (a language question) |
| harmony | notes → keys | the key, and a key per section | `degrees.ts`, `sections.ts`: 65 of 69 named keys right | chords as such (only figures over chord tables) |
| form (sub-Hz) | phrases → sections | sections, repeats, the form; boundaries heard | `sections.ts` (by key); `time/boundaries.ts` (swells, cones, novelty) | sections by repeat and by what is heard, cut where the boundaries are |
| above | symbols → relations | **higher order**: the bases a phrase is spliced at as a line of their own (a sequence; a canon per tonos), one table read as a clock and as a scale (the bell), a figure over a slow table of chords | figures over chords (`figure.ts`); foldings (`time/necklace.ts`); pairs of pairs (Re-Pair's own recursion) | a path shared by lines, as a key cell; a table read two ways |

### The owner's order, for MIDI and for audio

- **For a symbolic file (MIDI, mini-notation)**, the order is a pipeline. Each step below names who does it:
  1. the grid (the reader; #347 for a played-in file);
  2. the meter;
  3. voices (new);
  4. keys and sections (`sections.ts`);
  5. phrases (the folder);
  6. higher order.

  Voices go before keys because a key per section is cut per line, and a line should be a voice.
- **For audio it is a loop**, because each step needs the next one's answer:
  - Beat tracking needs onsets, and onsets need to know what a note is.
  - Note recovery needs instrument profiles, and profiles are learned from notes.
  - The way out is the one the folder already has: a judge that renders. The loop has five steps:
    1. guess notes and their instruments;
    2. render the cells;
    3. subtract them from the recording;
    4. fit a physical body or noise to the residual;
    5. refine.

  The folder's `sameNotes` becomes "renders within N dB". Proposed: the audio layer starts as its own epic after
  the symbolic one is measured, with the literature's transcribers as a loader rather than ours from scratch (#365
  says which).

## Repetition at every level (scale-invariant)

| relation | an example | in cells | the folder |
|---|---|---|---|
| a phrase again | a minuet's repeat | `&a!2` | pairs ✓ (now that repeats are played, below) |
| transposed, chromatic or in the scale | a fugue's answer; a sequence | `&m^$7`, `&m^1` | pairs, degrees ✓ |
| near the same | a tonal answer, a bent entry | `&m2 base=&m1 =!3 -7` | variants ✓ |
| slower or faster | augmentation | `&m@2` | stretch, dilate ✓ |
| one figure over slow chords (a fast cell reading a slow one) | BWV 847's prelude | `&run over=&chords &figure!24` | figure ✓ |
| **a path of transpositions** (a fast cell moved by a slow one) | a sequence; the canon per tonos, the whole canon a tone higher each pass | a key cell stepped slowly, the lines read through a scale over it: `&key step=cycle(&theme) stride=2`, `&scale over=&key …` (`examples/pertonos.cells`) | found per line, not shared: through MIDI the example comes back as `&reed &m1 &m1^$8 &m1^$16`, `&viola &m3^$-5 &m3^$-1 &m3^$3 …` (+4 each), `&cello &m5^$-17 &m5^$-9 &m5^$-1`: each line's own path, in Re-Pair's binary pieces. That the three lines share one path, a key moving a tone a pass, isn't looked for |
| one table read as a clock and as a scale | the bell: 2 2 2 1 2 2 1 is the standard bell and the major scale | one `scan` read by `step=` and by `over=` | heard by `time/necklace.ts` (5 to 12); **not** looked for by the folder |
| inversion, retrograde | a canon per motum contrarium, cancrizans | no spelling | — (a language question) |
| a voice copied later | a canon | `[<<n]` copies (decision 010) | across lines, as pairs ✓; the delay as such, no |
| the form | A A B A | the lines' splices | pairs at the top ✓ |

The pattern in the table: **every relation that is a slow cell driving a fast one** is a dependency across the
tower's bands:
- a figure over chords;
- a path of transpositions;
- a scan read as a clock and as a scale.

The language says all three already:
- `over=` a stepped table;
- a scale over a key that steps, the canon per tonos' spelling;
- one table read by `step=` and by `over=`.

What's missing is the folder looking for them. The next higher-order tool is **a path shared by lines → a key cell
they read through**. It needs no language change, and the canon per tonos is its test (the example through MIDI,
above).

A caret that reads a cell (`&m^&path`) would only say one line's path. On its own Re-Pair already folds that into
pieces at no extra cost: `tools/disasm/higher.test.ts` measures the canon per tonos' plan, and the path costs what the
splices do. Over the MIDI library the fold leaves 3 such runs, 16 characters to gain. So no language question from
this yet.

## The workspace

**Corpus, with ground truth** (`midi/`):

- **Four collections:** the Well-Tempered Clavier, the Inventions and Sinfonias, the Anna Magdalena Notebook and,
  new, **the Musical Offering's two ricercars**, 88 files.
- **Repeats played** (`tools/mutopia.py staff`). Mutopia's MIDI files play a repeat once, so a minuet was half its
  form. The 21 files with repeats are rebuilt from their LilyPond sources with the repeats unfolded.
- **Voices written** (`midi/<set>/voices/`, `tools/mutopia.py voice`):
  - Every piece again with a track a voice, LilyPond's MIDI performer moved from the staff to the voice. These are
    the voices as the typesetter wrote them, the ground truth for voice separation.
  - They are clean (a voice a track for the whole piece) in 64 of the 88, every Invention and Sinfonia among them.
  - The app doesn't ship them.
- **Keys:** the index's `tonality` (69 files).
- **Not yet in it:**
  - the canon per tonos (no typesetting on Mutopia; `higher.test.ts` uses its plan);
  - the examples' own sections, cells and phrases. The examples' ratchet has them (`fold/ratchet.slow.test.ts`), the
    bench doesn't yet.

**Tools** (analyzers): the folder's tools, `degrees`, `sections`, `voices`, and the time engine. A tool is a file and
a place in a list (`fold/index.ts`).

**Metrics**, in order of authority:

1. **Fidelity, a gate:** the fold plays the file's notes (`sameNotes`); at the audio layer, a render within a tolerance.
2. **Size:** the score's characters (`bare`), flat and folded.
3. **Agreement with what was written:**
   - keys against `tonality`;
   - voices against `voices/`: pairs of notes one after another in a voice found that are in one voice written, and
     the other way round (`voiceAgreement`);
   - the examples' phrases back (the ratchet).
4. **Heard:** the fold's phrases of 4 s or more against the swells its sound has (`tools/disasm/heard.ts`). This
   answers #286's last open question: does the fold cut where a listener hears a cut?
5. **Higher order left:** the runs of one cell at moving bases the fold leaves (`higher.ts`), and what a path would
   save.
6. **Time.**

**The bench:** `BENCH=out.md [SET=wtc] [ONLY=fugue] [HEARD=1] npx vitest run tools/disasm/bench.test.ts`. It writes
a row a file and a sum a set. It is not a gate; the ratchets stay the gates (`fold/midiRatchet.ts`, a file a set; `fold/ratchet.slow.test.ts`).

## First numbers (2026-10-13)

**Unfolded repeats.** Anna Magdalena's 19 pieces, with their repeats played:

| | before (repeats once) | after (repeats played) |
|---|---|---|
| flat | 18,811 | 33,770 |
| folded | 15,099 | 16,032 (47.5 % of flat) |
| folds taken | 17 of 19 | 19 of 19 |

The notes nearly double and the folded score grows by 6 %: the second time round is one splice. That is the
folder working as it should, and the form (A A B B) is now in the cells.

**What perfect voices would do.** The same notes a line a voice (the typesetter's) against a line a hand, on the 64
files whose written voices are clean: **135,990 against 144,856 characters, 6.1 % shorter**.

| where | folded by voice, against by hand |
|---|---|
| the Sinfonias (3 voices) | −5 to −20 % |
| the Ricercar a 3 | −17 % |
| WTC fugues | −2 to −17 % (I/2 −15 %, I/12 −17 %, I/8 −13 %) |
| two-voice pieces (Inventions, minuets), where hands are voices | ± 1 % |

This reverses fold.md's earlier finding that voices made it 6.6 % longer: that was a heuristic split ("each note to
the nearest free voice"), and what fails is the split, not the voices.

**Voices found** (`fold/voices.ts`, #366; 29 pieces of three voices or more with clean voices written):
- **96 % precision, 93 % recall** of pairs within a voice.
- The voice count is the typesetter's in all but one.
- The method follows Chew & Wu (2004):
  - Count the voices as the notes sounding at once, but for the thickest 6 % of the time, so a cadence's chord
    doesn't add a voice.
  - At each onset, the starting notes go to the free voices in order, each voice moving as little as it can.
  - Crossing a sounding voice costs extra.
  - A voice not heard yet starts from its register.
- The importer folds a line a track and a line a voice (`split: 'auto'`) and takes the shorter: the MIDI library
  204,121 → 198,859 (−2.6 %), the examples unchanged in what they keep and bring back (fold.md, *Voices*).

**Keys:** 65 of 69 files right (one key for the piece, `bestKey`); Inventions 2 and 9, Sinfonia 7 and the WTC I/12
fugue are named otherwise.

**Higher order:** after the fold, runs of one cell at moving bases are rare in the MIDI library (3, 16 characters a
path would save), since Re-Pair folds a path into pieces itself. What it can't do is share a path between lines (the
canon per tonos, above).

**Heard** (`HEARD=1`, `tools/disasm/heard.ts`; #286's last question): are the fold's phrases of 4 s or more heard as
boundaries? This scores the swells of three scalograms against the phrases' starts (precision / recall, % and chance):

| collection | files scored | P / R | chance |
|---|---|---|---|
| Anna Magdalena (dances, repeats played) | 18 | 52 / 30 | 27 |
| Inventions and Sinfonias | 25 | 25 / 24 | 20 |

- **In the dances, the fold cuts where a listener hears a cut**, about twice chance. These are the repeats and the
  halves.
- **In the counterpoint it hardly does.** An invention's texture runs on without the breaks and entries a swell
  hears. The fold's phrases there are the subject's returns inside a running texture, which the onset signals don't
  mark.
- A boundary heard by a key change (the scalogram's *harmony* signal, which found 5 to 12's keys) is the next
  signal to try on counterpoint.

## Known swamps (to confirm or rule out in #365)

- **Polyphonic transcription from scratch.** Use a published model as a loader; ours is the analysis after it.
- **The smallest grammar.** It is NP-hard; Re-Pair and Sequitur are the practical approximations, and we have one.
  Don't chase optimality, chase the right moves.
- **GTTM in full.** Preference rules interact, and the ambiguity explodes. Take its well-formedness as the shape and
  MDL as the preference.
- **General source separation for audio.** Not needed where the instruments are known: we render them.
- **Overfitting to Bach.** The corpus is Bach's, the examples are ours. The bench reports both, and the literature's
  datasets (the JKU patterns database, a Bach fugue with annotated themes and sections) belong in it.

## Next

- **The proposed PRs, one issue each:**
  - the workspace and the corpus (this);
  - voices in the importer;
  - keys per section on voices;
  - the heard metric as a ratchet once it settles.
- **The folder's next higher-order tool:** a path shared by lines into a key cell (the canon per tonos), then a table
  read as a clock and as a scale (the bell). Both are said by the language today.
- **⚖ the owner:**
  - inversion and retrograde, if the literature's canons need them.
- **The loaders:**
  - Strudel's mini-notation (its patterns are cells already, decision 027: a reader that keeps the pattern rather
    than its events);
  - then audio, as a loop.
