# An atlas of genres on the style axes

Date: 2026-11-09 · Status: measured, for the owner's ruling · Issues: [#572](https://github.com/yggi/cells/issues/572) (the axes reworked: `sync harm bite mood`), [#542](https://github.com/yggi/cells/issues/542) (more styles), in the style epic [#536](https://github.com/yggi/cells/issues/536) · Tool: `tools/atlas.ts`

How well a set of axes tells musical genres apart, over 42 genres placed once by hand on the features underneath any axes (syncopation, harmonic motion, attack, density, mode, tension), each in a family a listener would group it with. The eleven styles of the library are among them, as placed. A measurement; it decides no language, and its placements are one reading, written down so every option is measured over the same ones.

## Reproduce

```sh
node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/atlas.ts
```

## What it says

1. **No set of axes wins on the raw counts.** Between 9 and 12 pairs fall under 0.1 in every option, and no family is compact under any of them (the silhouette is below 0 throughout: electronic spans techno and ambient, folk spans a jig and a waltz). The style point is not a genre classifier, and needn't be one.
2. **The confusions are of three kinds, and only one is a fault of the axes.**
   - *Merged on purpose:* under `bite` alone, Swing jazz and the jazz ballad, the soul ballad and gospel, Ambient and shoegaze differ mainly in density. Decision 076 makes density intensity, a moment rather than a place, so one style played softly and loudly should merge.
   - *Told apart by another facet:* Dubstep and trap (tempo, half-time), salsa and samba (the clave, the meter), rock and a Celtic jig (6/8) sit together in every option. The repository's other facets (meter, rhythm, instruments) and the tempo carry what they don't share, so the point needn't.
   - *A fault of the axes:* pairs a listener wouldn't confuse and no other facet parts. `drive` (the mean of attack and density) makes three of its own, shoegaze and country, Electro swing and tango, rock and a march: a sustained dense sound and a short sparse one land in the middle together. The mode alone (`bite+mode`) leaves punk with a march and shoegaze with a folk waltz; the mode tempered by tension (`bite+mood`) parts both. Synth-pop and trance, and Spooky and the Romantic, stay near in three of the four options: what parts them (the tempo, the instruments) is off the point.
