---
title: "A drum track in layers: the count, the groove and its fills"
tags: [genre:dance, rhythm, arrangement]
description: "A drum track built from layers, each placed by the bar: the sticks count in, the funk groove plays, and a fill ends each phrase."
---

A drum track is layers, each a line by its role, and the form places them by the bar: a level line at the bar's rate (`map=amp step=1m`) is 1 where a layer plays and 0 where it doesn't, as a groove places its euclid's hits by `&euclidLevel` one level down. Three layers here, each a fragment taken by name: the sticks' count-in (`stick_count`, its clicks accented by the meter's grouping), the funk groove's lines (`funk_drums`, its own fill left out) and Jambot's snare run at the end of each four-bar phrase (`snare_run`), here on the electric snare, its drum an argument (`snare_run(sd=&electricsnare)`), so it stands out from the groove's backbeat. A song's last bar would be one more, `landing`, Jambot's ending drums, placed on that bar in place of the groove.

```cells
&bar meter("4/4") step=&tempo laps=9
&tempo step=104bpm

&electricsnare from gm_kit
&count from stick_count &bar
&kick, &backbeat, &ghost, &hat from funk_drums
&beat [&kick, &backbeat, &ghost, &hat]
&fill from snare_run(sd=&electricsnare)

# each layer's bars: the count the first, the groove the eight after, a fill the last of each four
&countIn map=amp step=1m 1 0!8
&playing map=amp step=1m 0 1!8
&fillAt map=amp step=1m 0 0!3 1 0!3 1

&drums map=sample [&count * &countIn, &beat * &playing, &fill * &fillAt]
```

The groove under the fill keeps playing: a fill is one more layer, not a bar in place of the groove's. Change a fragment's name and its layer changes, the bars it plays on stay: `&fill from build_run` runs from the half bar, `&count from click &bar` counts on a metronome, its accents the meter's grouping, `&count from hat_count &bar` on the hi-hat's pedal.
