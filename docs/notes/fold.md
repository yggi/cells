# The folder: notes into cells by scale-invariant tools (#307, step 4)

Date: 2026-10-12 · Status: open (a first set of tools; the ratchet's numbers say what's next) · Issues: #307, #234

The owner's direction: don't grow Shorten into a monolith; split it into an architecture, running recursively,
mirroring #234's reading of a piece as a MERA (disentanglers and isometries), a collection of scale-invariant tools.
Shorten stays what it is (a linter over the text, its suggestions in the panel). The **folder** is `src/engine/fold/`,
a pipeline from notes to cells: a reader, a set of tools, a printer, a judge.

## The architecture

- **The reader** (`engine/midiimport.ts`): a MIDI file's notes on the coarsest grid, as lines of chords (`ir.ts`: `Line`).
- **The disentangler** (`transpose.ts`): each chord written against its own lowest pitch, a shape and a base: a
  shift with carry, so a figure and the same a fifth up are one key at two bases, and neighbours across a block's edge
  compare as shapes.
- **The isometries**, each one move that is the same at every scale:
  - `dilate.ts`: a line whose lengths all share a factor goes on a clock that much slower (`step=&tempo*2`); a
    symbol two lines share then plays at each one's clock: a phrase at two speeds is one cell.
  - `figure.ts`: a look-up. A run of blocks alike in rhythm and in each note's place in its own chord (the chord in
    the order the figure first plays it) is one figure read over a table of chords, stepped a block at a time. Only
    where the harmony moves (a chord that stays is a repeat), and only where it pays.
  - `pairs.ts`: Re-Pair [Larsson & Moffat 2000]: the commonest pair of neighbours (as shapes, the second's base against
    the first's) becomes a symbol, again and again: motifs, phrases, sections, the form, each level built by the
    same move from the one below. This is the recursion.
- **β** (`beta.ts`, #234's α and β): a symbol that costs more written once and named at each use than written out
  goes back in place, each place weighed by how often in a row it is played there. The description length judges.
- **The printer** (`print.ts`): symbols as cells (`&m3^$5`), runs as `x!n`, figures as `&figure1` over `&chords1` (every
  chord written out: a table counts entries, and `x!n` or `x@n` in one is one entry), each line on its clock.
- **The driver** (`index.ts`): the tools in order (dilate, figure, pairs, β), round after round while the printed piece
  gets shorter. **The judge** (`midiimport.ts`): a fold is taken only if it plays the same notes as the flat piece and
  is shorter.

A tool is a function `Folded → Folded | null` (`ir.ts`: `Tool`); a new one is a file and a place in the list.

## Variants: a phrase and its copies (`variants.ts`, decision 026)

A disentangler in #234's sense, lifting's predict and update: a long phrase that comes back nearly the same (a step
changed, a note held longer, transposed or not) is written once at its own length, and each return as that cell
spliced (`&m6^$-12`) or as a copy of it with what differs (`&m17 base=&m6 =!3 [-1,2]@2`). How it finds them:

- **Seeds**: five steps alike in shape anywhere (a seed heard more than 48 times is a run, left to pairs); from each
  pair of places, a phrase grown step by step while it changes in at most two steps or a sixth of it.
- **The phrase as its family has it**: of the places it returns to, the one the others differ from least (BWV 847's
  first entry in line order is the soprano's tonal answer, a bent one); grown either way, the length that saves the most
  is taken, so a return that changes too much at full length drops out (and is folded otherwise).
- **Only lengths where something returns changed**: exact returns alone are pairs' to fold, shared across lines.
- **A preference for structure**: a phrase said as a phrase earns 2 characters a step for each return it explains
  (`SAID`), beyond what it saves; and the driver folds with and without variants and takes variants when they are at
  most 15 % longer (`STRUCTURE`). Tuned on ten pieces by the ratchet's phrases back: 16 → 20 for +0.5 % of score (more
  weight changed nothing); over the library 58 → 62. Pop still folds without (+28 %).

**BWV 847** converted from MIDI: the **whole subject** comes back as one cell (`&m6 0 -1 0@2 -5@2 -4@2 0 -1 0@2 2@2 …`,
20 steps), used nine times, its bent entries copies of it: the tonal answer (`base=&m6 =!3 -7@2`), the entry in E♭
(`base=&m6 =!4 -3@2 =!11 -3@4 =!2 -8`), the last entry with its chord and long final note (`base=&m6 =!8 [-1,2]@2 =!10
-8@8`); the countersubject as another (`&m9 …`) with a copy that holds its end; near-repeats of the free counterpoint as
copies too. Its first five steps are where the entries bend: on characters alone the description length prefers the
subject without them (it did, before the preference for structure: its last 15 steps), itself a finding about the fugue.

## What it does (the ratchet, `tools/probe/ratchet.test.ts`; [ratchet.md](ratchet.md) has the baseline)

**74 pieces through MIDI (with variants): the scores 27,174 characters written, 198,352 flat; `shortenAll` 61,050
(225 % of written, 30 s); the folder 55,950 (206 %, 8.1 s: it folds twice, with and without variants). Phrases back 58
of 191 either way. Notes kept by 64 either way (the 10 others lose them in the MIDI path, before folding).** (Before
variants, 73 pieces: 207 %, 2.8 s.)

- **BWV 847**: the prelude comes back as the hand example writes it, both hands one figure over their chord tables:
  `&figure1 0 1 2 1 3 1 2 1`, `&chords1 step=&tempo*16 [12,3,2,0] [8,5,4,0] …` (its `&rhShapes`), `&run1 over=&chords1
  &figure1!48` (its `&rhFigure`), the same for the left hand. Its score 3,746 (`shortenAll` 4,240), phrases back 5 of 39
  (1), in 0.25 s (6.2 s).
- **Far better** than `shortenAll` where pieces repeat across lines: Brothers 914 (4,811), Royal 11,764 (13,527), IDM
  1,229 (2,736; one of the pieces whose notes the MIDI path already changed), Sailor 426 (1,105). Close on Pachelbel 928
  (836).
- **Still behind** on Cellscape 3,053 (1,676), Korobeiniki 1,885 (909), Zell 1,310 (705), Hypercell 1,817 (1,360):
  arrangements whose parts come back transposed and at other places, where `shortenAll`'s phrases of 4 to 16 tokens
  with `^$k` win over Re-Pair's binary symbols.

## The WTC run (#333)

The MIDI library (`midi/wtc`, 37 preludes and fugues, 34,200 notes) folded as the files come
(`tools/probe/midi.test.ts`; `src/engine/fold/midiRatchet.ts` is its ratchet, over every collection since). **Before: the score 153,783 characters flat,
123,735 folded (80.5 %), every fold taken, 633 cells, 212 of them copies; 29 s. After: 120,755 (78.5 %), every fold
taken, 626 cells, 159 copies; 30 s.** The examples' ratchet at the same time: 56,125 → 55,974, phrases back 62 → 62.

- **Pairs inside a copied phrase** (`pairs.ts`): before, a phrase that variants copy was left alone (`base=` counts its
  steps as written). Now a pair is folded there where every copy keeps both steps, and in each copy too, one kept step
  for two; β takes a symbol back out of the copies' kept steps as out of the phrase. The fold with variants gets as
  short as the one without, nearly (WTC −1.8 %).
- **Phrases of 12 steps or more, a quarter of them changed at most** (`variants.ts`, from 8 and a sixth): fewer, longer
  families (WTC −1 %, the examples a little shorter, the phrases back the same).
- *Measured and left*: the other knobs move the total by under 1 % (seeds of 4 or 6, phrases up to 128 steps, a
  sixth or an eighth changed, `STRUCTURE` 1.3). `STRUCTURE` 1 (no preference for structure) folds the WTC 4 % shorter
  but keeps 3 copies of 212, and brings back 58 of the examples' phrases, not 62: the preference stays.
- *Tried and left out*: **voices apart** (a hand's notes split into lines by voice-leading, each note to the nearest
  free voice, none crossing): the subject sits in one line, but every voice's line pays for its rests: with a new voice
  only where none is free, the flat score 7 % larger and the fold 6.6 % larger than with chords; with a new voice for a
  leap of 9, 27 % and 35 %. **Overlaps by pitch** (a note that overlaps goes to the free line nearest in pitch, not the first):
  8 % larger. Dense lines fold shorter than voice-true ones while a rest costs characters. *(Since revisited, #366,
  below: the split was what failed, not the voices.)*
- *Where the characters are* (after): 93 K in the lines, 28 K in the cells they splice; of the lines, 72 K are notes
  written out (16,820 of them), 18 K of that their lengths (`@2`). Counterpoint that never comes back at a chromatic
  transposition is most of it.

## Two more collections (#333)

The Inventions and Sinfonias (30 files, 17,439 notes) and the Anna Magdalena Notebook (19 files, 3,467 notes) joined the
MIDI library, and its ratchet (`ratchet.midi.<set>.json`). Folded as today's folder does, with nothing tuned for them:

- **Inventions and Sinfonias:** 72,413 characters flat, 57,672 folded (**79.6 %**), every fold taken; 334 cells, 82 of
  them copies; 10.5 s.
- **Anna Magdalena:** 18,811 flat, 16,160 folded (**85.9 %**); 14 of 19 folded. The other five (the Polonaise in
  G minor, three chorale settings, an aria) are short, and a fold isn't shorter than the notes written out.
- The minuets fold little (Anh. 114: 92 %) because their repeats are played once in Mutopia's files (LilyPond writes
  a repeat once unless it is unfolded): a dance's form is mostly in its repeats.

