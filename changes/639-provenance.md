### Changed

- **The names around `from`** (#639, rung C2 of yggi/cell-studio#621), now that `use` is retired:

  | old | new |
  |---|---|
  | `Used` | `Take` |
  | `CompileResult.uses`, `Expansion.uses` | `takes` |
  | `ParseResult.uses`, `UseLine` | `takes`, `TakeLine` |
  | `hasUse` | `hasFrom` |
  | `USE_DEPTH` | `FROM_DEPTH` |

  **What a frontend sees at its next pin:** these names fail to typecheck until renamed; nothing else about them changes. The lockfile's frontmatter key in a piece file stays `uses:`. Diagnostic messages are unchanged.

### Added

- **Where a given cell came from:** `CompileResult.origins` maps each cell a `from` line gave (by its name as compiled) to its `Origin` chain, outermost first: the piece's `from` line (`id: null`), each fragment's line that took it on, and the line of the fragment that defines it. Electroswing's `&hh`: its line 1, `drums_performer`'s take of the kit, `gm_kit`'s `&hh` line.
- **`takeIn(text, name, options)`:** a given cell's line made the piece's own before an edit (cell-studio#610, its `withUsedLine`'s place).
  - Nothing to write for the piece's own cell or a one-head `from` line's head: `setAttr` and `setShift` write a head's attribute before `from`.
  - A collection's cell, or a head `*` takes from a template, gets its line written into the piece from the expansion, and a line that named it stops asking for it.
  - A head among several on one line, or a copy's own cell, says why.
