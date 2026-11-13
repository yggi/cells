---
id: electric_piano
association:
  - point:
      sync: 0.7
      harm: 0.2
      bite: 0.2
      mood: 0.25
    weight: 0.125
    facet: instrument
  - point:
      sync: 0.5
      harm: 0.75
      bite: 0.45
      mood: 0.5
    weight: 0.5
    facet: instrument
  - point:
      sync: 0.35
      harm: 0.55
      bite: 0.75
      mood: 0.65
    weight: 0.5
    facet: instrument
source: seed
---

```cells
&leadV s=sine loop=C4 room=.5 env=&(map=adsr .01 .8 .3 .6)
```

An electric piano in a large room: a sine struck softly that rings and fades, the Rhodes of a trip-hop record.
It defines `&leadV`, the voice the lead performer plays.

At Trip-hop's point (sync 0.7, harm 0.2, bite 0.2, mood 0.25), weight 0.125, as the facet `instrument` (#542), at half the default instruments' weight (#350).

**Shared** (#540): near Lo-fi hip hop's and Deep house's points, a second lead behind the default.