## Degrees (#344, decision 033)

`degrees.ts` writes the lines in degrees of the piece's key (the scale of the twelve tonics × major, minor, harmonic minor
whose accidentals over the notes are fewest; a tie to the tonic the bass ends on), each note its degree and accidental
(`6#`). The tokens carry the accidental in their key (`n2:0,2#`), so a phrase compares a degree apart and moves by
`^n`, its accidentals with it. `cellsFromMidi` folds both spellings and keeps the shorter that plays the same
(`pitches: 'auto'`; `'semitones'`, `'degrees'` for a probe). Figures are looked for in semitones only.

- **The examples through MIDI: 55,974 → 51,810 characters (−7.4 %), phrases back 62 → 67**, notes kept by the same
  64. Korobeiniki 1,949 → 1,043, Zell 1,342 → 733, Cellscape 3,043 → 1,824, Pop 819 → 640: pieces written in degrees
  come back in degrees.
- **The WTC: 120,755 → 118,353 (−2.0 %)**, every fold taken; 13 of the 37 come out shorter in degrees (the C major and
  C♯ major fugues, the D♯ minor fugue, the E minor prelude …), 23 in semitones, one the same (the chromatic B minor
  fugue is 18 % longer in degrees). The keys found are mostly the pieces' own (A minor for the A minor fugue, B minor
  for the B minor); the F minor fugue comes out in E♭ major, its accidentals fewest there.
