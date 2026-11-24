# 106 · One identity: a cell's, and a fragment's the hash of its cells'

**Date:** 2026-11-24 · **Status:** accepted (the owner on #945, 2026-11-24: "Cell-level hash, with an extension to fragment-level hash possible … the fragment level hashes as hash of the Cell-Level hashes"; "tags are excluded, move the test to hash equality, 3 is fine") · Issues: #945, #49

*Read with [050](050-the-equalities.md) (E0–E5, S1–S3; this builds E4's reading), [075](075-a-name-is-only-a-name.md), [077](077-the-core-is-sound-up-to-an-interface.md) (a hash of the core says what plays, up to an interface), [089](089-the-association-in-the-text.md) §8 (`e2:`) and [098](098-a-seed-the-cell-writes.md) (amended with it).*

## Context

Three identities coexisted: `e2:` (a lockfile's, text with private names numbered, metadata and line order counted), `canonicalText`/`sameText` (the learned layer's, every name numbered), and a cell's draw key (what it plays, no names). Two lists of attributes "no listener hears" disagreed. A seed pinned what the identity moved with.

## Decision

1. **A cell's identity** is what it plays and is heard as: its code with every name it reads replaced by that cell's identity in turn, and no `label=` `show=` `size=` `about=` `tags=` `part=` `role=` (one list, `NOT_HEARD`; a `map=role` cell's own `part=` is its interface). Its draws and a noise voice's grains are thrown from it (098 amended). A change to what is heard changes it.
2. **A fragment's hash is `e3:`**: the hash of its lines read so (the cells' identities in place of their names), sorted, so line order (L19), names, metadata and association (089) are no part of it. A template's private cells are identities; its signature's heads and parameters, a collection's cells and the names it reads and doesn't define stay by name (077 §2).
3. **`e1:` and `e2:` still check** as they were: a lock that checks stays as recorded (no warning, no rewrite); a new lock is `e3:`.
4. **The repository's "same fragment" is `e3:` equality** (`sameText`; the rename it returns pairs the cells by identity). A kit's cells are named by pieces, so a kit renamed is another fragment, in the lockfile; the learned layer files a text of no signature with its names free (`identityOf(text, 'free')`), as it did.
5. `canonicalText` stays E2's (`identity.ts`), a text's names numbered; E4, a text's, is this identity.

## Consequences

- No event moves (snapshot). The fit's ids are still named from `e2:` (a cache key, not an identity).
- A fragment whose only change is a label, tags, a role, a part or the order of its lines re-warns no locked piece.
- Not done: the piece's identity (a hash of its cells' identities), E5.
