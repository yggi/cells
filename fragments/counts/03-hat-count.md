---
id: hat_count
source: seed
---

```cells
&count from (&hat) &bar style=(&swingJazz | &electroSwing | &bluesShuffle)
&hat=ph from gm_kit
&count from click(tick=&hat) &bar
```

The jazz drummer's count: the hi-hat's pedal on each beat (`&hat=ph`, the General MIDI pedal hi-hat), a bar of the meter's beats before the band comes in (#720). It is the click (`click`) on the pedal, its accents the meter's grouping.

At the swing styles, Swing jazz, Electro swing and Blues shuffle, weight 1, as the facet `count`, where the drummer keeps time with the foot. A count is a bar, placed by the form: `[&count * &countIn]`, `&countIn map=amp step=1m 1 0@1000` (`click` says more).

**Its signature** (decision 065): `&count from (&hat) &bar`, the meter its main argument. `&count from hat_count &bar` takes a copy of it; `hat_count(hat=&mine)` clicks a sound of the piece's own.
