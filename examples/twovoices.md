---
title: "Two voices: a mix"
tags: [tutorial, sound]
tier: 1
description: "One tune, played by two voices at once: a sine on top and a saw three octaves below it, quieter."
---

```cells
&twovoicesNote label="A chord in the brackets is a mix: the sound card plays what is in it at once. * .5 and * .25 are gains: how loud each voice is in the mix." about=&out
&tagsNote label="tags= groups cells in the graph, the first tag naming the group: both voices sit in one, the tune beside them." about=(&lead &bass &tune)

&tune tags="melody" step=3 0 4 7 4 0 4 7@2 5 9 12 9 5 9 12@2   # a tune
&lead tags="voices" s=sine loop=C5
&bass tags="voices" s=saw loop=C2
&out map=sample postgain=2 [&tune * &lead * .5, &tune * &bass * .25]
```
