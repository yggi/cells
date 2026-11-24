---
title: "A song that ends: eight bars and a finale"
tags: [genre:electronic, harmony, arrangement]
description: "Eight bars of a minor song, then its ending, found by style: the dominant seventh, everyone landing on the tonic at the half bar, and the tonic left to ring."
---

A song that ends (#720): eight bars of a progression in D minor, then two bars of its ending, `finale`, the ending Synth-pop's style finds (`npm run coverage -- --facet ending`): the dominant seventh for half a bar, then the bass, the pad, the lead and the drums landing together on the tonic, which rings a bar.

The song and its ending are two sections of one plan (decision 016): `&parts` names their clocks, `&songHalf` and `&endHalf`, two steps a bar, and `&plan` runs the song for eight bars, then the ending for two, each one step held, so each section's lines start with it. The song's lines step by `&songHalf`; the ending takes `&endHalf` as its clock (`finale(half=&endHalf)`). The drums step by the meter, so a level line at the bar's rate stops them where the ending takes over (`&playing`); the ending's own drums (`&finaleDrums`, Jambot's landing) are left out here for two hits of the song's kit on the one and the landing, `&land`, stepped by the ending's clock.

```cells
&bar meter("4/4") step=&tempo laps=10
&tempo step=100bpm
&key from diatonic(mode=aeolian) D

&parts step=2n &songHalf &endHalf
&plan over=&parts step=1m 0@8 1@2

&harm over=&key step=&songHalf/2 [0,2,4] [5,7,9] [3,5,7] [4,6,8]
&bassline over=&harm step=&songHalf*2 0 ~ 0 4
&padline over=&harm step=&songHalf/2 [0,1,2]
&tune over=&key step=&songHalf*2 4 ~ 2 3 4@2 2 ~ 0@2 1 2 1@3 ~
&pulse=bd, &snap=sd, &tick=hh from gm_kit
&beat step=8n &pulse ~ &tick ~ &snap ~ &tick ~
&playing map=amp step=1m 1!8 0!2

&cadence, &finaleBass, &finalePad, &finaleLead from finale(half=&endHalf) &key
&land step=&endHalf*8 &pulse ~!7 [&pulse, &snap] ~!23

&bassV s=tri loop=D2 env=&(map=adsr .01 .3 .5 .2)
&padV s=saw loop=D3 lpf=900 gain=.5 env=&(map=adsr .2 .4 .7 .8)
&leadV s=square loop=D4 lpf=2000 env=&(map=adsr .01 .2 .6 .3)

&out map=sample postgain=1.4 [&bassline * &bassV * .6, &finaleBass * &bassV * .6, &padline * &padV * .25, &finalePad * &padV * .25, &tune * &leadV * .3, &finaleLead * &leadV * .3, &beat * &playing * .5, &land * .5]
```

Change the ending's name and the song ends another way, its clock and its parts the same: `stop` on the one, `plagal`'s amen, `picardy`'s major tonic, `blues_ending`'s seventh left hanging, `drone_out`'s held tonic.
