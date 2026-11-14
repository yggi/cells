# Style: a point in style space, and a value read by name

A style is a point in style space: one value on each of its axes.
The axes are cells' own table (`AXES`, `src/engine/style.ts`), each with a name, a range and what it measures:

| axis | range | from one end to the other |
|---|---|---|
| `sync` | 0 to 1 | on the beat (0) to offbeat (1): where the accents fall |
| `harm` | 0 to 1 | static (0) to moving (1): how the harmony moves |
| `bite` | 0 to 1 | paddy (0) to stabby (1): how notes start and end, sustained and legato to short and struck |
| `mood` | 0 to 1 | darker (0) to brighter (1): what the mode says, moved by the tension in the harmony and the sound |

Each axis also carries the words a frontend shows for it, `label` (`Syncopation`, `Harmony`, `Bite`, `Mood`) and `ends` (`['on the beat', 'offbeat']` …), and its sentence is said from its ends, so a frontend's Style sheet reads its words from here (#538).
The axes are [decision 076](https://github.com/yggi/cells/blob/main/docs/decisions/076-the-style-axes.md)'s.
Energy is not one: it is intensity, how hard a style is played at a moment (#571), and entropy is the reach, how far a style may wander, never a place.

Density is not on the point either: how many notes and layers a style plays is how hard it is played, intensity, so one style played softly and loudly is one place (a jazz ballad and swing; #571).

**Mood starts from the mode** (`moodOf`, `src/engine/style.ts`): `0.6 · brightness + 0.4 · (1 − tension)`.
A mode's brightness (`BRIGHTNESS`) is its scale's degrees above the tonic summed, the third and the sixth counted twice, from locrian's sum (0) to lydian's (1): locrian 0, phrygian .125, aeolian .25, harmonic minor .375, dorian .5, mixolydian .75, ionian .875, lydian 1.
Tension is what the harmony and the sound do with the mode, from at ease (0) to menacing (1): a style's is heard and placed by hand (Spooky .3, a harmonic minor made eerie; Kinderlied .95), and where nothing says more it is a quarter (`MOOD_TENSION`), so a mode alone gives aeolian .45, dorian .6, ionian .825.
A mode fragment's point has its own mode's mood, or a style's where it sits at that style's point; a tonal fragment's (a harmony, a bass, a motif, a stab, an instrument) the mood of the style it was placed for, or of the mode the library finds at its point; a meter, a rhythm, a performer, a module or a form leaves mood out, since a point names the axes it speaks to and a distance runs over the axes both points have.
What each set of axes does with 42 genres placed by hand, and the corners of the space no style stands in yet, is measured in [notes/572-axes-atlas.md](https://github.com/yggi/cells/blob/main/docs/notes/572-axes-atlas.md).

A text written on the axes before v0.23.0 (`sync harm artic energy`) is moved by Migrate (#572): `bite` is its articulation, energy leaves the point, `mood` is the mood of the style it sits near (within 0.15) or else of the mode the library found nearest it, and a pick of `[artic]` or `[energy]` reads `[bite]`.

A fragment's association points in the repository are written on the same axes ([use.md](use.md)), and a frontend reads them from the table rather than owning them ([decision 063](https://github.com/yggi/cells/blob/main/docs/decisions/063-the-score-and-the-band.md)).

## map=style

A cell with `map=style` is a style: a value for each axis, in the table's order, or each by its name.
It doesn't sound; what reads it is another cell.

```cells
&funk map=style .3 .45 .55 .5
&bossa map=style sync=.5 harm=.75 bite=.4 mood=.9
```

The two spellings are one point: `sync=.5 harm=.75 bite=.4 mood=.9` is the braid `.5 .75 .4 .9`.
The axes' names are read only on a `map=style` cell, so the list of attributes doesn't grow.
A style names every axis, each within its range; a value outside it, or one missing, is an error that lists them.
An axis may be left to the performer, a slider within its range, by name or in order: `sync=free(.3, 0..1)`, `&mine map=style free(.3, 0..1) .45 .55 .5` ([free.md](free.md)).
The slider is named by its axis, and what reads the style reads its value as it reads a number's.
An axis may also move, by name: a range within it and the cell that moves it, `bite=.2..0.9 * &drift`, or the cell alone for the axis's whole range, `bite=&drift`.
What reads the axis (`&style[bite]`, or `&mine[bite]` on the style itself) reads that cell, its numbers from 0 to 1 laid within the range, on the cell's own clock: a line of numbers, a choice drawn afresh each step (`&drift step=1m/8 [0|.25|.5|.75|1]`, a sample-and-hold once a section), nested as deep as wanted.
The window may be set by a hand, its ends sliders within the axis, `bite=free(.2, 0..1)..free(.9, 0..1) * &drift`, or its centre and reach, `bite=free(.55, 0..1) ± free(.25, 0..0.5) * &drift`, held to the axis ([sound.md](sound.md), decision 079).
Where nothing reads it moving, the axis is the range's first end.
One cell moves an axis: a line of numbers, or a sum of them (`&drift [&section * .5 + &song * .3 + &set * .2]`, [mix.md](mix.md), decision 079), each term laid within the range.
Read through a mix of styles, a moving axis is the mix's weighted sum, a still style's value a constant in it; a range of styles doesn't move with a moving one yet, an error that says so (#576).

```cells
&bar meter("4/4") step=120bpm
&mine map=style sync=free(.3, 0..1) harm=free(.45, 0..1) bite=.2..0.9 * &drift mood=.5
&drift step=1m/8 [0|.25|.5|.75|1]
```


## A value by name: &x[slot]

A map that names its slots lets a pick read one by its name:

| map | its slots, in order |
|---|---|
| `map=adsr` | `attack` `decay` `sustain` `release` |
| `map=style` | `sync` `harm` `bite` `mood` |

`&x[slot]` is the slot's fixed position, as written: `&pluck[sustain]` is `&pluck[$2]`, and `&funk[bite]` is `&funk[$2]`.
It doesn't follow `shift=`: a field doesn't turn.

```cells
&bar meter("4/4") step=120bpm
&pluck map=adsr .01 .3 .5 .4
&funk map=style .3 .45 .55 .5
&held step=4n &pluck[sustain] &pluck[attack] &funk[bite] &funk[$2]
&tone s=sine loop=C4
&out map=sample [&held * &tone]
```

A cell whose map names no slots refuses a name, and so does a name its map lacks; the error lists the slots there are.
A bare word in a pick can only be a slot, since a pick otherwise holds numbers, `$`, `:`, `<<` and `>>`, so this adds to Strudel's spellings without changing one ([decision 027](https://github.com/yggi/cells/blob/main/docs/decisions/027-on-top-of-strudel.md)).

## style=: a cell's style, and the section's

Any cell may carry `style=`, its association or wish: a style cell, an unnamed one, or a mix of them by weight.

| written | what it is |
|---|---|
| `style=&funk` | a style cell's point |
| `style=&(map=style .41 .6 .48 .5)` | an unnamed one |
| `style=[&funk * .8, &bossa * .2]` | a mix: the weighted sum of the styles' points, exact by definition |
| `style=&funk..&bossa` | a range: from one to the other over the cell's scope |
| `style=&funk..&bossa * &curve` | a range, where between the two ends set by a line from 0 to 1 in place of time |
| `style=(&funk \| &bossa * .5)` | a set, found at each ([decision 089](https://github.com/yggi/cells/blob/main/docs/decisions/089-the-association-in-the-text.md)): where the cell belongs, each style with its weight; it has no one value, so a pick of it (`&x[bite]`) and the section's `&style` set to one are errors |

Each end lies within the axes' ranges: a mix whose weights take it outside is an error.
In a style cell, `bite=.55 ± .1` with nothing moving it is a reach: how sure the point is on that axis, its value the centre (a pick reads .55); kept, read by no query yet. With a cell moving it, `bite=.55 ± .1 * &walk`, it is [decision 079](https://github.com/yggi/cells/blob/main/docs/decisions/079-a-sum-of-cells-and-a-window.md)'s window, as before.

**The note `&style` is the section's style** ([decision 063](https://github.com/yggi/cells/blob/main/docs/decisions/063-the-score-and-the-band.md)).
`&style` is the score's name for it by convention, as `&bar` and `&key` are, and only a name ([decision 075](https://github.com/yggi/cells/blob/main/docs/decisions/075-a-name-is-only-a-name.md)): the band declares the style and the score passes its own (`* from band(…, style=&style)`), so a band written once reads it in every section.
A pick reads its value on an axis, `&style[bite]`, and a voice's moving parameter can take it as a factor:

```cells
&bar meter("4/4") step=120bpm
&funk map=style .3 .45 .2 .5
&bossa map=style .5 .75 .8 .875
&style label="Section 1: from Funk to Bossa nova" style=&funk..&bossa
&line step=1m 0!8
&bassV s=saw loop=C2 lpf=300..1200 * &style[bite]
&out map=sample [&line * &bassV]
```

**`&style` is the composer's.** A fragment reads it and never defines it: a used fragment with a line for `&style` is an error, whether or not the piece writes its own, since two fragments' styles would collide and the section's style is the score's to say (#391, the owner's ruling on yggi/cells#405).
**Where no line writes it, a pick of an axis reads the centre of style space**, the middle of each axis's range (`CENTRE`, `src/engine/style.ts`): an instrument heard alone plays as it does at the centre (`lpf=450..900 * &style[bite]` is 675 Hz). In a piece with performers, a score played, an info says so (`no line writes &style: &style[bite] reads the centre of style space …`), as a part no line writes is said; an instrument heard alone says nothing. A bare reference to an unwritten `&style` is still unknown.

**A range glides over the cell's scope, the piece's length** (its bars, as cells finds it: [time.md](time.md)).
Bar k of n begins at a + (b − a)·k/n, in a straight line sixteen steps a bar, on the piece's meter: the glide comes round with the piece and follows its tempo, and doesn't lengthen it.
With no meter, it glides in seconds.
A factor written out, `* &curve`, sets where between the two ends instead: a line of numbers from 0 to 1, on its own clock.

A pick of a slot as a factor reads its value, held: `lpf=0..1000 * &pluck[sustain]` is 500 Hz with `&pluck map=adsr .01 .3 .5 .4`.

**A frontend reads the style a piece plays at a time with `styleAt(text, seconds)`** (`src/engine/styleat.ts`, #576): a point, one value per axis in `AXES`' order, each as a voice reading `&style[axis]` would read it then.
A held axis is its value; a moving one, a glide or a mix of styles is its value at that moment; a slider is read at its value as written; an unwritten `&style` is the centre.
`{ cell: 'mine' }` reads another style cell; the piece's other compile options (`resolve`, `env`) pass through, and the last text read is kept, so a score read at each section's start compiles once.
It is null where the piece doesn't compile.
Jambot reads a radio score so, a section at a time (#576).

## A fragment's association, in its text

Where the repository finds a fragment is written on its declaration line ([decision 089](https://github.com/yggi/cells/blob/main/docs/decisions/089-the-association-in-the-text.md)): a template's signature, or a collection's `* from` with no id. The compile reads neither, and no copy or take carries one into a piece.

```text
&key from (&mode) &tonic style=(&deepHouse | &funk | &seaShanty) mode=dorian
* from style=(&synthPop | &(map=style sync=.35 harm=.55 bite=.75 mood=.65) * .5)
* from facet=module
```

- `style=` is a style of `styles` by name, followed wherever it is placed, or an inline point naming any of the axes (`&(map=style sync=.75 harm=.35 bite=.65)`, decision 041), with `± r` its reach on an axis; `* w` a weight, 1 where left out; `( a | b )` a set, found at each.
- The facet is the fragment's folder's in the seed library (`fragments/modes/` is `mode`); `facet=` where it differs, or where there is no folder. A declaration with neither counts for every facet.
- A template's other attributes are its arguments at those points, its optional parameters (`mode=dorian`), one declaration line per set; `style` and `facet` are reserved.
- No `style=` is no style: found at the same distance from every style (`ANY_DISTANCE`). A template's bare signature is so, where nothing else says where it is.
- A fragment file whose frontmatter has `association:` still reads, for a release; Normalise will move it.

## The library of styles: styles

The seed library holds the preset styles as the cells of one collection, `styles` (`fragments/styles/01-styles.md`): `&synthPop`, `&techno`, `&deepHouse`, `&ambient`, `&lofi`, `&funk`, `&bossaNova`, `&swingJazz`, `&electroSwing`, `&spooky`, `&kinderlied`, `&acid`, `&happyHardcore`, `&elektro`, `&darkAmbient`, `&baroque`, `&bluesShuffle`, `&seaShanty`, `&chiptune`, `&salsa`, `&waltz`, `&march` and `&tripHop`.
Each is a style cell at its point, with its display name as `label=` and its default tempo as `step=`. Each finds its own parts first, at distance 0, in every facet its piece gave the library: Spooky, Kinderlied, and the eight cut from *Acid-Cell*, *Hypercell*, *Zelluläre Aktivität*, *Ghost-Cells*, the Bach pieces, *Swing blues*, *Drunken Sailor* and *Korobeiniki* (#572), and the four placed by hand with parts written for them, Salsa, Waltz, March and Trip-hop (#542; `src/repository/styleparts.test.ts`). [Style: a point the voices read](../../examples/style.md) is the tutorial's piece for `map=style`, `style=` and `&name[slot]` (tier 6).

```cells
&funk map=style label="Funk" step=104bpm sync=1 harm=.12 bite=.85 mood=.65
```

The collection is the presets' one source: a frontend reads it as `STYLES` (`src/repository/styles.ts`), each style `{ id, name, point, tempo }`, in its order (#537).
Only the library reads `step=` on a style: `style=` and a query read the point alone, so a style has no tempo ([decision 037](https://github.com/yggi/cells/blob/main/docs/decisions/037-the-handshake-with-jambot.md), D6).
A score takes one by name where its section sits exactly on it, and writes its numbers, or a mix of styles, where it doesn't ([decision 063](https://github.com/yggi/cells/blob/main/docs/decisions/063-the-score-and-the-band.md) §3).

```cells
&funk, &bossaNova from styles
&style label="Funk, turning to Bossa nova" style=&funk..&bossaNova
```

The collection is associated at each of the twenty-three points as the facet `style`, so the style nearest a point is a query too.
`nearestStyle(point)` ranks the styles themselves by it, nearest first: by `pointDistance`, the one distance between two styles, over the axes both have, with `axisWeights` to weigh an axis down and `styles` for a frontend that ranks on an axis of its own as well, such as a tempo (#538).

## The default band: a score played as its style says

A score ends in `* from band(…)`, and the client's resolver answers `band` ([decision 063](https://github.com/yggi/cells/blob/main/docs/decisions/063-the-score-and-the-band.md) §1).
The band reads only what it declares ([decision 075](https://github.com/yggi/cells/blob/main/docs/decisions/075-a-name-is-only-a-name.md), #560): the score passes its parts, its levels and its style as the band's arguments, `* from band(bassline=&bassline, …, style=&style)` (`bandLine(score)` writes the line). A part it doesn't pass rests, and a style it doesn't pass is the centre.
The seed library's band, `band` (`fragments/bands/01-band.md`), plays Jambot's five roles on the default instruments, which read the score's `&style` where Jambot's synth reads its style: the bass's cutoff and the lead's open with bite (`&bassV … lpf=450..900 * &style[bite]`, `&leadV … lpf=1400..3600 * &style[bite]`), and the keys' and the pad's envelopes shorten with it. The instruments, the performers and the band each declare `&style`, its default the centre of style space, and pass it on.
It sends the score on a MIDI card on Jambot's channels and hears it on a sound card.

```cells
&bar meter("4/4") step=104bpm
&key scale(dorian, D)
&harm over=&key step=1m [0,2,4] [3,5,7]
&kick note=36 step=4n &bd &bd &bd &bd
&drumlines [&kick]
&bassline over=&harm step=8n 0 ~ 0 2 ~ 0 4 ~
&padline over=&harm step=1m [0,1,2]
&stabline step=1m ~
&leadline over=&key step=8n 4 ~ 3 2 0@4
&funk from styles
&style label="Funk, a section" style=&funk
* from band(drumlines=&drumlines, bassline=&bassline, padline=&padline, stabline=&stabline, leadline=&leadline, style=&style)
```

Which instrument a performer plays at a style is the band's choice too, made at resolution: `resolveBand(score)` answers `band` with each pitched voice the instrument the library ranks first at the score's style within 0.3 of it (`INSTRUMENT_REACH`, Jambot's miss distance; farther, the performer plays its own), named or written as numbers, (a clarinet at Electro swing's point, a theremin at Spooky's, the upright bass and the muted trumpet at Swing jazz's), and the band as written at Synth-pop's, Techno's, Deep house's, Lo-fi hip hop's and Bossa nova's (`src/repository/band.ts`).
The instruments are found where the score's style starts: a range, `style=&funk..&electroSwing`, plays Funk's instruments, the defaults, throughout, and the reverse plays Electro swing's. A found instrument is voiced for its point and reads no `&style`, so where it plays, the style moves no cutoff of that voice.
A line can't make that choice: a voice reads a style as a moving parameter, and a wave or an envelope's times are not one.

## Reading a style from notes

The way back, from notes to a point, is `src/engine/reading/` (#541): the reader the repository's first guess at a fragment's place, a corpus's styles (#542) and a frontend's style of an open piece share. It reads a span of bars, each its notes with the part that played them (the band's five: drums, bass, pad, stab, lead), the step each starts on and how many steps it sounds, and answers `readPoint(bars, bar)`: the point on the axes the notes could speak to, a confidence for each, 0 to 1, and the span's intensity.

- `sync`: syncopation proper, read per line (a part, and each drum by its note): an onset on a weak place whose line leaves the next stronger place silent, by how much weaker its place is (`syncopation`, #681). It reads a clave's eighths and an anticipation, which the onsets off the grid alone did not.
- `bite`: one less the median share of its gap a note of the bass or the lead sounds, as played (the gate, not the written length).
- `harm`: the chords read back from the pad and the stab, a root and a quality each half bar, as the mean of how often they change and how far past a triad they reach (`readHarm`).
- `mood`: the mode the pitched notes fit best, of the eight `BRIGHTNESS` knows, its tonic the one the notes (the bass counted twice) weigh most, at `moodOf`'s default tension; tension itself is not read (`readMood`).
- Density, onsets per step, is the intensity, not a place (#571).

An axis the notes can't speak to is left out: a drum part has no `harm` and no `mood`. A confidence is how much the notes had to say: `sync`'s the onsets over the bar's steps (a pad's chord a bar is under 0.2), `bite`'s the line's notes over four, `harm`'s the halves with a chord read, `mood`'s the share of the weight its scale covers times the pitch classes heard over seven. A bar is a meter's sixteenths and its pulses (`barOf`). The readings of bite, harm and density were Jambot's critic's (yggi/jambot#15), lifted with their tests. Its `sync` (the share of onsets off the pulses and the eighths) read every clave as 0 and Jambot's presets compressed (#681); syncopation proper replaced it.

A reading is not a place: the axes are placed by hand (Funk's `sync` 1 is the most syncopated style, not every onset syncopated), and a statistic of notes lands where the notes put it. So a fragment's **first guess** at its place compares readings with readings (`src/repository/firstguess.ts`, #681): it is read through its audition as the part its facet names, the library's fragments of that facet are read alike, and the guess is the mean of the placed points of the two whose readings are nearest (`guessPlace`). It places only the axes a facet's notes carry, a beat's `sync` and a harmony's `harm`, where each fragment guessed from the others comes nearer its placement than their mean and than its own reading (`firstguess.test.ts`); a bass line's or a motif's notes guess no axis better than the mean, and leave every axis out.
