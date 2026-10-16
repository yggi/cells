---
name: Bug
about: A piece that parses, compiles, plays or folds wrongly, or a check that does
labels: bug
---

<!-- Lifted from yggi/cells .github/ISSUE_TEMPLATE/bug.md @ e35c6ee, consolidated 2026-10-16 (yggi/music-commons#4). A frontend's own bug goes to its repository; this one is for what cells does with a text. -->

## What happens

<!-- What you saw: the diagnostics, the events, a failing check. -->

## What should happen

<!-- And what says so: a language page in docs/language/, a decision, an example, a contract's vector. Say whether the fix would move an event snapshot (src/engine/snapshot.txt): a fix that changes how a piece sounds is a recommendation first (AGENTS.md). -->

## To reproduce

<!-- The smallest piece that shows it, and the call (`compileSource`, `plan`, `windowAt`, `shorten`, `fold`) or the command (`npx vitest run …`), or a failing test. -->

## Commit

<!-- The commit or tag it was seen at (`git rev-parse --short HEAD`, or a frontend's pin `#vX.Y.Z`). -->
