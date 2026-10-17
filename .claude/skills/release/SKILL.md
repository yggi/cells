---
name: release
description: Release the cells language as a tag, and move the frontends' pins to it. Verifies main, gathers CHANGELOG.md's Unreleased under the new version, bumps package.json, opens that as a pull request, has the owner create the tag, then opens the pin-move pull requests in yggi/cell-studio and yggi/jambot, each with its checks. Use when asked to release, tag, cut a version, or move a frontend to a new cells version.
---

# Release cells, and move the pins

A release is a tag, `vX.Y.Z`, and the frontends install exactly that tag: `github:yggi/cells#vX.Y.Z` (`AGENTS.md`, `CHANGELOG.md`).
This is what was done by hand for `v0.1.0` and the two pins on it (yggi/cell-studio#411, yggi/jambot#312), in order.
Stop at the first step that fails, and say so on the release's issue.

## 0. The release's issue

Open one issue in yggi/cells, `Release vX.Y.Z`, labelled `epic`, with this checklist; every pull request below is named in it as it opens:

- [ ] `main` verified at `<commit>` (`npm run verify`, `npm run test:all`)
- [ ] the release pull request (changelog and version)
- [ ] the tag, created by the owner
- [ ] yggi/cell-studio: the pin moved
- [ ] yggi/jambot: the pin moved

## 1. Verify `main`

In a worktree of `origin/main` (a fresh one installs first), in your scratchpad:

```sh
S=<your scratchpad>
git fetch -q origin +main:refs/remotes/origin/main
git worktree add --detach "$S/cells-release" origin/main && cd "$S/cells-release"
npm ci --no-audit --no-fund && npm run verify && npm run test:all
```

`verify` holds what a frontend reads: the generated `types/` and `src/engine/examples.generated.ts` are fresh, the examples compile, the event snapshot (`src/engine/snapshot.txt`) and the contracts' vectors hold.
`test:all` adds the slow tests (the folder over whole pieces and the MIDI library, about two minutes), which run before a release and nowhere else on their own.
Name the commit and both test counts on the issue.

## 2. The version

Read *Unreleased* in `CHANGELOG.md` and choose by semver:

- **Before 1.0:** a minor (`0.1.0` → `0.2.0`) when an entry breaks a piece (it names a migration) or a frontend's typecheck (an exported signature changed); a patch (`0.1.0` → `0.1.1`) otherwise.
- **From 1.0:** a major for a break, a minor for something added, a patch for a fix.

An entry that breaks a piece and names no migration is not ready: say so on the issue and stop.

## 3. The release pull request

On a branch from `origin/main`, one commit:

- `CHANGELOG.md`: a heading `## vX.Y.Z — <date>` under `## Unreleased`, the entries moved beneath it, and *Unreleased* left empty (a line saying nothing has changed since).
- `package.json` and `package-lock.json`: `"version": "X.Y.Z"` (`npm version X.Y.Z --no-git-tag-version` writes both and tags nothing).
  `src/docs.test.ts` fails when the changelog has no heading for that version.
- `README.md`: the pin it shows, `github:yggi/cells#vX.Y.Z` (`src/docs.test.ts` fails when it names another version).
- Then `npm run reference`: it leaves the reference and the README's index of forms as the parser has them at this version (a clean `git status` when nothing moved since the last PR).

`npm run verify`, push, and open the pull request from the template, `Part of #<the release's issue>`, saying the version and why (the entries that decided it).
Agents don't merge.

## 4. The tag: the owner creates it

After the release pull request is merged, **the owner creates the tag**, on the merge commit:

```sh
git fetch origin main && git tag -a vX.Y.Z origin/main -m 'vX.Y.Z' && git push origin vX.Y.Z
```

or GitHub's *Releases → Draft a new release*, with the tag `vX.Y.Z` on `main`.
A session can't: its git proxy refuses to push a tag, and creating one through the API is the same outward-facing act.
Ask on the issue, with the merge commit, and wait.
Check it before going on: `git ls-remote --tags origin vX.Y.Z` names the merge commit.

## 5. The pin-move pull requests

One in each frontend, on its own branch from its `main`, under its own rules (its `AGENTS.md`), `Part of yggi/cells#<the release's issue>`.
Each reads cells' `CHANGELOG.md` from its old tag to the new one, and does the migrations it names.

**yggi/cell-studio** (npm):

```sh
npm install github:yggi/cells#vX.Y.Z      # package.json and package-lock.json
npm run verify
npm run build && CHROME_PATH=/opt/pw-browsers/chromium npm run smoke    # every piece started, the covering set played
```

Move the tag where its docs name it (`AGENTS.md`, `docs/MEMORY.md`), and add a line under *Unreleased* in its `CHANGELOG.md`.
The smoke test is the one check that builds the audio of every kind of voice, so a pin move runs it in full and says so in the pull request.

**yggi/jambot** (pnpm; cells is a dependency of `packages/score`):

```sh
pnpm --filter @jambot/score add github:yggi/cells#vX.Y.Z   # its package.json and pnpm-lock.yaml
pnpm verify
pnpm e2e    # when the release changes what a piece plays (the changelog says)
```

Move the tag where its docs name it (`docs/memory/score-language.md`, `docs/memory/cell-studio.md`).

A session needs both repositories attached to push; if one isn't, say so on the issue and leave that pin to a session that has it.
Tick the issue's boxes as each pull request opens, and close it when both are merged.

## Pitfalls

- A branch or a commit is not a release: a frontend never pins `#main`.
- A session whose package manager can't reach GitHub over HTTPS falls back to SSH and fails without a key; cells is public, so the proxy serves it (yggi/music-commons#4).
- The tag is cut from `main` after the release pull request, never from the branch: the commit a frontend installs is the one `main` verified.
