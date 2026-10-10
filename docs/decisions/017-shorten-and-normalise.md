# 017 · Two tools: Shorten suggests, Normalise converges

**Date:** 2026-10-10 · **Status:** accepted (owner, #234)

## Context

The language has, and will keep having, several ways to write one thing: a tap with no line, a bare line (`&hookBar off`) or a stepped one; a chord of products straight into the sound card or named mixes; a melody written twice or a motif with a player per part; `scale(major)` or `scan(2 2 1 2 2 2 1)`. Shorten began as one job, *shorter*, measured by length and promising the same notes. With [decision 016](016-arranging-at-the-input.md) it took a second one, *migrating* a removed form, which can make a piece longer and has to rewrite every old piece. A third job was waiting: *normalising*, choosing one spelling of each duplicate. It serves the examples, a corpus, and the round trip (a piece → its sound → a piece again, which needs a normal form to land on). It is the job most likely to fight an author, because a name, a split, a label or a longer spelling is often what the author means, and the notes don't show it.

## Decision

- **Shorten suggests, on the piece being written.** It offers what is shorter (as before) and migrations (a form the language removed, rewritten to play the same notes), each labelled as what it is. It never restyles a piece into a house spelling.
- **Normalise converges, as a command of its own.** It applies the canonical spelling of each duplicate in bulk: to the examples, a corpus, the round trip. It is never offered while a piece is being written. Its canonical spellings are listed in one place, each with its reason, so "one way" is decided once per duplicate, not rule by rule.
- **Migrations belong to both:** Shorten offers them, and Normalise applies them.
- **The editor writes the plainest form** where it writes something new (a tap's `off` as a bare line: decision 016, #243), so that what it writes is already normal.

## Why

The owner's choice among four, weighed against each other:
- **Length only:** duplicates pile up, and the round trip has nothing to land on.
- **One class with an intent test:** it keeps nagging an author and has to guess what counts as intent.
- **An aggressive normal form, as Prettier does for whitespace:** it overrides authors' structure and names, and every canonical choice becomes contested.

Two tools keep the author's piece theirs and still let the corpus converge.

## Consequences

- Shorten's suggestions carry their kind (`Suggestion.kind`). A migration is shown as "a rewrite, the same notes", not as characters saved (`shorten/arrange.ts`, the first).
- Normalise isn't built yet: when it is, it gets its list of canonical spellings (`docs/language/`) and a check that the examples are normal.
- A duplicate that Normalise always rewrites is a candidate to remove from the language. Removing it is a decision of its own, which brings a migration.
