# Agents

The cells language as a package: a minimal music language where everything is a cell, on top of Strudel's mini-notation; text in, events out, with no host of its own. Its frontends are [Cell studio](https://github.com/yggi/cell-studio) (the workbench) and [Jambot](https://github.com/yggi/jambot) (the interactive, multi-user frontend), each consuming a tag of this repository. **Start with [docs/MEMORY.md](docs/MEMORY.md)**; [docs/INDEX.md](docs/INDEX.md) lists every page. The family of music projects and its rules: [yggi/music-commons](https://github.com/yggi/music-commons).

## Tools

- `npm run verify`: everything a push needs: `check` (the purity gate and the full typecheck), `lint`, `format:check`, `knip`, and the quick tests. A pre-push hook runs it (`.githooks/pre-push`; the first `npm run verify` in a clone points git at it, and so does the session-start hook: a `prepare` script would break a frontend's install, `tools/hooks.test.ts`) and blocks a push that fails, or one with an untracked file that verify would see and the commit lacks, keeping its whole output in the git directory (`cells-verify-failed.log`); a run that passes, by hand or in the hook, stamps its tree there (`tools/verified.sh`), so the push of that tree doesn't run it again, and the hook prints the count of tests that passed. Never bypass it with `--no-verify`.
- `npm run test:all`: the quick and the slow tests (the folder over whole pieces and the MIDI library, about two minutes). Run it when you touch `src/engine/fold/`, `midiimport`, or anything the slow tests read.
- `npm run examples`: rewrites `src/engine/examples.generated.ts` from `examples/*.cells`; a test fails when it is stale.
- `npm run types`: rewrites `types/` (the declarations a frontend typechecks against, through the `types` condition of `exports`) from `src/`; a test fails when it is stale. Run it with any change to an exported signature.
- Skills (`.claude/skills/`): `release` (verify `main`, the changelog and version, the owner's tag, the frontends' pins moved), `review` (a pull request in its own worktree, verified, its claims re-run, one review), `pianoroll` (what a text plays as a picture, before and after a change). `node --experimental-transform-types --import ./tools/node-ts.mjs` runs the source under Node.
- One file while iterating: `npx vitest run src/engine/parser/parser.test.ts`.

## Rules

Enforced (a failing check says so):
- **Pure.** `src/` typechecks with no host types at all (`tsconfig.pure.json`: no DOM, no Node, no bundler); the host globals it may use are the three in `src/host.d.ts`. Nothing here imports a frontend.
- Docs' ```` ```cells ```` blocks compile, `docs/INDEX.md` lists every page, relative links resolve, every decision is in `docs/MEMORY.md`'s list.
- Every example compiles with no diagnostics, a title, tags from the vocabulary, and its card.
- The folder's ratchets: no fold taken is lost, a set's score doesn't grow by more than 1 % (`src/engine/fold/ratchet.*.json`).
- Prettier owns whitespace; ESLint has no errors; knip finds no unused files or dependencies.

Judgment (nothing checks these; you do):
- **The text is the single source of truth.** A change to what the language means changes how the frontends' pieces sound: say so, and keep the examples sounding the same (the event snapshots) unless the change is the point.
- **A release is a tag.** Frontends depend on `github:yggi/cells#vX.Y.Z`, never a branch, and read [CHANGELOG.md](CHANGELOG.md) before they move it: a change a frontend would notice adds a line under *Unreleased*, and one that breaks a piece names its migration there (Shorten writes migrations). That is a minor version before 1.0, and the frontends' issues say what to migrate.
- A decision with a rationale gets `docs/decisions/NNN-slug.md` (the next number after the highest here or in Cell studio's list) and a line in `docs/MEMORY.md`.
- Code lifted from a sibling says where from (`Lifted from yggi/<repo> <path> @ <commit>`).

## Working

- Work on the branch the session gives you; never push to `main`; **agents don't merge**. Open a pull request from the template (`Closes #n`, or `Part of #n` for one rung of an epic; what and why, the commit verified, follow-ups); keep it a draft while it moves, out of draft when it is ready.
- **Just do, no comment:** typos, nits, a local rename, an added test, fixing a check you broke. **Do and say in the pull request:** a fix beside your change that it needs. **File an issue instead of widening it:** anything out of scope you notice. **Stop, push back, recommend:** anything that changes how a piece sounds or what it means (an event snapshot that moves, a form removed or respelled), a vector of the hub's contracts cells would stop meeting, a change to purity or to the source-of-truth rule, anything that could break a frontend at its next pin (its install, its typecheck), a scope far beyond the issue, anything irreversible or outward-facing (a tag). Lifted from yggi/cell-studio AGENTS.md @ 6de7ce4.
- An issue meant for an agent states each bound as a number (a size, a count, a time), or says "choose it and name it".
- A tool's module and its test live side by side in `tools/` (`tools/<name>.ts`, `tools/<name>.test.ts`); the language's tests sit beside its code in `src/`.
- **CI is a witness, not the gate:** the workflow runs one job, only on pull requests out of draft, and the slow tests only by hand. The gate is `npm run verify` before the push, which costs no Actions minutes. Say in the pull request which commit you verified.
