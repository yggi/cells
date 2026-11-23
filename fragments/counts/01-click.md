---
id: click
source: seed
---

```cells
&count, &accent from (&tick) &bar style=(&ambient | &darkAmbient | &spooky | &kinderlied | &baroque | &waltz | &seaShanty)
&tick=lowwoodblock from gm_kit
&accent [.9 + &bar * -.3]
&clicks step=beat &tick
&count [&clicks * &accent]
```

A click track from the meter, a metronome (#720): a click on every beat, each as strong as the meter's grouping makes it. The meter is a table of levels, one a step, its tiers from the bar down (`meter("7/8")` is 0 3 3 1 3 1 3: the bar, then its groups, 3+2+2, then the eighths); `&accent` reads them as values (decision 079), the bar .9, a group's or a half bar's start .6, a beat below it .3, an eighth nothing, and `&clicks` taps the meter's beats (`step=beat`), so each click sounds at its beat's accent. 4/4 clicks .9 .3 .6 .3, the half bar marked; 7/8 its three groups, .9 .6 .6; 6/8 its two dotted quarters, .9 .6; 12/8 .9 .3 .6 .3. Each where the meter's tree places it, swing and bends included (decision 080): a reading of the meter, not a clock of its own, as Jambot's metronome is (`metronome.ts`, yggi/jambot packages/engine/src).

**`&accent` is a head of its own:** the meter's accents as a level line, which any line can be played at, `&hat * &accent`, as a groove's euclid is played at `metric_accent`'s.

It takes the meter, `&bar`, its main argument (`&count from click &bar`), and its sound is optional, the General MIDI kit's low wood block by default (`&tick=lowwoodblock from gm_kit`, decision 075): `click(tick=&cb)` rings the cowbell.

At the styles with no drummer to count, or none who would (Ambient, Dark ambient, Spooky, Kinderlied, Baroque, Waltz and Sea shanty), weight 1, as the facet `count`. The other counts are this click on a player's sound: the sticks (`stick_count`), the hi-hat's pedal (`hat_count`) and the claves (`clave_count`).

**A layer, placed by the form.** The click plays every bar; a piece places it by a level line at the bar's rate, as a groove places its euclid's hits by `&euclidLevel` one level down: a count-in is its first bar, `[&count * &countIn]` with `&countIn map=amp step=1m 1 0@1000`; a click through the piece is the line alone.

**Its signature** (decision 065): `&count, &accent from (&tick) &bar`. `&count from click &bar` takes the click; `&accent from click &bar` its accents alone.
