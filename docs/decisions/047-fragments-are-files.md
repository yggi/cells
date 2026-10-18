# 047 · A fragment is a piece with holes, combined by a union of lines; it is a file with metadata, the seed library in cells and what a jam learns in the frontend

**Date:** 2026-10-18 · **Status:** accepted (owner, 2026-10-18: "all 5 as suggested", the facet "a hint, not a strict classifier … a facet per association", and "structured metadata per fragment … make them files"; on #22: "it's the same line") · Issues: #22, #49, #81

## Context

Decision 041 made a fragment cells text with an id and an association, and 043 had the composer ask the repository first, in order, for fragments that fit what is on its workbench.
#22 asked how a fragment leaves its meter and key to the host; the owner ruled on #117: taps, no new form, the host's lines first, and a bare `over=key` for the main key (#130).
What was left open: what a fragment's text may hold, how fragments combine, what fits, how a fragment is classed, where what a jam learns is kept, and what is known about a fragment beside its text (who made it, where, when).

## Decision

1. **A fragment is a piece with holes.**
   Its text is cell lines that *use* names they don't define (`&bar`, `key`, `&harm`) and *define* others (`&kick`, `&clave`).
   What it uses, what it defines and what its clock needs (a cycle of two bars, a level of `16n`) are derived from the text, never written beside it.
2. **Fragments combine by a union of lines, and the workbench is a cells text.**
   A line two fragments give word for word is the same line (owner, on #22), so combining is a union.
   A few names are the interface fragments agree on (`&bar`, `key`, `&harm`; more as facets need them); every other name is the fragment's own, renamed on a collision with a name already on the workbench (decision 037: a name is a word, a hash the identity).
3. **What fits is read off the text and the compiler.**
   A fragment fits a workbench when every name it uses is defined there, no name is defined twice by different lines, what its clock needs is there (a braid of 32 sixteenths on `cycle=2` needs bars of 16 sixteenths: a two-bar clave compiles under 7/8, as #141 found, but doesn't fit it), and the union compiles without a diagnostic.
   No declared constraints beside the text: what a fragment needs is derived from it (1), so the test can't drift from the language.
4. **A facet is a hint, given per association.**
   Each point of a fragment's association may name a facet: the role it is associated with there (`meter`, `rhythm`, `harmony`, `line`, `instrument`, `section`, as 043's order asks).
   One fragment can have several: a bell pattern is a rhythm where it is associated with West African music, and a scale or a harmony where it is associated with Western music (the owner's example).
   A query naming a facet measures the points with that facet; what a fragment can actually fill is the fit (3), not the facet.
5. **Groups are fragments used together, not fragments merged.**
   Acid's patch and its bassline are two fragments; how often fragments are used together (decision 046) ranks beside the style point, so a group emerges from use and each part stays reusable.
   One fragment holds several parts only when they mean nothing apart.
6. **A fragment is a file, with structured metadata.**
   A Markdown file: frontmatter holds the index entry and the metadata, a ```` ```cells ```` block holds the text, and prose may say anything else.
   - The entry: an `id` and the association (its points, weights and facets).
   - The metadata, open-ended: at least `source` (a person's name, `muse`, `composer`, or `seed`), `tags` (an event's name, a session), `created` and `heard` (timestamps).
     Any other key a frontend or a person adds is kept and indexed, not refused.
   The files are what a person opens and edits (Cell studio) and what an index reads (a database, or a store such as SilverBullet, which indexes Markdown frontmatter); the same form holds a library of a person's own pieces in Cell studio.
7. **The seed library is cells'; what a jam learns is the frontend's.**
   cells holds the hand-made seed fragments, versioned with its releases, and stays pure and stateless: it parses and writes the files, derives what a fragment uses and defines, checks the fit, and ranks a query over the seed library and whatever learned layer the frontend hands it.
   The learned layer (fragments the Muse heard or the composer made, associations use has moved, counts of use together) is kept by the frontend, keyed by a fragment's id now and its hash later.
   What a jam learns comes back into the seed library by a pull request a person chooses.

## Why

- A union of lines needs nothing new: the host's lines first, taps and the main key already leave the meter and key open, and "the same line" makes two fragments that share an interface fit by construction.
- Deriving the fit from the text and the compiler keeps one source of truth: the language says what a line needs, so the repository never holds a second, drifting copy of it.
- A facet per association says what the owner's bell says: one text has different roles in different places, and the role is where it is heard, not what it is.
- Files keep the repository legible (the project's spirit: legible all the way down): a person can read, edit, diff and share a fragment, and an index is derived from files, never the other way round.
- cells stateless keeps it pure (`tsconfig.pure.json`) and lets each frontend keep its own memory: a jam's, a person's library.

## Open

- The frontmatter's syntax: YAML (what SilverBullet and most Markdown tools read) needs a parser in cells, a dependency or a small subset of its own; to be chosen in the files' issue.
- Whether the examples' own metadata (their title and tags, today in the text) moves into frontmatter, so an example and a fragment are the same kind of file.
- The store: SilverBullet or another, and who serves it at an event (Jambot's lobby, a person's machine); the frontends' issues measure it.