3. **`mood` is worth more than `bright`.** Tempering the mode's brightness by tension (`0.6 · bright + 0.4 · (1 − tension)`) parts a march from punk, a jig from the blues, and moves metal, dub and trap darker than their modes alone place them. It costs Disco and the blues, which then sit together (both at ease, mixolydian and dorian), a pair density, the meter and the instruments still part.
4. **`bite` alone is cleaner than `drive`.** It keeps attack an axis of its own, so legato and dense (shoegaze, a romantic orchestra) and short and sparse (reggae's skank, dub) stay where they are, and leaves density to intensity. Its cost is a correlation with `sync` (0.52 over the atlas): syncopated music tends to be struck, which is music, not a fault of the axis.
5. **Six of the sixteen corners are empty** (no genre within 0.3), and they are where #542's new styles are wanted:

   | corner (sync harm bite mood) | nearest now | a genre that would stand there |
   |---|---|---|
   | 0110: on the beat, moving, struck, dark | Thrash metal, 0.39 | progressive metal; a Stravinsky ostinato |
   | 0111: on the beat, moving, struck, bright | Baroque, 0.32 | a baroque allegro; ragtime's left hand |
   | 1000: off the beat, static, sustained, dark | Dub, 0.42 | trip-hop |
   | 1001: off the beat, static, sustained, bright | Afrobeat, 0.42 | lovers rock; Balearic chill-out |
   | 1100: off the beat, moving, sustained, dark | Lo-fi hip hop, 0.42 | neo-soul; dark jazz |
   | 1110: off the beat, moving, struck, dark | Flamenco, 0.33 | nuevo tango; gypsy jazz in minor |

   Ten corners have a representative within 0.3: Horror drone (0000), Ambient (0001), Techno (0010), Punk (0011), Romantic (0100), the jazz ballad (0101), Dubstep (1010), Reggae (1011), Bossa nova (1101) and Bebop (1111).

## The tables

### The options over 42 genres

| option | axes | median gap | least gap | pairs under 0.1 | across families | silhouette | most correlated axes | spread per axis |
|---|---|---|---|---|---|---|---|---|
| v0.21 | sync harm artic energy | 0.106 | 0.066 | 10 | 7 | -0.126 | artic–energy 0.58 | 0.27 0.29 0.27 0.23 |
| drive | sync harm drive bright | 0.119 | 0.052 | 9 | 7 | -0.123 | sync–drive 0.44 | 0.27 0.29 0.22 0.31 |
| bite+mode | sync harm bite mood | 0.101 | 0.043 | 12 | 6 | -0.136 | sync–bite 0.52 | 0.27 0.29 0.27 0.31 |
| bite+mood | sync harm bite mood | 0.103 | 0.052 | 11 | 6 | -0.142 | sync–bite 0.52 | 0.27 0.29 0.27 0.27 |

### v0.21: the pairs under 0.1

- Dubstep and Trap, 0.066
- Salsa and Samba, 0.066
- Rock and Celtic jig, 0.071
- Doom metal and Folk waltz, 0.071
- Drum and bass and Salsa, 0.075
- Disco and Celtic jig, 0.075
- Synth-pop and Country, 0.079
- Synth-pop and Deep house, 0.090
- Punk and Thrash metal, 0.097
- Synth-pop and Blues, 0.097

### drive: the pairs under 0.1

- Dubstep and Trap, 0.052
- Salsa and Samba, 0.056
- Rock and Celtic jig, 0.056
- Synth-pop and Trance, 0.061
- Spooky and Romantic, 0.067
- Shoegaze and Country, 0.080
- Electro swing and Tango, 0.083
- Deep house and Disco, 0.088
- Rock and March, 0.098

### bite+mode: the pairs under 0.1

- Dubstep and Trap, 0.043
- Salsa and Samba, 0.061
- Rock and Celtic jig, 0.071
- Celtic jig and Country, 0.072
- Ambient and Shoegaze, 0.075
- Deep house and Disco, 0.083
- Punk and March, 0.087
- Soul ballad and Gospel, 0.090
- Swing jazz and Jazz ballad, 0.094
- Synth-pop and Trance, 0.094
- Shoegaze and Folk waltz, 0.094
- Celtic jig and Blues, 0.094

### bite+mood: the pairs under 0.1

- Celtic jig and Country, 0.052
- Dubstep and Trap, 0.053
- Disco and Blues, 0.063
- Salsa and Samba, 0.064
- Spooky and Romantic, 0.082
- Deep house and Disco, 0.085
- Rock and Celtic jig, 0.093
- Synth-pop and Trance, 0.094
- Soul ballad and Gospel, 0.095
- Swing jazz and Jazz ballad, 0.096
- Ambient and Shoegaze, 0.096

### bite+mode: each corner's nearest genre (axes in order: sync harm bite mood)

| corner | genre | distance |
|---|---|---|
| 0000 | Horror drone | 0.056 |
| 0001 | Ambient | 0.164 |
| 0010 | Techno | 0.139 |
| 0011 | Punk | 0.148 |
| 0100 | Romantic | 0.179 |
| 0101 | Jazz ballad | 0.186 |
| 0110 | Thrash metal | 0.387 |
| 0111 | Baroque | 0.324 |
| 1000 | Dub | 0.386 |
| 1001 | Blues | 0.429 |
| 1010 | Dubstep | 0.177 |
| 1011 | Reggae | 0.144 |
| 1100 | Lo-fi hip hop | 0.353 |
| 1101 | Bossa nova | 0.275 |
| 1110 | Flamenco | 0.307 |
| 1111 | Bebop | 0.258 |

### bite+mood: each corner's nearest genre (axes in order: sync harm bite mood)

| corner | genre | distance |
|---|---|---|
| 0000 | Horror drone | 0.056 |
| 0001 | Ambient | 0.159 |
| 0010 | Techno | 0.214 |
| 0011 | Punk | 0.185 |
| 0100 | Romantic | 0.225 |
| 0101 | Jazz ballad | 0.184 |
| 0110 | Thrash metal | 0.386 |
| 0111 | Baroque | 0.323 |
| 1000 | Dub | 0.419 |
| 1001 | Afrobeat | 0.421 |
| 1010 | Dubstep | 0.192 |
| 1011 | Reggae | 0.138 |
| 1100 | Lo-fi hip hop | 0.417 |
| 1101 | Bossa nova | 0.272 |
| 1110 | Flamenco | 0.331 |
| 1111 | Bebop | 0.276 |

