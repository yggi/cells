---
id: core kit
association:
  - point:
      sync: 0.5
      harm: 0.5
      artic: 0.5
      energy: 0.5
    weight: 1
    facet: instrument
source: seed
---

```cells
&bd s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0) env=&(map=adsr 0 .3 0 .05)
&rim s=sine loop=E5 env=&(map=adsr 0 .03 0 .02)
&sd s=white hpf=1500 env=&(map=adsr 0 .12 0 .05)
&cp s=white hpf=1000 env=&(map=adsr 0 .08 0 .05)
&lt s=sine loop=G2 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .25 0 .05)
&hh s=white hpf=8000 env=&(map=adsr 0 .04 0 .02)
&ph s=white hpf=9000 env=&(map=adsr 0 .03 0 .01)
&mt s=sine loop=C3 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .2 0 .05)
&oh s=white hpf=7000 env=&(map=adsr 0 .25 0 .1)
&ht s=sine loop=F3 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .15 0 .05)
&cr s=white hpf=5000 env=&(map=adsr 0 .8 0 .3)
&rd s=white hpf=9000 env=&(map=adsr 0 .4 0 .2)
&claves s=sine loop=D7 env=&(map=adsr 0 .06 0 .03)
```

The core of General MIDI's drum kit (decision 054, #225): the 13 voices a groove needs, the kick, the side stick, the snare, the clap, three toms, the closed, pedal and open hats, the crash, the ride and the claves, under the same names and with the same lines as the General MIDI kit, so a groove need not bring in 47 voices.
Its claves line is the son and bossa claves' own, word for word, so a clave and the kit side by side share it.

Associated as the General MIDI kit is, once as the facet `instrument` at the centre of style space, at twice its weight: the kit a query for an instrument finds first.
