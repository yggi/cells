---
id: gm kit
association:
  - point:
      sync: 0.5
      harm: 0.5
      artic: 0.5
      energy: 0.5
    weight: 0.5
    facet: instrument
source: seed
---

```cells
&acousticbassdrum s=sine loop=G1 pitch=0..24 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .4 0 .05)
&bd s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0) env=&(map=adsr 0 .3 0 .05)
&rim s=sine loop=E5 env=&(map=adsr 0 .03 0 .02)
&sd s=white hpf=1500 env=&(map=adsr 0 .12 0 .05)
&cp s=white hpf=1000 env=&(map=adsr 0 .08 0 .05)
&electricsnare s=white hpf=2500 env=&(map=adsr 0 .09 0 .04)
&lt s=sine loop=G2 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .25 0 .05)
&hh s=white hpf=8000 env=&(map=adsr 0 .04 0 .02)
&highfloortom s=sine loop=A2 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .23 0 .05)
&ph s=white hpf=9000 env=&(map=adsr 0 .03 0 .01)
&mt s=sine loop=C3 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .2 0 .05)
&oh s=white hpf=7000 env=&(map=adsr 0 .25 0 .1)
&lowmidtom s=sine loop=D3 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .18 0 .05)
&ht s=sine loop=F3 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .15 0 .05)
&cr s=white hpf=5000 env=&(map=adsr 0 .8 0 .3)
&hightom s=sine loop=A3 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .13 0 .05)
&rd s=white hpf=9000 env=&(map=adsr 0 .4 0 .2)
&chinesecymbal s=white hpf=3000 distort=.3 env=&(map=adsr 0 .6 0 .2)
&ridebell s=tri loop=E6 env=&(map=adsr 0 .5 0 .2)
&tb s=white hpf=6000 env=&(map=adsr 0 .15 0 .05)
&splashcymbal s=white hpf=6000 env=&(map=adsr 0 .35 0 .1)
&cb s=square loop=G5 lpf=2500 env=&(map=adsr 0 .1 0 .03)
&crashcymbaltwo s=white hpf=4000 env=&(map=adsr 0 .9 0 .3)
&vibraslap s=white hpf=2000 crush=6 env=&(map=adsr 0 .6 0 .2)
&ridecymbaltwo s=white hpf=8000 env=&(map=adsr 0 .5 0 .2)
&hibongo s=sine loop=E4 pitch=0..7 * &(map=adsr 0 .02 0 0) env=&(map=adsr 0 .1 0 .03)
&lowbongo s=sine loop=A3 pitch=0..7 * &(map=adsr 0 .02 0 0) env=&(map=adsr 0 .12 0 .03)
&mutehiconga s=sine loop=C4 env=&(map=adsr 0 .05 0 .02)
&openhiconga s=sine loop=C4 pitch=0..5 * &(map=adsr 0 .03 0 0) env=&(map=adsr 0 .2 0 .05)
&lowconga s=sine loop=G3 pitch=0..5 * &(map=adsr 0 .03 0 0) env=&(map=adsr 0 .25 0 .05)
&hightimbale s=tri loop=D5 env=&(map=adsr 0 .15 0 .05)
&lowtimbale s=tri loop=A4 env=&(map=adsr 0 .18 0 .05)
&highagogo s=tri loop=A5 env=&(map=adsr 0 .2 0 .05)
&lowagogo s=tri loop=E5 env=&(map=adsr 0 .2 0 .05)
&cabasa s=white hpf=5000 env=&(map=adsr 0 .06 0 .03)
&sh s=white hpf=4000 env=&(map=adsr 0 .04 0 .03)
&shortwhistle s=sine loop=B6 env=&(map=adsr .01 .08 0 .03)
&longwhistle s=sine loop=B6 env=&(map=adsr .01 .1 .8 .1)
&shortguiro s=white hpf=2500 lpf=5000 crush=4 env=&(map=adsr 0 .08 0 .02)
&longguiro s=white hpf=2500 lpf=5000 crush=4 env=&(map=adsr 0 .3 0 .05)
&claves s=sine loop=D7 env=&(map=adsr 0 .06 0 .03)
&hiwoodblock s=sine loop=G5 env=&(map=adsr 0 .04 0 .02)
&lowwoodblock s=sine loop=C5 env=&(map=adsr 0 .05 0 .02)
&mutecuica s=sine loop=A4 pitch=0..7 * &(map=adsr 0 .08 0 0) env=&(map=adsr 0 .1 0 .03)
&opencuica s=sine loop=A4 pitch=0..12 * &(map=adsr .05 .2 0 0) env=&(map=adsr 0 .3 0 .05)
&mutetriangle s=sine loop=A6 env=&(map=adsr 0 .08 0 .03)
&opentriangle s=sine loop=A6 env=&(map=adsr 0 1.2 0 .4)
```

General MIDI's drum kit (decision 054, #225): a voice for each of its 47 percussion notes, 35 to 81, in General MIDI's order, each under its kit name (`GM_KIT` in `src/engine/midi.ts`), so MIDI out sends each on its own note.
The names are Strudel's short names where Strudel has one (`&bd`, `&sd`, `&hh`, `&oh`, `&cp`, `&rim`, `&lt`, `&mt`, `&ht`, `&cr`, `&rd`, `&cb`, `&tb`, `&sh`), else General MIDI's, spelled as one word (`&lowmidtom`, `&crashcymbaltwo`); General MIDI's names for the first are aliases (`kick`, `cowbell`), which name the same note.

It defines voices and uses nothing, so it fills the holes a groove leaves (`&bd &sd &hh`), fits any workbench, and sounds only what a piece plays through it. Each sound is a first pass in cells' own parameters: a sine dropping in pitch for the drums and toms, filtered noise for the snares, hats and cymbals, a tuned sine or triangle for the hand percussion; the voices the core kit holds are its lines word for word.

A kit is style-neutral: it is associated once, as the facet `instrument`, at the centre of style space (every axis at 0.5), the point nearest the farthest preset, at half the core kit's weight, so a query for an instrument finds the core kit first and this one beside it.
