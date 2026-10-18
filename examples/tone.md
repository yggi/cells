---
title: "A tone: one note, one voice"
tags: [tutorial]
tier: 1
description: "The smallest piece that sounds: a note every second, played by a sine on A4."
---

```cells
&toneNote label="Three cells make a sound. A melody (&note: step=1, a step a second, its 0 the voice's own note), a voice (&voice: a sine, on A4) and the sound card (&out), which plays the melody through the voice." about=(&note &voice &out)

&note step=1 0
&voice s=sine loop=A4
&out map=sample postgain=2 [&note * &voice]
```
