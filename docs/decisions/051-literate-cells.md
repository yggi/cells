# 051 · Literate cells: a file's code is the join of its cells blocks, the rest is prose; raw cells text is a valid shorthand

**Date:** 2026-10-18 · **Status:** accepted (the owner, 2026-10-18: "literate cells") · Issues: #195, #196, #146, #191

## Context

Decision 047 made a fragment a Markdown file: frontmatter, *a* cells block, prose after it. #146 gave pieces the same file. The reader of that form was copied four times (`piecefile.ts`, `repository/files.ts`, `tools/normalise.ts`, `tools/structure.ts`), each assuming one block, and two refused a second block or any prose before the first. A piece that explains itself as it goes (a heading, a paragraph, then the lines it explains) could not be written.

## Decision

1. **The code of a file is its cells blocks joined with a newline, in file order.** Everything else is prose and is ignored by the language: headings, paragraphs, and fences of other languages (` ```text `, ` ```markdown `; a ```` ```cells ```` line inside one is no block). This is the default format of a piece and a fragment file.
2. **The join is concatenation, not a union.** A line two blocks both give is two lines. Union (047) is how *fragments* combine; the blocks of one file are one text.
3. **A file with no fence and no frontmatter is raw cells text**, a valid shorthand: all of it is code, as a `.cells` file or pasted text is. A raw text and the same text in one fence read the same. A file with frontmatter and no cells block is a piece with no code: a diagnostic naming the line, not a crash. A file with cells blocks and no frontmatter is a literate piece whose frontmatter is empty: the blocks are the code, the rest prose, and it is written back without one (amended by [#212](https://github.com/yggi/cells/issues/212): the blocks say what the code is).
4. **One reader** (`src/engine/literate.ts`): it returns the code, a **map from each code line to its block and its line in the file** (`fileLine` turns a diagnostic's line into the file's), the prose after the last block, and a layout (the blocks' lines and everything between them, kept byte for byte). `readPiece`, `readFragment`, Normalise and `npm run structure` read through it.
5. **Writers put a rewritten code back into the blocks it came from** (`rewrite`). A line a rewrite keeps stays in its block, found by a longest common subsequence; a line removed is gone, and a block left empty keeps its fences. A line added goes into the block it is nearest to: where lines were removed, the block of the first of them (a line changed stays where it was); between two kept lines, the block of the one before (the earlier block where they lie in two); at the start of the code, the first block. A layout of one block takes the code whole; a middle of more than 2,000 × 2,000 lines is one change (none of it kept). Prose, fences and frontmatter are never touched by a rewrite of the code.
6. **Frontmatter is unchanged** (047 §6): the index entry and the metadata. The card's `label=` moving to `description` there is #196, the examples pass.
7. **A docs page stays a page of samples, not a piece.** `src/docs.test.ts` compiles each ```` ```cells ```` block of `docs/language/*.md` on its own; it does not join them.

## Consequences

- No snapshot moves: every example and fragment is one block and reads and writes back as before.
- `PieceFile` and `FragmentFile` gain `map` (piece) and `layout`, optional: a file that was read carries them, a file made new has none and is written with one block. A frontend that reads a piece, changes `text` and writes it keeps the prose between the blocks.
- Open (owner): whether a prose paragraph can name cells (`&kick`) as a note's `about=` does (#196).
