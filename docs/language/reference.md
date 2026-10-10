# Syntax reference

Every form the parser reads, what it means and an example: generated from the parser's own tables (`src/engine/parser/`, with `src/engine/attributes.ts`), so it says what the parser does. The topic pages explain at length; each entry links its page. Don't edit this page: change the tables and record it with `UPDATE_REFERENCE=1 npx vitest run src/engine/parser/reference.test.ts`. Every example here is parsed by that test.

[Lines](#lines) · [Steps](#steps) · [Modifiers](#modifiers) · [References](#references) · [Generators](#generators) · [free(): left to the performer](#free-left-to-the-performer) · [step= and loop=](#step--and-loop-) · [map=](#map-) · [Attributes](#attributes) · [Parameters](#parameters) · [Sorts: what a cell is in a mix](#sorts-what-a-cell-is-in-a-mix) · [Mixes](#mixes)

## Lines

- `&name …`: A cell: one per line, its name first, then its attributes (key=value) and its braid, in any order. [→](cell.md) `&theme over=&major step=&bar 0 2 4 5`
- `&name label="…"`: A note: a cell with only a label= (and title=, tags=, about=) explains, in the graph; it does nothing. [→](display.md) `&why label="The bass walks down a fifth each bar."`
- `off`: Switched off: it, and everything that reads through it or plays it, is silent (and hidden from the graph). [→](cell.md) `&drums off over=&kit step=&bar 0 1`
- `# …` · `// …`: A comment, to the end of the line: # at the start of a line or after a space (a # glued to a number is a sharp), // anywhere. [→](cell.md) `&tune step=2 0 2 4  # the opening`
- `… +` · `… *` · `… ,` · `… [`: A line ending in +, *, a comma or [ continues on the next one (a long mix). [→](cell.md)
- `&parts step=&bar &a &b`: Taps of a meter's bus (decision 016): a stepped table of names declares them, each stepped as the table is. What a tap steps plays while a selector reading the table picks it (`over=&parts`), from its top each time: an arrangement. [→](time.md) `&parts step=&bar &verseBar &chorusBar`

## Steps

- `n`: A number: an index into the table it reads (over=), or a value (a volume, a waveform's level). Negative and decimal numbers work. A note by name (C, F#, Bb3; octave 4 left out) is a pitch instead: a place on the grid at the root of its tables, whatever they are. [→](cell.md) `&tune step=2 0 2 4 -1 .5` · `&tune step=2 C E G C5`
- `n#` · `nb`: A number with accidentals: one step up (#) or down (b) on the grid below the table it reads — 6# over a scale is its 7th degree raised a semitone. [→](tables.md) `&tune over=&major step=2 0 4 6# 7 3b`
- `n/d`: A fraction: 9/8, 3/2 (the ratios of a map=ratios grid). [→](tuning.md) `&just map=ratios 1 9/8 5/4 3/2 2`
- `~`: A rest: a step that plays nothing. [→](cell.md) `&tune step=2 0 ~ 4 ~`
- `[a, b, c]` · `[a b c]`: A chord: the numbers sound together, in one step. Its notes can be names, pitches whatever the tables: [C, E, G]. [→](time.md) `&chords step=1 [0,2,4] [3 5 7]` · `&chords step=1 [C, E, G] [F, A, C5]`
- `[a|b|c]`: A choice: one of them, chosen afresh each time round (the same every time it is played). [→](braid.md) `&tune step=2 0 [2|4|7] 4`
- `&x`: A cell, spliced in: its braid plays in this one's step (as long as its own steps). Picks, shifts and transposing are under References. [→](braid.md) `&theme step=2 &motif &motif^$7 0`
- `&voice (stepped)`: In a stepped braid of voices (and rests), each step plays its voice: a drum pattern by name. Chords of voices sound together, [&bd, &hh]; modifiers work as on any step. Unstepped, a braid of voices is a kit, read by number. [→](sound.md) `&groove step=4 &bd ~ &hh [&bd, &sd] &hh*2 ~`

## Modifiers

- `x!n`: Repeat: n copies of the step, each as long as one. [→](cell.md) `&beat step=4 0!4 2!2`
- `x*n`: Ratchet: the step played n times within its own length. [→](cell.md) `&hats step=2 0 0*2 0 0*3`
- `x@n`: Hold: the step lasts n steps. [→](cell.md) `&tune step=2 0@2 2 4@3`
- `x?` · `x?p`: Chance: the step sounds with probability p (x? alone: the cell's chance=, ½ unless set). Reproducible: the same every time the piece is played; seed= gives another sequence. [→](cell.md) `&hats step=4 0 0? 0?.3 0` · `&ghost chance=.2 step=4 0? 0? 0? 0?`

## References

- `&name`: A cell, by name: in a braid (spliced in), after an attribute (over=&scale), in a mix. [→](cell.md) `&theme step=2 &motif 0`
- `&name[i]`: One entry of its braid as it is turned now (a fixed tap: it follows shift=), counted from 0; negative from the end (&x[-1] the last). &name[$i]: as written. [→](braid.md) `&tune step=2 &motif[0] &motif[-1] &key[$0]`
- `&name[a:b]` · `&name[a:b:s]`: A slice, Python-style: from a up to b (either may be left out), every s-th; [::-1] backwards (retrograde). As turned; [$a:b] as written. [→](braid.md) `&tune step=2 &motif[1:3] &motif[:-1] &motif[::-1] &motif[::2]`
- `&name[<<n]` · `&name[>>n]`: Shifted back or forward n places (1 if left out), on top of its own shift=: rotating it, climbing the helix. [→](braid.md) `&canon step=2 &theme[>>4]` · `&mode over=&scale[<<] 0 2 4`
- `&name^n` · `degree(&name, n)`: In a braid, moved n steps of the table it is read through (degrees, in a scale; relative): its values plus n, before the table reads them. n may be negative. &name^n is the short form. [→](braid.md) `&tune over=&major step=2 &motif &motif^1 &motif^-2` · `&tune over=&major step=2 degree(inverse(&motif), 4)`
- `&name^$n`: In a braid, transposed: what it plays, n grid steps up (^$-n down) after its tables (absolute: semitones on the 12). [→](braid.md) `&answer step=2 &subject^$7 &subject^$-12`
- `inverse(&name)`: In a braid, mirrored: its values negated before the table reads them (inversion within the scale, round its first degree). Operations nest: degree(inverse(&x), 4) mirrors round the third degree. [→](braid.md) `&tune over=&major step=2 &motif inverse(&motif) degree(inverse(&motif), 4)`
- `&( … )`: An unnamed cell, written where it is used, with attributes and a braid of its own. [→](cell.md) `&lead s=saw loop=C4 env=&(map=adsr .01 .3 .5 .4)`

## Generators

- `scan(i …)`: Running totals of intervals: a scale or a meter. An interval can repeat (`1!4`), be geometric (`geo(r, n, k …)`: r^(k/n) for each k) or be `free(…)`. [→](braid.md) `&major scan(2 2 1 2 2 2 1)` · `&bar scan(27 23 26 24) step=84bpm` · `&tempo scan(1!4 .5!2)` · `&series scan(geo(5, 25, 0 10 5))` · `&swing scan(free(2, 1..3) 1)`
- `euclid(k, n)` · `euclid(k, n, shift)`: k hits spread as evenly as they go over n steps (the Euclidean rhythms), turned by shift. [→](braid.md) `&tresillo euclid(3, 8)` · `&clave euclid(5, 16, 2)`
- `sin(n)`: One cycle of a sine in n steps, from −1 to 1: a waveform, or a slow swell. [→](braid.md) `&sine loop=220 sin(12)`
- `scale(name)` · `scale(name, tonic)`: A scale by name over the 12, turned to its tonic (a note name, a number or free(…); C if left out): the scan of its steps over a key of its own. Its shift= walks its modes; the tonic transposes. The names: major minor ionian dorian phrygian lydian mixolydian aeolian locrian harmonic melodic pentatonic minorpentatonic blues wholetone. [→](tables.md) `&scale scale(minor, D)` · `&blues scale(blues)` · `&scale scale(dorian, free(2, 0..11))`
- `fifths()` · `fifths(n)` · `fifths(note)`: The circle of fifths: the twelve pitch classes a fifth apart, C G D A E B F# C# Ab Eb Bb F, as written from C; turned n fifths round, or to start on a note (its shift=: [0] is where it starts, [$0] is C). Drawn round its wheel in its own order. [→](tables.md) `&circle fifths()` · `&circleG fifths(1)` · `&circleG fifths(G)`
- `meter("sig")` · `meter("sig", sub)` · `meter("levels")`: A bar as levels, one per step: 0 the downbeat, 1 a beat, then finer. A time signature (2/4 3/4 4/4 5/4 6/8 7/8 9/8 12/8 5/8) with sub steps a beat, or levels written out (* bar, + beat, - half, . subdivision, , finer). Its bpm counts beats. Each argument can be free(…). [→](time.md) `&bar meter("4/4", 2) step=100bpm` · `&bar meter("6/8") step=60bpm` · `&bar meter("*.+.+..") step=90bpm`
- `spell("text", &table, "names")`: A text spelled through a table: each character that is one of the names plays that entry of the table, then a pause; anything else rests as long. The text can be free("…"), a field to type in. [→](braid.md) `&dial spell("867 5309", &keys, "1 2 3 A 4 5 6 B 7 8 9 C * 0 # D")` · `&dial spell(free("867 5309"), &keys, "1 2 3 A 4 5 6 B 7 8 9 C * 0 # D")`

## free(): left to the performer

- `free(v, lo..hi)`: A number left to the performer: a slider from lo to hi, starting at v. Wherever a number goes in an attribute (a rate with its units: free(90bpm, 60..240)), in a scan, or as a gain in a mix. [→](free.md) `&bar scan(4 4 4 4) step=free(90bpm, 60..240)` · `&lead s=saw loop=C4 lpf=free(1200, 200..5000)` · `&key step=cycle(&theme) shift=free(0, 0..11)`
- `free(marking)`: A rate as a tempo marking, a slider over its range: largo 40–60, larghetto 60–66, adagio 66–76, andante 76–108, moderato 108–120, allegro 120–156, vivace 156–176, presto 168–200 (bpm). [→](free.md) `&bar scan(4 4 4 4) step=free(andante)`
- `free(v, lo..hi, "names")`: Named choices: the names spread evenly over the range (one per value, or every 2nd …), shown instead of the numbers. [→](free.md) `&bar meter(free(2, 0..3, "2/4 3/4 4/4 6/8")) step=90bpm`
- `free("text")`: A text left to the performer: a field to type in (for spell(…)). [→](free.md) `&dial spell(free("867 5309"), &keys, "1 2 3 4 5 6 7 8 9 0")`

## step= and loop=

- `step=r` · `loop=r`: step= moves a cell a step at a time, r steps a second; loop= turns its whole braid r times a second (loop=r is step=r·k for k steps). One of the two. [→](time.md) `&tune step=2 0 2 4` · `&lead loop=261.63 0 1`
- `loop=NAME`: A value from the environment: SAMPLE_RATE, A4, or a note name (C4, F#3, Bb2) as its frequency. [→](time.md) `&lead s=saw loop=C4` · `&out loop=SAMPLE_RATE map=sample &mix`
- `step=&x` · `loop=&x`: Driven by another cell: a step (or a whole turn) per step of &x. [→](time.md) `&tune step=&bar 0 2 4`
- `step=cycle(&x)`: A step per cycle of &x (each time its braid comes round). [→](time.md) `&key step=cycle(&theme) stride=7`
- `step=&x*n` · `step=&x/n` · `step=&x*n/d`: A chain read left to right: *n once per n steps of &x, /n n times per step; *2/3 is three per two (triplets). [→](time.md) `&fast step=&bar/2 0 1` · `&trip step=&bar*2/3 0 2 4`
- `step=free(r, lo..hi)` · `step=free(marking)`: A rate left free: a slider, with units (free(90bpm, 60..240)), or a tempo marking (free(adagio)). [→](free.md) `&bar scan(4 4 4 4) step=free(90bpm, 60..240)` · `&bar scan(4 4 4 4) step=free(adagio)`
- `nbpm`: n a minute: beats on a meter (its steps, unless beat= or meter(…) say how many make a beat). [→](time.md) `&bar scan(4 4 4 4) step=84bpm`
- `nhz`: n a second (a plain number says the same). [→](time.md) `&a loop=440hz`
- `nmin`: n a minute (wall-clock time: loop=1min turns once a minute). [→](time.md) `&tick scan(1!60) loop=1min`
- `nh`: n an hour. [→](time.md) `&hour scan(1!60) loop=1h`
- `nd`: n a day: a day meter, loop=1d (anchor= where it stands when play starts). [→](time.md) `&day scan(1!24) loop=1d anchor=11.55`
- `nwk`: n a week. [→](time.md) `&week scan(1!7) loop=1wk`
- `nk`: n thousand a second: a sample rate. [→](mix.md) `&out loop=44.1k map=sample &mix`

## map=

- `map=amp`: A volume: its values multiply the level (on a voice, the braid as a waveform, its range onto −1…1; the default). [→](sound.md) `&accent map=amp step=&bar/4 1 .4 .8 .4`
- `map=lin`: As amp, ramping from each value to the next: a glide, a triangle. In a mix it is plain: a volume in a product, a pitch in a sum. [→](sound.md) `&swell map=lin loop=&bar*8 .2 1`
- `map=db`: A volume in decibels (0 as it is, −6 about half). [→](sound.md) `&fade map=db step=&bar 0 -6 -12`
- `map=adsr a d s r`: An envelope: attack, decay, release in seconds, sustain a level; one per note. [→](sound.md) `&pluck map=adsr .01 .3 .5 .4`
- `map=sample`: The sound card: its entries are channels, one (mono) or two (left, right). [→](mix.md) `&out loop=SAMPLE_RATE map=sample &left &right`
- `map=edo`: A grid: cycle= equal steps to the octave. [→](tuning.md) `&edo19 cycle=19 map=edo`
- `map=ratios`: A grid of ratios: one period's tones, then the period (the last). [→](tuning.md) `&just map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2`
- `map=ed(r)`: A grid: cycle= equal steps to the ratio r (a number or a fraction): ed(2) the octave, ed(3/2) the fifth. [→](tuning.md) `&bp cycle=13 map=ed(3)` · `&fifths cycle=7 map=ed(3/2)`
- `map=&table`: Each value looked up in a table cell first, then sounded as amp. [→](sound.md) `&shaped loop=220 map=&curve 0 1 2 3`

## Attributes

An attribute is `key=value`, anywhere on a cell's line, each at most once (`step=` and `loop=` are one setting). What the values of `step=`, `loop=` and `map=` can be is above. `show=` takes one of: `braid` (steps, coloured by pitch), `pattern` (rhythm only: hits and rests), `equal` (its entries evenly round the ring, wired from the slots they take: the taps stay put as it turns), `notes` (note names: C4 D4 E4), `midi` (MIDI numbers: 60 62 64), `do` (movable do: do re mi from the tonic), `degrees` (scale degrees: 1 2 3), `table` (its entries as numbers), `scale` (a scale: its mode on its tonic), `mode` (its mode: major, minor, Dorian …), `key` (a key: its tonic), `grid` (a grid: steps to its period), `meter` (a meter: beats to the bar), `spectrum` (the sound: a spectral waterfall), `wave` (its waveform: one cycle, and the sound itself while it plays), `levels` (its levels, as bars), `adsr` (an envelope curve), `mix` (the voices it mixes), `note` (a note in the graph: its label), `petal` (small, hung from the cell that uses it), `off` (hidden from the graph), `matrix` (a barrel of pins: a ring per part, a pin where it plays), `lfo` (one cycle of its movement, round the ring, at its rate), `brightness` (its modes by brightness: each degree shaded by the mode that starts on it (Lydian bright … Locrian dark)), or a plugin ([plugins.md](plugins.md)): `sun` (built in: a day meter as the sun: a 24-hour dial, noon at the top), or one the piece carries; `notes:` `flats`, `sharps`, `german`; `do:` `fixed`, `movable`.

- `over=&table` · `over=&table[<<n]` · `over=scale(name, tonic)`: The table its numbers read. [→](tables.md) `&tune over=&major step=2 0 2 4` · `&mode over=&major[<<2] 0 2 4` · `&tune over=scale(minor, A) step=2 0 2 4`
- `step=…`: What moves it, step by step. [→](time.md) `&tune step=&bar 0 2 4`
- `loop=…`: What moves it, the whole braid at a time. [→](time.md) `&lead s=saw loop=C4`
- `shift=n` · `shift=free(n, lo..hi)`: How far it is turned. [→](tables.md) `&mode over=&major shift=5 0 2 4` · `&key shift=free(0, 0..11)`
- `stride=n` · `stride=free(n, lo..hi)`: How far each step turns it. [→](time.md) `&key step=cycle(&theme) stride=7`
- `map=…`: How its values sound. [→](sound.md) `&accent map=amp step=&bar 1 .5`
- `show=kind` · `show=notes:convention` · `show=do:convention` · `show=mix:&grid`: How it’s shown: notes, do, scale, pattern … (and everything below it) [→](display.md) `&tune show=notes step=2 0 2 4` · `&tune show=notes:german step=2 0 2 4` · `&tune show=do:movable step=2 0 2 4` · `&band show=mix:&edo19 [&a, &b]`
- `label="text"`: A name to show, in quotes — alone on a cell, a note in the graph. [→](display.md) `&theme label="the King's theme" step=2 0 2 4` · `&note label="A note in the graph: alone on its cell."`
- `env=&envelope`: A voice’s own volume on every note: an envelope — on a voice. [→](sound.md) `&lead s=saw loop=C4 env=&(map=adsr .01 .3 .5 .4)`
- `pitch=&vibrato` · `pitch=lo..hi * &shape`: A voice’s own pitch on every note: a vibrato, or a shape in semitones (pitch=0..30 * &(map=adsr 0 .04 0 0): a drop) — on a voice. [→](sound.md) `&lead s=saw loop=C4 pitch=&(loop=5 0 .1 -.1)` · `&bd s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0)`
- `cycle=n`: Where it wraps: turning past this many steps starts again (a grid’s size is map=edo) [→](tables.md) `&key step=cycle(&theme) stride=7 cycle=12` · `&edo19 cycle=19 map=edo`
- `size=x`: How large it’s drawn, against the others: 2 twice, .5 half. [→](display.md) `&theme size=2 step=2 0 2 4`
- `laps=n`: How many laps it plays, then it ends. [→](time.md) `&bar scan(4 4 4 4) step=84bpm laps=30`
- `chance=p` · `chance=free(p, 0..1)`: What a bare x? means here: a probability, or free() for a slider. [→](cell.md) `&ghost chance=.2 step=4 0? 0? 0? 0?` · `&ghost chance=free(.3, 0..1) step=4 0? 0?`
- `seed=n`: A different sequence of chance. [→](cell.md) `&ghost seed=7 step=4 0? 0? 0? 0?`
- `title="text"`: On a note: the piece’s title (its card) — on a note (a label= and nothing else) [→](display.md) `&piece title="Swing blues" tags="genre:jazz, rhythm" label="A blues in F."`
- `tags="tag, tag"`: On a note: the piece’s tags, comma-separated; on a cell, its clusters in the graph. [→](display.md) `&piece title="Swing blues" tags="genre:jazz, rhythm"` · `&lead tags="melody" s=saw loop=C4`
- `about=&cell` · `about=(&a &b …)`: On a note: the cells it explains — on a note (a label= and nothing else) [→](display.md) `&fenvNote label="The filter opens on every note." about=&fenv` · `&why label="Two cells at once." about=(&fenv &accent)`
- `rung=n`: On a piece’s card: its place in the tutorial, the ladder of basics (1 the first) — on a note (a label= and nothing else) [→](display.md) `&piece title="Steps: a tune on one line" tags="tutorial" rung=1 label="Numbers, rests, holds and repeats."`

## Parameters

Parameters belong to voices (the sound ones keep dough's names) and to physical cells. A word where a number belongs, or a parameter on a cell where it does nothing, is a warning. Dough's other names aren't read: writing one is an error that names ours (`sound` → `s`, `cutoff` → `lpf`, `resonance` → `lpq`, `hcutoff` → `hpf`, `hresonance` → `hpq`, `verb` → `room`, `reverb` → `room`, `delayt` → `delaytime`, `delayfb` → `delayfeedback`).

- `s=sine|tri|triangle|saw|sawtooth|square|pulse|white|pink|brown`: Sound source: sine tri saw square pulse white pink brown — on a voice; it makes the cell a voice. [→](sound.md)
- `lpf=n` · `lpf=free(n, lo..hi)` · `lpf=&x` · `lpf=lo..hi * &a * &b`: Low-pass cutoff, Hz — on a voice; it makes the cell a voice. [→](sound.md)
- `lpq=n` · `lpq=free(n, lo..hi)` · `lpq=&x` · `lpq=lo..hi * &a * &b`: Low-pass resonance — on a voice; it makes the cell a voice. [→](sound.md)
- `hpf=n` · `hpf=free(n, lo..hi)` · `hpf=&x` · `hpf=lo..hi * &a * &b`: High-pass cutoff, Hz — on a voice; it makes the cell a voice. [→](sound.md)
- `hpq=n` · `hpq=free(n, lo..hi)` · `hpq=&x` · `hpq=lo..hi * &a * &b`: High-pass resonance — on a voice; it makes the cell a voice. [→](sound.md)
- `room=n` · `room=free(n, lo..hi)` · `room=&x` · `room=lo..hi * &a * &b`: Reverb send 0–1 — on a voice; it makes the cell a voice. [→](sound.md)
- `delay=n` · `delay=free(n, lo..hi)` · `delay=&x` · `delay=lo..hi * &a * &b`: Delay send 0–1 — on a voice; it makes the cell a voice. [→](sound.md)
- `delaytime=n` · `delaytime=free(n, lo..hi)` · `delaytime=&clock/n`: Echo time, seconds — or a clock: &bar/2 (an eighth at the tempo) — on a voice; it makes the cell a voice. [→](sound.md)
- `delayfeedback=n` · `delayfeedback=free(n, lo..hi)`: Echo feedback 0–1 — on a voice; it makes the cell a voice. [→](sound.md)
- `pan=n` · `pan=free(n, lo..hi)`: Where it sits in stereo: 0 left, .5 centre (as without it), 1 right — the far side fades — on a voice; it makes the cell a voice. [→](sound.md)
- `distort=n` · `distort=free(n, lo..hi)`: Distortion: 0 clean, .3 gritty, 1 and more harsh — on a voice; it makes the cell a voice. [→](sound.md)
- `crush=n` · `crush=free(n, lo..hi)`: Bit depth: 16 clean, 8 grainy, 3 and fewer: rubble — on a voice; it makes the cell a voice. [→](sound.md)
- `fm=&cell`: Frequency modulation: the voice that modulates this one (fm=&op); it may have its own fm= — on a voice; it makes the cell a voice. [→](physics.md)
- `ratio=n` · `ratio=free(n, lo..hi)`: As a modulator: its frequency against its carrier’s (1 the same, 3.5 a bell) — on a voice another’s fm= names; it makes the cell a voice. [→](physics.md)
- `index=n` · `index=free(n, lo..hi)` · `index=&x` · `index=lo..hi * &a * &b`: FM depth: how far the modulator swings the frequency (0 none … 10 bright); it can move — on a voice with fm=; it makes the cell a voice. [→](physics.md)
- `body=fork|bell|bar|plate|box|tine|pipe|wire|spring`: A resonator: what its exciters are — fork, bell, bar, plate, box, tine, pipe, wire, spring; its braid lists them (semitones; the twelve by default), a note plucks the nearest — on a voice; it makes the cell a voice. [→](physics.md)
- `ring=n` · `ring=free(n, lo..hi)`: A resonator: how long it rings, in seconds — on a voice; it makes the cell a voice. [→](physics.md)
- `hard=n` · `hard=free(n, lo..hi)`: A resonator: the mallet — 0 felt (dark), 1 steel (bright) — on a voice; it makes the cell a voice. [→](physics.md)
- `board=none|fork|bell|bar|plate|box|tine|pipe|wire|spring`: A resonator: the body its exciters share (box by default, an octave below; none: no board) — on a resonator (body=) [→](physics.md)
- `couple=&cell`: A resonator: another it shares a table with (couple=&other) — each sets the other ringing — on a resonator (body=) [→](physics.md)
- `coupling=n` · `coupling=free(n, lo..hi)`: A resonator: how strongly it is coupled (.01 faint, .05 strong) — on a resonator (body=) [→](physics.md)
- `excite=&cell`: A resonator: sound that drives it (excite=&mix) — it answers where the sound meets its modes — on a resonator (body=) [→](physics.md)
- `level=n` · `level=free(n, lo..hi)`: On the sound card: the overall level in dB (0 as it is, −6 about half) — on the sound card (map=sample) [→](display.md)
- `beat=n` · `beat=free(n, lo..hi)`: On a meter: how many of its steps make a beat — its bpm counts beats (beat=4: steps in sixteenths) — on a meter (step= a rate) [→](time.md)
- `swing=n` · `swing=free(n, lo..hi)`: On a meter: of each pair of steps, the second comes this far through (.5 straight, .67 triplet swing) — on a meter (step= a rate) [→](time.md)
- `motor=n` · `motor=free(n, lo..hi)`: On a meter: it turns physically — a motor this strong pulls it to its tempo (from rest) — on a meter (step= a rate) [→](physics.md)
- `mass=n` · `mass=free(n, lo..hi)`: Physics: how heavy it turns (inertia); on a cell a meter drives, load — on a meter (step= a rate) or a driven cell (step=&x) [→](physics.md)
- `friction=n` · `friction=free(n, lo..hi)`: Physics: drag — the meter sags below its tempo, more with more load — on a meter (step= a rate) or a driven cell (step=&x) [→](physics.md)
- `wind=n` · `wind=free(n, lo..hi)`: On a meter with a motor: its spring runs down over this many seconds, and it coasts to a stop — on a meter with a motor=. [→](physics.md)
- `wow=n` · `wow=free(n, lo..hi)`: On a meter with a motor: its speed swings slowly by this fraction (.01: a tape machine’s wow) — on a meter with a motor=. [→](physics.md)
- `varispeed=n` · `varispeed=free(n, lo..hi)`: On a clock: its notes’ pitch follows its speed, as tape does (1 fully, 0 not) — on a meter (step= a rate) or a driven cell (step=&x) [→](physics.md)
- `belt=n` · `belt=free(n, lo..hi)`: On a driven cell (step=&x): it follows through a belt this stiff (200 taut, 20 slack) — it lags, swings, catches up — on a driven cell (step=&x) [→](physics.md)
- `damping=n` · `damping=free(n, lo..hi)`: A belt’s damping: how soon its swinging dies (0 rings on, high creeps) — on a driven cell (step=&x) [→](physics.md)
- `slip=n` · `slip=free(n, lo..hi)`: A belt’s grip: past this pull it slips, and the cell falls behind for good — on a driven cell (step=&x) [→](physics.md)
- `write=&cell`: A tape: what its write head records (write=&melody); it moves with its step= — on a tape (write=) [→](physics.md)
- `length=n` · `length=free(n, lo..hi)` · `length=&clock/n`: A tape: how long its loop is, in seconds of tape (or a clock: length=&bar*4); none, an open reel — on a tape (write=) [→](physics.md)
- `erase=n` · `erase=free(n, lo..hi)`: A tape: how much of what was there each pass under the write head wipes (1 all, .3 leaves ghosts) — on a tape (write=) [→](physics.md)
- `tone=n` · `tone=free(n, lo..hi)`: A sound tape: its loss — each pass through the loop darker (Hz: 7000 bright, 1500 worn) — on a tape (write=) [→](physics.md)
- `drive=n` · `drive=free(n, lo..hi)`: A sound tape: how hard it saturates each pass (0 clean, .5 warm, 1 crushed) — on a tape (write=) [→](physics.md)
- `hiss=n` · `hiss=free(n, lo..hi)`: A sound tape: its noise floor (0 none, .02 a cassette) — on a tape (write=) [→](physics.md)
- `print=n` · `print=free(n, lo..hi)`: A sound tape: print-through — a faint pre-echo before each head (.03 a whisper) — on a tape (write=) [→](physics.md)
- `printgap=n` · `printgap=free(n, lo..hi)`: A sound tape: how far before each head the print-through sits (tape-seconds, .6) — on a tape (write=) [→](physics.md)
- `dropout=n` · `dropout=free(n, lo..hi)`: A sound tape: brief gaps in the playback, about this many a second — on a tape (write=) [→](physics.md)
- `play=&cell`: A read head: the tape it reads (play=&tape), at= tape-seconds after the write head — on a read head (play=) [→](physics.md)
- `at=n` · `at=free(n, lo..hi)` · `at=&clock/n`: A read head: how far after the write head it sits, in seconds of tape (or a clock: at=&bar) — on a read head (play=) [→](physics.md)
- `wander=n` · `wander=free(n, lo..hi)`: A read head: how far it wanders either way (tape-seconds) — a flying head — on a read head (play=) [→](physics.md)
- `wanderhz=n` · `wanderhz=free(n, lo..hi)`: A read head: how fast it wanders (times a second) — on a read head (play=) [→](physics.md)
- `trigger=&cell`: A gate: what plays through it — each note of this cell plays the receivers in its braid (trigger=&tune) — on a gate (trigger=) [→](mix.md)
- `gate=&cell`: A gate: how open it is over time, a level on all it lets through (gate=&solo: 1 open, 0 closed, .3 ducked); velocity= is per note, gain= fixed — on a gate (trigger=) [→](mix.md)
- `velocity=&cell`: A gate: a level on each note it lets through, as a product’s level (velocity=&accent) — on a gate (trigger=) [→](mix.md)
- `gain=n` · `gain=free(n, lo..hi)`: A gate: a fixed level on what it lets through, as a product’s number (gain=.5) — on a gate (trigger=) [→](mix.md)
- `scope=word`: A scope: stack, split, xy (in time) — spectrum, waterfall (in frequency, or value); its braid lists its channels — on a scope (scope=) [→](display.md)
- `fold=n` · `fold=free(n, lo..hi)`: A spectrum or waterfall: pitches folded by this stride into as many bins (12: by pitch class, the default) — on a scope (scope=) [→](display.md)
- `bins=n` · `bins=free(n, lo..hi)`: A spectrum or waterfall without a fold: this many bands, low to high (1 a meter, 3 low-mid-high, 20 an equaliser) — on a scope (scope=) [→](display.md)
- `channels=word`: A spectrum or waterfall: sum (one, the default) or split (each channel its own) — on a scope (scope=) [→](display.md)
- `law=word`: A law that computes the notes (law=fiveto12: the 5 to 12 cycle, a day of music) — on a law (law=) [→](time.md)
- `anchor=n` · `anchor=free(n, lo..hi)`: A clock (a day meter, loop=1d): the time of day it stands at when play starts (hours.minutes — 11.55); play begins where the clock stands — on a meter (step= a rate) [→](time.md)

## Sorts: what a cell is in a mix

Every cell has a sort, decided by its own line, never by where it is written in a mix; the first rule that holds decides (`src/engine/compiler/sorts.ts`). How the sorts combine with `+` and `*` is on [mix.md](mix.md#the-algebra-of-a-mix).

- `signal`: A sound parameter (s=, lpf= …): a voice. [→](mix.md) `&lead s=saw loop=C4`
- `signal`: A mix: an instrument. [→](mix.md) `&organ [&a, &b]`
- `signal`: A pattern read through a kit (a table of voices). [→](mix.md) `&drums over=&kit step=4 0 1 0 1`
- `signal`: A read head of a sound tape (a tape that records a mix). [→](mix.md) `&head play=&tape at=1`
- `wave`: A braid turning at an audio rate (20 Hz and up) with no sound of its own. Alone in a product it is the sound (a waveform); in a pitch sum, or beside a sound, a pitch that moves at audio rate (FM). One that plays as a voice in the piece is a sound everywhere. [→](mix.md) `&square loop=220 0 1`
- `volume`: map=amp, map=db or map=adsr (an envelope). [→](mix.md) `&accent map=amp step=2 1 .5`
- `plain`: map=lin: as a number, it takes its operator's sort — a volume in a product, a pitch in a sum. [→](mix.md) `&swell map=lin loop=.25 .2 1`
- `pitch`: Anything else: a melody, a cell reading a table, a loop below hearing (a vibrato). In semitones. [→](mix.md) `&vibrato loop=5 0 .1 -.1`

## Mixes

- `[a, b, …]`: A mix: one chord of sounds, each a product or a sum. On the sound card (map=sample), one chord is mono, two are left and right. [→](mix.md) `&mix [&theme * &lead, &bass * 0.5]`
- `p * s` · `v * s`: A pitch or a volume acting on a sound: the voice is the factor that is a sound, wherever it is written. `*` is commutative and associative; two pitches multiplied add. [→](mix.md) `&mix [&theme * &lead]` · `&mix [&lead * &accent * &theme]`
- `a + b` · `a - b`: Pitches add (subtract) in semitones; sounds mix (they can't be subtracted). [→](mix.md) `&mix [(&theme + &vibrato - 12) * &lead]` · `&mix [&a * &lead + &b * &organ]`
- `n`: A number takes its operator's sort: semitones in a sum (0 changes nothing), a gain in a product (1 changes nothing). [→](mix.md) `&mix [(&pedal + 12) * &bass * 0.8]`
- `free(v, lo..hi)`: A gain left to the performer. [→](free.md) `&mix [&theme * &lead * free(.8, 0..1)]`
- `( … )`: Grouping. By the laws, grouping and order don't change what plays. [→](mix.md) `&mix [&theme * (&lead + &organ) * 0.5]`
