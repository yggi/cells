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
spliced (`&m6^$-12`) or as a copy of it with what differs (`&m17 base=&m6 _!3 [-1,2]@2`). How it finds them:

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
20 steps), used nine times, its bent entries copies of it: the tonal answer (`base=&m6 _!3 -7@2`), the entry in E♭
(`base=&m6 _!4 -3@2 _!11 -3@4 _!2 -8`), the last entry with its chord and long final note (`base=&m6 _!8 [-1,2]@2 _!10
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

- **Variants' cost**: 8.1 s for the library against 2.8 s; folding twice and the search per round are where it goes.
- **Phrases with `^$k` at their right length**: Re-Pair's symbols are binary; a phrase of five is three symbols. A
  tool that, after pairs, flattens a chain of symbols used only together into one cell (β inside out) would give the
  phrase its own cell, as `shortenAll` does.
- **Dilation inside a line** (a phrase at half speed among others) needs a way to splice a cell at another rate.
- **Sections** (cutting a line where the time engine hears boundaries) for reading, not for size.
- The folder in a worker: 2.8 s for the library, 1 s for Cellscape on the main thread when converting.
