### Fixed

- **A use that sets an attribute on the head no longer takes the default that attribute read** (#899): `&bar swing=16n:.6 from meter &tempo` plays as `&bar from meter(swing=16n:.6) &tempo` did, and no longer gives `&bar_swing` with the warning "swing= acts on a meter … on &bar_swing it does nothing". **What a frontend sees at its next pin:** such a use gives one cell fewer (`takes[].gave`, the graph's nodes); no event moves.
