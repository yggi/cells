# Kinds

What a cell is. Every cell has exactly one **kind**, read from its own line and the lines it names: the first rule below that holds decides (`src/engine/kinds.ts`, `KIND_RULES`; [#782](https://github.com/yggi/cells/issues/782); law L20). The table is the code's own: a test keeps the two the same.

| kind | what makes a cell one | in a mix | a cell of it |
|---|---|---|---|
| `note` | A label= and nothing that plays: an explanation in the graph. | pitch | `&why label="The bass walks down a fifth each bar."` |
| `card` | map=sample: the sound card, its entries its channels. | — | `&out map=sample [&a]` |
| `midi card` | map=midi: a MIDI card, its entries MIDI channels. | — | `&synth map=midi [&t * &a]` |
| `gate` | play= with a braid of voices: a product with a name, where notes become sound. | signal | `&leadOut play=&t &a` |
| `role` | map=role: its name is the role, its entries the gates that play it. | pitch | `&lead map=role &violin` |
| `style` | map=style: a point in style space; it doesn’t sound. | pitch | `&funk map=style .3 .45 .55 .5` |
| `scope` | scope=: a picture of the cells its braid lists. | pitch | `&screen scope=stack &a` |
| `fill` | fill(…): a plugin-fragment’s code writes its braid (decision 085). | — | `&cycle_mode fill(five_to_twelve, mode, &day) ionian` |
| `tape` | write=: it records what its write head names. | pitch | `&tape write=&t step=1 length=4` |
| `head` | play= with no braid: a read head of a tape. | — | `&echo play=&tape at=1` |
| `sum` | A mix of cells with no voice: the sum of their values (decision 079). | plain | `&drift [&a * .7 + &b * .3]` |
| `phrase` | A product with no voice and a pitch, named: notes with their levels (decision 087). | pitch | `&phrase [&t * &accent]` |
| `mix` | A mix of sounds with a name: played as one voice, an instrument. | signal | `&organ [&a, &b]` |
| `resonator` | body=: a struck or driven body, its braid its exciters. | signal | `&fork body=fork loop=A4 ring=3` |
| `wave` | A braid turning at an audio rate with no sound parameter: alone in a product the sound, beside one a pitch (FM). | wave | `&square loop=220 0 1` |
| `voice` | A sound parameter (s=, lpf= …): it sounds. | signal | `&lead s=saw loop=C4` |
| `kit` | An unstepped braid of voices: a table of them, a number picking one. | pitch | `&kit &bd &hh` |
| `band` | An unstepped braid of gates and roles: a table of performers (decision 061). | pitch | `&band &violin &viola` |
| `meter` | A meter(…) or a scan(…) with a rate: it keeps time, and lines tap it. | — | `&bar meter("4/4") step=84bpm` |
| `tempo` | A rate alone, no braid: a tempo a meter reads (step=&tempo), or a clock. | pitch | `&tempo step=84bpm` |
| `groove` | A line of hits: a pattern read through a kit, or a stepped braid of voices. | signal | `&drums over=&kit step=4 0 1 0 1` |
| `grid` | map=edo, ed(r) or ratios: how positions become frequencies. | pitch | `&edo19 map=edo(19)` |
| `envelope` | map=adsr: a level over each note. | volume | `&pluck map=adsr .01 .3 .5 .4` |
| `ramp` | map=lin: values that ramp to the next, a level in a product and a pitch in a sum. | plain | `&swell map=lin loop=.25 .2 1` |
| `volume` | map=amp, db or a table: values read as a level. | volume | `&accent map=amp step=2 1 .5` |
| `sections` | A stepped table of names: it declares the sections of an arrangement (decision 016). | pitch | `&sections step=4n &tuneBar` |
| `selector` | over= a table of sections or a band: it switches them. | pitch | `&song over=&sections step=1m 0` |
| `number` | One number and nothing else: named in a mix it is that number (decision 088). | plain | `&vol .5` |
| `line` | A braid with a clock (step=, loop= below hearing): it plays its steps in time. | pitch | `&tune step=2 0 2 4` |
| `table` | A generator with no clock (scan, scale, even, fifths, a wave): a table to read through. | pitch | `&major scan(2 2 1 2 2 2 1)` |
| `text` | One text in quotes: a generator’s argument reads it as the piece is built, meter(&meter) (decision 101); it plays nothing. | — | `&meter "3/4"` |
| `blank` | No braid and no clock: the table below it as it is, turned or set by its attributes (a key, a swing). | pitch | `&key shift=2` |
| `steps` | Anything else: a list of steps with no clock of its own, a phrase to splice or a table to read through. | pitch | `&motif 0 2 4` |

A kind is not what reads a cell. These are relations between two cells, and a cell of any kind can stand in them:

- **read through**: a cell another reads with `over=`, its table ([tables.md](tables.md));
- **a section**: a name a table of sections declares ([time.md](time.md));
- **a performer**: an entry of a band ([mix.md](mix.md));
- **a modulator**: a voice another's `fm=` names ([physics.md](physics.md)).

**In a mix** is the cell's **sort** ([mix.md](mix.md#the-algebra-of-a-mix)): a sound (signal), a volume, a plain value, a pitch or a wave. It follows from the kind (law L21), but for four that don't say (—): a read head is what its tape records, a fill what its fragment's code writes (notes, a level, a number), and a card and a meter are never a mix's factor.

Three things read this table (#782, rung 2): the sort, as above; what an attribute acts on, where that is a kind (a tape, a read head, a resonator, a scope, a gate, the card, a note: [reference](reference.md#parameters)); and the Stats page's count. What an attribute acts on beyond that is how a cell is moved (a clock, a driven cell, a motor), whether it sounds as a voice, the relations above, and a law (a fill's cell or the mix that reads one).
