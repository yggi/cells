---
id: finale
source: seed
lifted: yggi/jambot packages/engine/src/ending.ts @ b98e69f
---

```cells
&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (&half, &bd, &sd, &hh, &rd) &key style=(&synthPop | &techno | &deepHouse | &ambient | &lofi | &funk | &bossaNova | &swingJazz | &electroSwing | &spooky | &kinderlied | &acid | &happyHardcore | &elektro | &darkAmbient | &baroque | &bluesShuffle | &seaShanty | &chiptune | &salsa | &waltz | &march | &tripHop)
&half step=1m*2 0
&bd, &sd, &hh, &rd from gm_kit
&cadence over=&key step=&half [4,4####,4#######,4##########] [0,2,4]@3
&finaleBass over=&cadence step=&half 0 3@2 ~
&finalePad over=&cadence step=&half [0,1,2,3] [2,3,4]@2 ~
&finaleLead over=&key step=&half 1 0@2 ~
&kick role=kick step=&half*8 &bd:0:.6 ~!7 &bd:0:.7 ~!23
&backbeat role=backbeat step=&half*8 ~!4 &sd:0:.45 ~ &sd:0:.5 ~ &sd:0:.65 ~!23
&hat role=hat step=&half*8 &hh:0:.3 ~ &hh:0:.3 ~ &hh:0:.3 ~ &hh:0:.3 ~ &rd:0:.5 ~!23
&finaleDrums [&kick, &backbeat, &hat]
```

A song's last bar, as Jambot's band ends one (`cadence` and `finale`, yggi/jambot packages/engine/src/ending.ts @ b98e69f, #720): the dominant seventh on the key's fifth for the bar's first half, then everything lands together on the tonic at the half bar, and the tonic rings on a bar from the landing, so the song ends on a chord left to die away, not on a cut. Two bars: the last bar, then the ring and a half bar's silence.

- **`&cadence`, the chords.** The dominant seventh is written on the key's fifth degree and three tones above it by semitones, an accidental a semitone (`4####` is four above the fifth, its major third): the same chord over every mode, as Jambot's is (a major third and a minor seventh over the fifth, a leading tone in a minor key too), where the key's own degrees (`[4,6,8,10]`) would give a minor seventh chord in aeolian. Then the key's triad, `[0,2,4]`, the tonic, in force to the end.
- **`&finaleBass`**: the dominant's root, then the tonic's a fourth above it (`3`, the tonic chord's root a lap up: the nearer of the two, as Jambot's bass takes the nearest).
- **`&finalePad`**: the dominant seventh, then the tonic in the voicing nearest it (its fifth, root and third, `[2,3,4]`), as Jambot's pad moves to the voicing that moves least.
- **`&finaleLead`**: the key's second degree over the dominant, resolving down a step to the tonic.
- **`&finaleDrums`**: hats on the eighths and a backbeat leaning in, a snare an eighth before the half, then kick, snare and ride together on it, `finale`'s hits (as `landing`'s, which is the same bar as a layer of its own).

**Its clock is an argument, `&half`**, two steps a bar (`step=1m*2`, the bar's halves, by default): every line steps by it, the drums eight to its step, so the landing is the half bar in any meter, as Jambot's is (`slotStepOn`). A score passes the clock of its ending's section (decision 016: a tap of the meter's bus switched by the selector), so the ending starts with its section, wherever that falls (one step of the plan, held two bars: a section stepped again starts over):

```text
&parts step=2n &songHalf &endHalf
&plan over=&parts step=1m 0@30 1@2
&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from finale(half=&endHalf) &key
```

**A song's last section.** The ending is what the outro's end plays (the section kind `outro`, #810): a score gives it two bars, the last bar and the ring, and its parts play these lines there. Jambot plays it in place of the band's own last bar, through its performers, so each part keeps its instrument and its register.

At every style of `styles`, weight 1, as the facet `ending`: Jambot ends the same way at every style. Other endings (a jazz tag, a plagal amen, a dance track's stop on the one) can be placed beside it by style.

**Its signature** (decision 065): `&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums from (&half, &bd, &sd, &hh, &rd) &key`, the drums optional, each the General MIDI kit's by default. `&cadence, &finaleBass from finale &key` takes the chords and the bass line.