- **The Inventions and Sinfonias: 57,672 → 56,917 (−1.3 %); Anna Magdalena unchanged (16,160).** The whole MIDI
  library 194,587 → 191,430, the same 81 folds taken.
- Why not more on the WTC: a fugue's voices sit in two hands' lines, mixed into chords (the WTC run above), and its
  modulations need accidentals in one key for the piece (option 3a). A key per section (#346) is the next measure.

## A passage at another speed (#345)

`stretch.ts`: a run of 12 steps or more whose lengths all share a factor k (a passage in eighths among sixteenths) is a
cell of those steps at its own speed, spliced k times slower: `&m3^$-7@2` (the language plays a splice `@k` as its steps
each k long). A run written alike is spliced from the same cell, at whatever speed, so a phrase and its augmentation
are one cell. A token carries its stretch (`Tok.stretch`), pairs take a stretched token as another than the same at its
own speed, β writes a stretched use out at its full length when it judges and when it takes a symbol back. The tool
runs before the variants and pairs, on the notes as written.

- **The MIDI library: 191,430 → 183,046 (−4.4 %); folds taken 81 → 84** (three Anna Magdalena pieces fold now: the
  chorale BWV 510 opens each hand on a passage at half speed, `&m1^$5@2`, `&m3^$-7@2`). The WTC 118,353 → 112,818
  (−4.7 %), the Inventions and Sinfonias 56,917 → 55,129, Anna Magdalena 16,160 → 15,099.
- **The examples: 56,513 → 56,422, phrases back the same 65**, notes kept by the same 56 (the baseline as the examples pass,
  #351, left it).
- *Measured and left*: after pairs, it finds little (the lines are symbols by then: −38 characters); before them with
  runs from 4 steps, the MIDI library −4.1 % but the examples lose 6 phrases back (a stretched run hides a phrase from the
  variants); between variants and pairs, −2.9 %. Runs from 10 steps fold as 12 do; from 16, less.

## Sections by key (#346)

`sections.ts`: the piece's key areas, a bar a time, each bar's notes priced in accidentals in each of 36 collections (the
twelve major scales with their relative minors, the twelve harmonic and twelve melodic minors), the path of fewest with a
change of key costing 12 (a Viterbi path: a key where it lasts, not for a chord), areas under two bars their neighbours'.
Each is named in its collection (a major scale's notes as its major or its relative minor, by the tonic the bass starts or
ends on; on one tonic a minor natural, harmonic or melodic is one key). Each line is cut at each area's start, or where a
note is held across it, at the nearest step within a bar where none is; each part is a cell read through its section's key
(`&upB over=&key2`), the line splices its parts (`&up step=&tempo &upA &upB@2 &upC &upD &upE`), a part all rest a rest,
a part written alike the same cell. The parts are folded together in degrees of their own keys, so an entry in the
dominant is the same degrees as the one in the tonic.

- **It doesn't pay in characters.** On every piece with more than one key area it is 2–45 % longer than the best fold
  without (the key cells, a cell a part, and phrases that can't fold across a cut). So it is taken for reading, with an
  allowance as variants are (`SECTIONS` in `midiimport.ts`, 1.15 as `STRUCTURE`): **7 pieces of the MIDI library come
  out in sections** (the G major fugue as G major, E minor, B minor, G major; Sinfonia 2 as C minor, G minor, C minor;
  the E♭ major prelude of book I, the F minor, A minor and B minor fugues, Sinfonia 7), **the library 183,046 → 184,880
  (+1.0 %)**, none of the examples (they modulate little through MIDI), their ratchet unchanged.
- *Measured*: at 1.05 one piece takes sections, at 1.2 eleven (the examples then 3 % longer, phrases back 65 → 66). A
  change costing 24 instead of 12 makes fewer, longer areas and saves little.
- *Next*: sections at the boundaries the time engine hears (the swells, `time/boundaries.ts`), where a piece repeats
  itself in one key (a dance's halves, a pop song's verse and chorus).

## Voices (#366)

`voices.ts` gives each note a voice, after Chew & Wu's contig mapping (2004), on line:
- **How many voices:** as many as notes sound at once, but for the thickest 6 % of the time, so a cadence's chord
  doesn't add one.
- **At each onset:** the notes that start go to the voices free then, in order (the highest note to the highest free
  voice).
- **Which order:** the one that moves each voice least. Crossing a sounding voice costs 12; a voice not heard yet
  starts from its register (its pitch the first moment all voices sound) and costs 7 more.

`cellsFromMidi` folds the file a line a track and, where the tracks are one instrument and some track holds more than
one voice, a line a voice (`byVoice`), and takes the shorter (`split: 'auto'`). The live fold shows both
(`…, in voices`).

- **Against the voices written** (the disassembler's bench, [disassembler.md](disassembler.md); 29 pieces of three
  voices or more whose typesetters wrote clean voices): 96 % of pairs of notes one after the other in a voice found are
  in one voice written (precision), 93 % the other way (recall). At most-ever-sounding instead of 6 %: 96 / 91, and five
  fugues get a voice too many.
- **The MIDI library: 204,121 → 198,859 (−2.6 %)**, every fold taken. Voices are taken in the Ricercar a 3 (7,859 → 7,060), 12 of the Sinfonias (3 to 14), the WTC I/3, I/8,
  I/11, I/12 and I/20 fugues and the I/24 prelude (I/8 5,459 → 4,737, I/12 6,751 → 5,812). The examples: 53,236 → 53,148, phrases back the same 66, notes kept by the same 66.
- What perfect voices would give (the typesetters', folded): 6.1 % shorter on the 64 clean files. The voices found are
  not always taken: a voice that holds a note across another's start makes the importer add a line beside it
  (`upper2`), and Sinfonias 1 and 2 stay in hands for that.
- **A rest of more than 4,096 steps** (a voice entering late in a long piece) was written `~@n` past the parser's
  limit, so the flat piece didn't compile and no fold could be checked against it (the Ricercar a 3's voices). It is written in holds the parser
  takes now (`~@4096 ~@903`).
- *Cost*: every polyphonic file is folded twice: the library's ratchet (a set a worker, `midiRatchet.ts`) about
  twice as long, the WTC's the longest.

## What was tried and left out (measured on seven pieces)

- **Repeats as a tool of their own** (a block k times in a row, `&r!k`), before pairs: Pachelbel 3,309 → 7,951,
  Cellscape 8,012 → 10,381: a long repeat found first in one line hides the same phrase from the other lines. After
  pairs it found nothing; short blocks only (≤ 16 tokens, 3 times or more) helped Pop a little and Cellscape not.
  Pairs finds the runs once figures leave them alone.
- **No pair of a token with itself** (runs left to the printer): Cellscape 4,047 → 5,005, the seven pieces 30,150 →
  30,932 (whole files, characters): left out.
- **A figure wherever blocks are alike**: Cellscape's arpeggio over one chord eight times became tables padded with
  hundreds of `0`s; the rule that the harmony must move took Pachelbel 3,245 → 1,485 and Cellscape 8,956 → 5,005 (whole files).

## Next (step 5 and after)

- **Degrees**: done (above, #344); next, a key per section (#346) where a piece modulates.
- **Lengths**: done for passages (above, #345); a note's own `@n` stays where its neighbours don't share it.

- **Variants' cost**: 8.1 s for the library against 2.8 s; folding twice and the search per round are where it goes.
- **Phrases with `^$k` at their right length**: Re-Pair's symbols are binary; a phrase of five is three symbols. A
  tool that, after pairs, flattens a chain of symbols used only together into one cell (β inside out) would give the
  phrase its own cell, as `shortenAll` does.
- **Dilation inside a line** (a phrase at half speed among others) needs a way to splice a cell at another rate.
- **Sections** (cutting a line where the time engine hears boundaries) for reading, not for size.
- The folder in a worker: 2.8 s for the library, 1 s for Cellscape on the main thread when converting.

## The story of a fold (#390)

`fold/story.ts` tells how a fold comes about from its **result**, not from the folder's moves (`Watch`, which start
over for each spelling and take back most pairs: Anh. 113 makes 694 moves to reach 19 cells). β's move (`inline`)
undoes the fold one cell at a time, from the top, and the frames are read backwards. So the cells come lowest first,
motifs before the phrases made of them, and copies after what they copy. Each frame is printed with the finished
fold's names (`printFolded(…, fixed)`), so a cell keeps its name from the frame it comes in to the end. Every frame
plays the same notes (`fold/story.slow.test.ts`). `cellsFromMidi(…, { story: true })` returns the frames of the fold
taken, each with a line on what came (`&m4 · 14 steps · in 2 places`): 12 to 19 frames for Anh. 113, Invention 1 and
WTC I/1 and I/2.
