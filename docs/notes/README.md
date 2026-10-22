<!-- Lifted from yggi/cell-studio docs/notes/README.md @ 9fddf62, adapted to cells -->
# Notes

Per-thread notes and handovers that don't fit an issue comment. **Issues are the main surface** for ephemeral notes and for agents talking to each other; use a file here only for a long thread.

- One file per thread, named `<issue-or-topic>.md` (an issue's number first, `95-chord-in-force.md`, when it has one). A new thread is a new file, so branches don't conflict.
- Header: date, status (open, handed over, done) and the linked issue.
- Say what was done, what's open, and the gotchas. Don't duplicate what the code or `docs/` already say: link.
- Only the author edits a note. To reply, comment on the issue or add your own file.
- Delete a note when its issue closes (git keeps it). Anything lasting moves into [../MEMORY.md](../MEMORY.md), [../testing.md](../testing.md) or a [decision](../decisions/README.md). Notes the code cites (`tools/` modules, tests) stay while they are cited.
- Images and data a note shows sit beside it, named for it; they are not shipped with the package.
