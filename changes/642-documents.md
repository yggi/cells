### Added

- **A document gives fragments** (decision 082, #642, rung C5 of yggi/cell-studio#621).
  - **A file may hold several signatures.** Each declares a part: its heads and every line they read.
  - **A line takes a part by its head:** `&twinkle from kinderlied &key`, or renamed, `&tw=twinkle from kinderlied &key`.
  - **The document's main-parameter line** (its `&key`) is the piece's own, never a part's default.
  - **A part is hashed alone** and locked as `kinderlied/twinkle`; `Take.part` names its head.
  - `partOf`, `partsOf`; `PARTS` and `ofFacet` in `repository/library`; the catalogue lists each part with its document and head.
- **One namespace:** `resolveSeed` resolves an example by its key, and no example's key is a fragment's id (a test).

### Changed

- **Breaking: Kinderlieder's six tunes are its parts.** The motif files `twinkle`, `wonder`, `haenschen`, `hinein`, `heim` and `weinet` are gone.
  - A take of one of their old ids is refused. Migrate's `moved` rule rewrites it: `&twinkle from twinkle &key` → `&twinkle from kinderlied &key`.
  - Their ids in the library are `kinderlied/twinkle` and the rest.
  - Kinderlieder plays as it did: its notes and events hashes are unchanged; its `values` and `live` hashes move only because its unnamed cells are named by their line, six lines lower now.
- **Breaking: the motifs `waltz` and `korobeiniki` are `waltzBar` and `korobeinikiBar`,** with their heads. Their old ids are example keys now (one namespace).

**What a frontend sees at its next pin:** a take of the six old ids or the two renamed ones fails to compile until Migrate rewrites it. Jambot's pin move names what it asks for by id.
