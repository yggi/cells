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

  Nothing a piece plays changes. The per-facet exports (`BASS_FRAGMENTS` and the rest) retire in a later commit of the same issue, once yggi/cells#624 has landed.
