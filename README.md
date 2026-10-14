# cells

The cells language: a minimal language for music where everything is a cell, a helix with a braid in its grid, on top of Strudel's mini-notation. Text in, events out: `compileSource` reads a piece, `plan` and `windowAt` realize it a window at a time, `createHost` does the same as messages, in a worker or in node.

It is the shared core of [Cell studio](https://github.com/yggi/cell-studio), the workbench, and [Jambot](https://github.com/yggi/jambot), the interactive, multi-user frontend, which depend on a tag:

```json
"@yggi/cells": "github:yggi/cells#v0.1.0"
```

Start with [docs/MEMORY.md](docs/MEMORY.md) and the [language overview](docs/language/overview.md). It came out of Cell studio with its history ([#1](https://github.com/yggi/cells/issues/1)). MIT.
