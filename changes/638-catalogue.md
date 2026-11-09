### Added

- **A catalogue of fragments, a text's references, and a resolver over a person's layer** (#638, rung C1 of yggi/cell-studio#621). These are the first of what a frontend reads to show the library.
  - **`catalogue(layer?)`:** an entry per fragment file, the seed's in path order, then a learned layer's filed ones. Each entry has:
    - its facets, read off its points;
    - its points: its own, then those use added;
    - `variants`, the ids a query answers with (a template's sets of arguments);
    - its signature, and the ids it takes;
    - its prose and metadata;
    - its holes, compiled on first read and kept.
  - **`references(text)`:** each `from` line that takes from a fragment, as the parser reads it and never resolved, with its id's span.
  - **`resolverOf(layer)`:** the seed's ids first, then the layer's filed fragments, so a piece that takes a person's fragment compiles.

  Nothing a piece plays changes.

### Removed

- **The per-facet lists:** `METER_FRAGMENTS`, `RHYTHM_FRAGMENTS`, `BASS_FRAGMENTS`, `HARMONY_FRAGMENTS`, `INSTRUMENT_FRAGMENTS`, `EXPRESSION_FRAGMENTS`, `MODE_FRAGMENTS`, `PERFORMER_FRAGMENTS`, `STAB_FRAGMENTS`, `MOTIF_FRAGMENTS`, `FORM_FRAGMENTS`, `BAND_FRAGMENTS` and `MODULE_FRAGMENTS` (#638).
  - They go from the package's surface, and their modules go from `@yggi/cells/repository/*`.
  - `STYLE_FRAGMENTS` leaves the surface; `STYLES` and the rest of `repository/styles` stay.
  - `LIBRARY` is the same fragments in the same order.

  **What a frontend sees at its next pin:** an import of one of these fails to typecheck. Migrate it in one of two ways:
  - list by facet: `catalogue().filter((e) => e.facets.includes('bass'))`;
  - for the fragments a query holds: `LIBRARY.filter((f) => f.association.some((p) => p.facet === 'bass'))`.

  Cell studio imports none of them. Jambot's pin-move issue names what it imports.
