# The Shorten ratchet's baseline (#307, step 3)

Date: 2026-10-12 · Status: open (the baseline steps 4–5 must not make worse) · Issue: #307 (part of #234)

**Since:** the folder (step 4, [fold.md](fold.md)) is scored beside `shortenAll` by the same probe. And the ratchet is a
gate now: `src/engine/fold/ratchet.test.ts` scores the folder alone in `npm test` (12 s) against
`src/engine/fold/ratchet.baseline.json` ([testing.md](../testing.md)). Its first record, with the preference for
structure (fold.md): 74 pieces, notes kept by 64, the score 56,125 characters, **phrases back 62 of 191** (58 before it,
`shortenAll` 58). After the run on the WTC ([fold.md](fold.md#the-wtc-run-333)): the score 55,974, phrases back 62; and
the MIDI library has a ratchet of its own (`src/engine/fold/midi.test.ts`, `ratchet.midi.json`): 37 files, every fold
taken, the score 120,755. With the Inventions and Sinfonias and the Anna Magdalena Notebook (fold.md): 86 files, 81
folds taken, the score 194,587.

`tools/probe/ratchet.test.ts` takes every example the way a MIDI file comes into the app (saved as MIDI and opened
again: `pieceMidi` → `writeMidi` → `readMidi` → `cellsFromMidi`), folds it with today's Shorten (`shortenAll`), and scores
it against the example as written:

- **notes**: the flat piece and the folded one play the example's notes (keys, starts within 10 ms);
- **score**: the characters of the cells that hold notes and time (braids, tables, meters, kits; voices, mixes,
  labels and comments left out, since a flat piece has stock voices): written, flat, folded;
- **phrases back**: of the example's phrases (cells of five or more notes written out), how many come back as a cell
  of the folded piece with the same rhythm and the same contour of its top line, so a phrase in degrees and the same in
  semitones, or transposed, still match.

```
PROBE=out.txt [ONLY=bwv847,pop] [LONGEST=40000] npx vitest run tools/probe/ratchet.test.ts
```

## The baseline

**73 pieces (two laws left out): notes kept by 63; the scores 26,931 characters written, 198,100 flat, 60,810 folded
(226 % of written); phrases back 52 of 185 (28 %); Shorten 29 s in all.**

- **Folding works on size, not on structure.** Shorten takes the flat pieces from 7.4× to 2.3× the written size;
  Korobeiniki 6,936 → 909 (written 718), Pachelbel 22,781 → 836 (566), Pop 5,419 → 606 (513). But it gives back a
  phrase in fewer than a third of the cases: BWV 847 1 of 39 (the prelude's figure as seven-note fragments, `&m1^$12`,
  not one figure read over a table of chords; the fugue's subject not one cell: it is 20 notes and phrases stop at 16).
- **The worst folds** are the long ones with many voices: Royal 20,085 → 13,527 (240 written), Brothers 11,157 → 4,811
  (644), Lullaby 4,425 → 2,611 (383). They are where a phrase longer than 16 tokens, or one shared between lines, matters.
- **Time**: 29 s for the library, 6.1 s for BWV 847 alone, on one thread.

## Where the MIDI path loses notes (10 pieces)

Not Shorten's: the notes are already different in the flat piece.

- **Starts that fall on no grid** (a second clock at a ratio, ratchets, tuplets, a motor slowing down): the grid finder
  falls back to sixteenths and moves them. Phase (two pianos at 80:81) 888 starts moved; IDM 380, Cellscape 2 193,
  Rhythm 18, Echotape 20, Musicbox 4 (running down). Where two land on one step a note is lost (Automaton, Cellscape 2,
  Tape).
- **Pitches that are no MIDI key**: DTMF's tones (8), the Metronome's kit (4).

A per-line grid, or a meter per clock (Phase's two), and microtonal pitches as `^$cents` would close most of these:
step 4 or later.

## The table

```
piece                     notes   score: written   flat  folded   phrases: back/of   shorten (s)
tone                      same/same          14     80      80          0/0      0.0
rests                     same/same          46    125     121          1/1      0.0
semitones                 same/same          53    117     117          1/1      0.0
twovoices                 same/same          46    248     167          0/1      0.0
steps                     same/same          98    163     163          1/1      0.0
clock                     same/same         174    325     311          0/2      0.0
voice                     same/same         148    242     212          2/2      0.0
effects                   same/same         175    239     213          2/2      0.0
transpose                 same/same         163     94      94          1/1      0.0
twinkle                   same/same         238    367     249          1/4      0.1
chords                    same/same         191    165     155          0/0      0.0
rhythm                    DIFF/DIFF         124    508     357          0/0      0.0
drums                     same/same         240    643     518          0/0      0.0
swing                     same/same         267    271     222          1/2      0.0
canon                     same/same         155    650     399          0/2      0.1
mirrors                   same/same         256    283     226          3/3      0.0
chance                    same/same         203    205     173          0/2      0.0
fifths                    same/same         126    934     815          1/1      0.0
arrangement               same/same         392    552     284          1/1      0.0
stereo                    same/same         126    186     179          1/1      0.0
waveforms                 same/same         221    235     197          1/1      0.0
moving                    same/same          91    306     154          1/1      0.0
grids                     same/same         286    172     110          0/3      0.0
metronome                 DIFF/DIFF         189    110     110          0/0      0.0
fm                        same/same         177    176     170          1/1      0.0
musicbox                  DIFF/DIFF         259   1598     858          0/2      0.1
automaton                 DIFF/DIFF         316    445     424          0/2      0.0
kalimba                   same/same         121    141     141          1/1      0.0
sympathy                  same/same         128    138     136          1/1      0.0
harmonograph              same/same         188    103     103          0/0      0.0
echotape                  DIFF/DIFF         386    513     470          1/1      0.0
worn                      same/same         356    119     119          1/1      0.0
dtmf                      DIFF/DIFF         193    206     206          0/1      0.0
daytime                   (a law: its notes computed, not written; left out)
gate                      same/same         208    320     314          1/1      0.0
play-in                   same/same         158    150     144          0/0      0.0
midi-out                  same/same         177    224     204          1/1      0.0
lullaby                   same/same         383   4425    2611          1/8      0.2
jazz                      same/same         463   1226     500          0/4      0.1
five                      same/same         360    726     396          0/4      0.1
waltz                     same/same         310    504     430          3/4      0.0
sailor                    same/same         258   2343    1105          1/4      0.1
royal                     same/same         240  20085   13527          0/1      3.0
pertonos                  same/same         278   3692    2404          0/2      0.6
ricercar                  same/same         857   1970    1667          3/8      0.2
korobeiniki               same/same         718   6936     909          2/9      1.1
coltrane                  same/same         246    413     310          0/1      0.0
bossa                     same/same         242   1416     314          0/2      0.1
bell                      same/same         143    344     235          0/1      0.0
prelude                   same/same         396   1819     870          1/1      0.7
pachelbel                 same/same         566  22781     836          0/3      1.8
pop                       same/same         513   5419     606          3/4      0.4
idm                       DIFF/DIFF         420   4881    2736          1/2      0.6
alpha                     same/same         224   1032     256          1/1      0.1
studie                    same/same         287    287     287          0/1      0.0
just                      same/same         189    207     201          0/0      0.0
bwv847                    same/same        5231   6033    4240          1/39     6.1
acid                      same/same         207   1412     444          1/3      0.2
zell                      same/same         495   7795     705          1/5      0.7
cellscape                 same/same         765  27425    1676          0/5      4.2
cellscape2                DIFF/DIFF         610   1573    1301          0/2      0.4
baustelle                 same/same         977  11529    1635          1/4      1.6
focus                     same/same         316    551     506          0/1      0.1
hypercell                 same/same         808  17723    1360          0/4      2.1
onemore                   same/same         547   7928    1257          0/3      1.7
brothers                  same/same         644  11157    4811          0/4      0.6
ghosts                    same/same         347   1654     878          1/2      0.5
tines                     same/same         344    620     432          3/3      0.0
phase                     DIFF/DIFF         219   8014     398          1/1      0.4
tape                      DIFF/DIFF         309   1696    1181          0/1      0.2
soundtape                 same/same         385    174     171          1/1      0.0
testtones                 same/same         520    621     384          0/2      0.1
forks                     same/same          49     79      79          0/0      0.0
resonanz                  same/same         376    257     237          1/1      0.0
fiveto12                  (a law: its notes computed, not written; left out)
73 pieces: notes kept 63 flat, 63 folded; score characters 26931 written, 198100 flat, 60810 folded (226 % of written); phrases back 52 of 185 (28 %); Shorten 29 s in all
```
