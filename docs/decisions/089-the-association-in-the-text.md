# 089 · A fragment's association is written in its text: its declaration line's `style=( … | … )`

**Date:** 2026-11-13 · **Status:** accepted (the owner on [docs/notes/405-association-in-the-text.md](../notes/405-association-in-the-text.md)'s questions: 2026-10-31, and 2026-11-13 on #436) · Issues: #436, #405, #540, yggi/cell-studio#621

*Read with [041](041-fragments-by-style.md) (fragments found by style), [046](046-facets-and-co-use.md) (facets), [048](048-the-learned-layer.md) (the learned layer), [050](050-the-equalities.md) (the hash), [063](063-the-score-and-the-band.md) §3 (`style=` on any cell), [065](065-fragments-take-arguments.md) (signatures) and [079](079-a-sum-of-cells-and-a-window.md) (centre ± reach).*

## Context

A fragment's association, the weighted points in style space where the repository finds it, lives in its file's frontmatter (`association:`), beside its text rather than in it. The owner on #405: "we can get rid of the duplicate frontmatter, if we can cleanly derive it from the code, just like the signature of a fragment". The note's probe showed where it can't go: on a head line, a copy takes it into a piece (a piece that takes `dorian` would claim dorian's place as its own key's style). A line a copy never takes doesn't travel, and the signature is one.

## Decision

1. **A fragment's declaration line holds its association.** For a template, that is its signature (`&key from &tonic style=&funk`). For a collection, which has none, it is a new line, `* from` with no id: "everything here, from this fragment". It compiles to nothing, and a copy, a named take (`&bd from gm_kit`) and `* from x` never take it. The repository derives the association from the text (`associationOf`), as it derives a signature, and the compile never reads a declaration's `style=`: no style comes into a piece from one.
2. **The spelling is `style=`, a cell's own attribute for where it belongs in style space** (063):
   - **a point** is a style of `styles` by name (`&funk`), or inline, as a style is written anywhere (`&(map=style sync=.3 harm=.45 bite=.55 mood=.5)`, by name or in order);
   - **`* w` is its weight**, 1 where left out (`&(map=style …) * .5`);
   - **`( a | b | … )` is a set, found at each** (`style=(&deepHouse | &funk * .4)`). The parentheses keep it apart from a mix (`[ ]`, one point between) and a range (`a..b`, one point moving); `|` reads as Strudel's "one of these".
3. **The facet is the fragment's folder's** (`fragments/modes/` is `mode`). `facet=` is written only where it differs, and a fragment of two facets has one declaration line for each.
4. **A template's arguments at a point** (#387: `diatonic(mode=dorian)` found at Deep house's point) are written as its signature's optional parameters on a declaration line of their own: `&key from (&mode) &tonic style=(&deepHouse | &swingJazz) mode=dorian`. One line per set of arguments.
5. **A fragment of no style** (a module, an expression; #540, the owner, 2026-11-13) has a declaration with no `style=`. The repository finds it at `ANY_DISTANCE` from every style (#765).
6. **A point's reach per axis is written in 079's spelling, centre ± reach, and read by no query yet:** `&(map=style sync=.3 bite=.55 ± .1)`. It is the point's certainty on that axis (yggi/cell-studio#621, rung C6). The derived association keeps it, and whether a query reads it, and how a missing axis counts, is #644's question, ruled apart (yggi/cell-studio#621: not in that epic).
7. **A cell may carry a set too** (the owner, 2026-11-13), as its association or wish (063 §3). Reading one value from a set is an error that says why: a pick (`&x[bite]`: "a set has no one value: pick from one of its styles") and the section's style (`&style style=( … | … )`: one point).
8. **The hash first** (the owner, 2026-11-13). `e2:` is built in its own pull request before the associations move: it is the fragment as a piece receives it. That is its body normalised (E3), its private names numbered in declaration order, its interface kept by name (a collection's cells, a template's optional parameters and heads, the names it reads), and its declaration lines left out. Moving the associations into the text then warns no saved piece; changing a sound, a kit's drum or a keyword still does. The examples' recorded `e1:` hashes and the learned layer's `sameText` move to it once.
9. **The order** (#436): this decision; `e2:`; then one pull request that moves every seed's association into its text, with a test that each derived association equals today's frontmatter, every repository query in the tests returning the same fragments in the same order, and 0 event snapshots moved. The frontmatter keeps `id`, `source`, `lifted` and the rest of its metadata; `association:` goes. A file with `association:` still reads for a release, as `use` did (065), and Normalise moves it.

## Why

- **One source:** what the repository reads is in the text a person reads and edits, beside the signature it extends. Nothing has to be kept in step.
- **A line a copy never takes:** the probe's failures (a copy claiming a fragment's place, a filed piece inheriting the library's claim) cannot happen.
- **One attribute for "where in style space":** `style=` already says it on any cell (063). A set is the one new form, and the two errors are where a set would be read as one point. `at=` is the read head's; a fresh word would split 063's one idea into two attributes.
- **The hash before the move:** otherwise every seed's `e1:` changes with no change to what a piece gets, and every saved piece's lockfile warns once for nothing.

## Consequences

- **Frontends read `fragment.association` as they do now**, derived. A declaration line starts `* from` or is a signature, so it is no voice's line, and a prefix match (`&leadV `) skips it. Cell studio's library and a person's own fragment files write the declaration; the frontmatter's `association:` reads for a release.
- **Shorten's measure (049)** counts a declaration as free, as a signature is: it says where a fragment is found, not what it plays.
- **Normalise** writes a declaration in one spelling: named styles where a point is one, `* w` only where w isn't 1, `facet=` only where it differs from the folder.
- **The learned layer (048) is unchanged:** the text holds the seed's own claim, and the layer holds what use learned. A use never rewrites a text.
