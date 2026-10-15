---
name: review
description: Review a cells pull request. Fetches it into its own worktree, installs, runs `npm run verify` there (and the slow tests when it reaches them), re-runs the pull request's own claims, and walks cells' rules (purity, the event snapshots, the contracts, the changelog, the escalation ladder) before posting one review with inline comments. Use when asked to review a pull request by number or branch, or to check that a branch is ready to merge.
---

# Review a pull request

Lifted from yggi/jambot `.claude/skills/review-pr/SKILL.md` @ ef79048, for cells' rules.
Cell studio's `senior` and Jambot's `review-pr` stay their repositories' own.

## 1. Prepare

```sh
.claude/skills/review/prepare.sh <number | branch> [--from <commit>] [--against <number | branch>] [worktree directory]
```

If your checkout doesn't have the script, your branch is behind `main`; run `main`'s copy instead:

```sh
git fetch -q origin +main:refs/remotes/origin/main
git show origin/main:.claude/skills/review/prepare.sh | sh -s -- <number | branch> …
```

It fetches the pull request and `main`, checks the head out in its own worktree (put it in your scratchpad: the last argument), runs `npm ci` and `npm run verify` there, and `npm run test:slow` when the pull request touches what the slow tests read (`src/engine/fold/`, `midiimport`, `midi/`), and prints:

- the commits and every changed file;
- each result with its test count;
- `Ladder:` for a change on the escalation ladder's last rung (AGENTS.md, "Stop, push back, recommend"): the event snapshot (`src/engine/snapshot.txt`, what a piece plays), the hub's contract vectors (`fixtures/contracts/`), the purity gate (`tsconfig.pure.json`, `src/host.d.ts`), the declarations a frontend typechecks against (`types/`); `Ratchet:` for a folder's ratchet recorded anew;
- `Changelog:` when `src/` changes beyond its tests and `CHANGELOG.md` doesn't;
- when `main` has moved on since the pull request branched, how far, and the files a merge would conflict in; with `--against`, the files it conflicts in with another pull request: say so in the review (both reviews, for `--against`);
- when a check fails, vitest's block of failed tests, or the end of the output where there is none;
- the commands to read the diff, to probe the language under Node, and to remove the worktree.

Several reviews started at once run one at a time (each waits for the one before and says so on stderr): in parallel, the load times out timing-sensitive tests, and a fetch fails on a worktree another review is still adding.
`--from <commit>` reviews part of a pull request, such as the steps after an earlier review: the commits and the diff are what it did after `<commit>`, without what came in from `main`, while verify still runs on the whole head.

Read the diff from git (the `Diff:` line), not from the GitHub files API, which returns every patch as one JSON blob.

CI is a witness, and may not have run (AGENTS.md): this verify run is the check that counts.
Say in the review which commit you verified and what verify (and the slow tests) gave.

## 2. Re-run the pull request's own claims

Read the pull request's body and `AGENTS.md` first.
Every claim in *Verified* and *What and why* that a command can check, check in the worktree:

- **The count.** The hook's `verify passed, N tests` should match this run's count on that commit, or the difference has a reason (tests added since).
- **"Shown firing."** A new or changed check has a test that shows it failing; undo the change in the worktree (`git -C <wt> show <base>:<file> > <file>`) and run that test: it must fail. Restore with `git -C <wt> checkout -- <file>`.
- **"Nothing sounds different."** `npx vitest run src/engine/snapshot.test.ts` passes unchanged, and `src/engine/snapshot.txt` isn't in the diff. A moved line names the piece; the pull request must name it too.
- **A measured number** (a ratchet's score, a size, a time): run what measured it and compare.

## 3. Read against cells' rules

For each change:

- **Pure.** `src/` uses no host type beyond the three globals in `src/host.d.ts`; the purity typecheck sees a type, not a value smuggled through `any` or `globalThis`. Nothing in `src/` imports a frontend.
- **The text is the single source of truth.** A change to what the language means says so, keeps the examples sounding the same unless the change is the point, and was asked about first. An event snapshot that moves is the ladder's last rung: stop and ask the owner on the issue, not in the review alone.
- **The contracts.** A vector of the hub's (`fixtures/contracts/`, yggi/music-commons) cells would stop meeting is a handshake with every implementer, not a test to update.
- **The changelog.** A change a frontend would notice adds a line under *Unreleased*; one that breaks a piece names its migration (Shorten writes migrations) and makes the next release a minor (`release` skill).
- **The ladder.** Something out of scope belongs in an issue, not the pull request; a fix beside the change it needs is said in the pull request.
- **Generated files** (`types/`, `src/engine/examples.generated.ts`, `docs/language/reference.md`) are regenerated, not edited: their staleness tests say so.
- **The laws.** Meaningful tests (every check shown firing, finite cases tested over every case), true names, generalization (a more general form covering the new case and an old one), the same forms at every level (yggi/music-commons `PRACTICES.md`).
- **Lifted code** names where from (`Lifted from yggi/<repo> <path> @ <commit>`).
- **Docs describe the present**, and `docs/MEMORY.md`, `docs/INDEX.md` and a decision's line move in the same pull request.

Don't stop at reading: probe.
The `Probe:` line runs the language from the worktree's source under Node (`tools/node-ts.mjs`), with `notes(text, seconds)` already in hand: what a piece plays, as the snapshot reads it (voice, onset, length, frequency).
Try the input you think breaks the change, and compare against `main`'s checkout.
A longer probe goes in a file in the scratchpad.
Where the change is heard, the `pianoroll` skill draws before and after.
A finding with a measured number beats one without.

## 4. Post

Post one review: create a pending review, add an inline comment per finding on the line it is about, then submit it with a summary.
Use `COMMENT` unless asked to approve or request changes. Put the substantive findings first.

Trivial nits (a stray space, a typo, a stale one-line reference) get no comment: fix them in the worktree and push if you may, or leave them (AGENTS.md, "Just do, no comment").
Reserve comments for findings that need a decision or a real change.

End every comment with the Claude Code footer.
Then report: the verdict, the findings in order of weight, and any friction in the workflow itself, with a concrete fix for each.

## 5. Clean up

Run the `Done:` line that `prepare.sh` printed.
