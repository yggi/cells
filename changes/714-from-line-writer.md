### Added

- **A `from` line written, and the lockfile of a plain text** (#714), so a frontend can write what it took as a `from` line and send the fragments a score takes (yggi/jambot#531, #553):
  - `fromLine(reference)`, the inverse of `references`: `fromLine({ names: ['&bassline'], id: 'funk_bass', main: '&harm' })` is `&bassline from funk_bass &harm`. Every `from` line of every example and seed file reads back as it was written.
  - `Reference` gains `takes` (what each name takes, `&bd` of `&kick=bd`) and `head` (the head's attributes), so a renamed or labelled line is read whole.
  - `textLockfile(text, resolve)`: the id and hash each `from` line of a text resolves to, a piece file's lockfile without the file (`withLockfile` writes the same entries into the frontmatter).
  - `lockChanges(text, locked, resolve)`: each entry of a lockfile that a text's `from` lines now resolve to another hash, or to nothing.
  - Nothing played changes.
