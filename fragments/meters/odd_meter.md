---
id: odd_meter
source: seed
---

```cells
&bar from (&meter) &tempo style=(&(map=style sync=.4 harm=.9 bite=.5) * .75 | &spooky)
&bar from (&meter) &tempo style=&(map=style sync=.8 harm=.6 bite=1) * .75 meter="7/8"
&bar from (&meter) &tempo style=&(map=style sync=.6 harm=.9 bite=.8) * .75 meter="10/8"
&bar meter(&meter) step=&tempo
&meter "5/4"
```

The odd meters: five beats, and the aksak's sevens and tens, their groups of 3 and 2 (#902, decision 103). Its head is `bar`'s, written out so its text holds itself (a host that reads it alone needs no library): `&bar from odd_meter &tempo` is 5/4, `odd_meter(meter="7/8")` the 3+2+2. An aksak swung on its pairs sets its swing on the head, its threes straight (decision 071): `&bar swing=8n:2/3 from odd_meter(meter="7/8") &tempo`.

5/4 is at Spooky's point, and at a point of its own at 0.75; 7/8 and 10/8 at points of their own, 0.75, as the meters placed for their own sake in `bar` are: no style holds them yet.

**Its signature**: `&bar from (&meter) &tempo`, `meter=` a text, as `bar`'s.
