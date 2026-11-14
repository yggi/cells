# Kinds

What a cell is. Every cell has exactly one **kind**, read from its own line and the lines it names: the first rule below that holds decides (`src/engine/kinds.ts`, `KIND_RULES`; [#782](https://github.com/yggi/cells/issues/782)). The table is the code's own: a test keeps the two the same.

| kind | what makes a cell one | a cell of it |
|---|---|---|
| `note` | A label= and nothing that plays: an explanation in the graph. | `&why label="The bass walks down a fifth each bar."` |
| `card` | map=sample: the sound card, its entries its channels. | `&out map=sample [&a]` |
| `midi card` | map=midi: a MIDI card, its entries MIDI channels. | `&synth map=midi [&t * &a]` |
| `gate` | play= with a braid of voices: a product with a name, where notes become sound. | `&leadOut play=&t &a` |
| `role` | map=role: its name is the role, its entries the gates that play it. | `&lead map=role &violin` |
| `style` | map=style: a point in style space; it doesn’t sound. | `&funk map=style .3 .45 .55 .5` |
| `scope` | scope=: a picture of the cells its braid lists. | `&screen scope=stack &a` |
| `law` | law=: its notes are computed. | `&cycle law=fiveto12 over=&day step=84bpm` |
| `tape` | write=: it records what its write head names. | `&tape write=&t step=1 length=4` |
| `head` | play= with no braid: a read head of a tape. | `&echo play=&tape at=1` |
| `sum` | A mix of cells with no voice: the sum of their values (decision 079). | `&drift [&a * .7 + &b * .3]` |
| `notes` | A product with no voice and a pitch, named: notes with their levels (decision 087). | `&phrase [&t * &accent]` |
| `instrument` | A mix of sounds with a name: played as one voice. | `&organ [&a, &b]` |
| `resonator` | body=: a struck or driven body, its braid its exciters. | `&fork body=fork loop=A4 ring=3` |
| `voice` | A sound parameter (s=, lpf= …), or a braid turning at an audio rate: it sounds. | `&lead s=saw loop=C4` |
| `kit` | An unstepped braid of voices: a table of them, a number picking one. | `&kit &bd &hh` |
| `band` | An unstepped braid of gates and roles: a table of performers (decision 061). | `&band &violin &viola` |
| `meter` | A meter(…) or a scan(…) with a rate: it keeps time, and lines tap it. | `&bar meter("4/4") step=84bpm` |
| `tempo` | A rate alone, no braid: a tempo a meter reads (step=&tempo), or a clock. | `&tempo step=84bpm` |
| `grid` | map=edo, ed(r) or ratios: how positions become frequencies. | `&edo19 map=edo(19)` |
| `envelope` | map=adsr: a level over each note. | `&pluck map=adsr .01 .3 .5 .4` |
| `level` | map=amp, db, lin or a table: values read as a level (or, for lin, as its operator says). | `&accent map=amp step=2 1 .5` |
| `sections` | A stepped table of names: it declares the sections of an arrangement (decision 016). | `&sections step=4n &tuneBar` |
| `selector` | over= a table of sections or a band: it switches them. | `&song over=&sections step=1m 0` |
| `number` | One number and nothing else: named in a mix it is that number (decision 088). | `&vol .5` |
| `line` | A braid with a clock (step=, loop= below hearing): it plays its steps in time. | `&tune step=2 0 2 4` |
| `braid` | Anything else: steps with no clock of their own, a table to read through or a phrase to splice. | `&major scan(2 2 1 2 2 2 1)` |

A kind is not what reads a cell. These are relations between two cells, and a cell of any kind can stand in them:

- **a table**: a cell another reads through with `over=` ([tables.md](tables.md));
- **a section**: a name a table of sections declares ([time.md](time.md));
- **a performer**: an entry of a band ([mix.md](mix.md));
- **a modulator**: a voice another's `fm=` names ([physics.md](physics.md)).

What a cell is in a mix, its **sort**, is on [mix.md](mix.md#the-algebra-of-a-mix); what an attribute acts on is said with each attribute in the [reference](reference.md#parameters). Both will read this table (#782, rung 2).
