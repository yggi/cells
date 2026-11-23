---
id: clave_count
source: seed
---

```cells
&count from (&clave) &bar style=(&salsa | &bossaNova)
&clave=claves from gm_kit
&count from click(tick=&clave) &bar
```

The Latin count: the claves on each beat (`&clave=claves`), a bar of the meter's beats before the band comes in (#720). It is the click (`click`) on the claves, its accents the meter's grouping; the clave pattern itself comes in with the groove.

At Salsa and Bossa nova, weight 1, as the facet `count`. A count is a bar, placed by the form: `[&count * &countIn]`, `&countIn map=amp step=1m 1 0@1000` (`click` says more).

**Its signature** (decision 065): `&count from (&clave) &bar`, the meter its main argument. `&count from clave_count &bar` takes a copy of it; `clave_count(clave=&mine)` clicks a sound of the piece's own.
