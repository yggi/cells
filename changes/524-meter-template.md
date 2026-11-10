### Changed

- **Normalise writes a template's line, its parameters filled in, as a `from` line of the template with those arguments** (#524, part of #15):
  - `&bar meter("7/8") step=&tempo swing=8n:2/3` becomes `&bar from meter(grouping=meter("7/8"), swing=8n:2/3) &tempo`;
  - `&key scale(minor, &tonic)` becomes `&key from diatonic(mode=minor) &tonic`.

  It applies to any template in the library (`normalise/library.ts`'s `libraryTemplates`), only where the two sound identical. A line with anything the template doesn't write is left as it is, and so is a parameter of another kind than its default: a bent bar, `scan(27 23 26 24)`, isn't a grouping.
- **The examples:**
  - `radio`, `jazz`, `coltrane`, `five`, `phase` and `bossa` take the library's meter;
  - `sympathy`, `worn` and `patchbay` take its key.

  No `notes` or `events` hash moves. `breve` (a tutorial of the alla breve form), `swing` (reworked in #646) and `spooky`'s stab line (the piece's own, its prose says) are kept as written.
