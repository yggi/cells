# Changes not yet released

A pull request that a reader of [CHANGELOG.md](../CHANGELOG.md) would notice adds one file here, `changes/<issue-number-or-short-slug>.md`, in place of a line under *Unreleased*: a new file never conflicts with another pull request's.
Its first line is the section's heading as the changelog writes it: `### Added`, `### Changed`, `### Removed`, `### Fixed` or `### Repository`.
Then comes the entry, one or more bullets, written exactly as it will read in the changelog; an entry that adds and changes holds both sections, each heading followed by its bullets, and a release files each under its own.
`npm run changelog -- check` checks every entry (it runs in `npm run verify` and `npm run verify:docs`), and a release gathers them under its heading and deletes them (`npm run changelog -- gather vX.Y.Z`).
This file is not an entry.
