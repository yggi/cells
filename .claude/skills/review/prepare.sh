#!/bin/sh
# Prepares a pull request for review: fetches it and main, checks it out in its own worktree, installs, runs
# `npm run verify` there, and the slow tests too when it touches what they read, and prints a summary: the commits,
# every changed file, the results with their test counts, the files on cells' escalation ladder it changes, whether
# CHANGELOG.md moved with `src/`, and whether main has moved on since the pull request branched, with the files a merge
# would conflict in. When a check fails, it shows the failing tests, or the end of the output where there are none. The
# worktree stays for reading and probing; the summary says how to probe it and how to remove it.
#
# CI's run is the witness when it has one: when the `ci` workflow's `verify` and `slow` jobs both passed on the head
# commit (a pull request out of draft runs them on its merge with main), verify and the slow tests are not run again
# here, only the install, for the probes and the break-its. --verify runs them anyway.
#
# Usage:
#   prepare.sh <pull request number | branch> [--from <commit>] [--against <pull request number | branch>] [--verify] [worktree directory]
# --from scopes the commits and the diff to what the pull request did after <commit>, leaving out what came in from
# main, to review part of a pull request. Verify still runs on the whole head.
# --against names the files the pull request conflicts in with another one, for two reviewed side by side.
#
# Reviews prepared at the same time run one at a time: in parallel, the load times out timing-sensitive tests, and a
# fetch fails on a worktree another review is still adding.
#
# A checkout without this script (a branch behind main) can run main's copy:
#   git show origin/main:.claude/skills/review/prepare.sh | sh -s -- <args>
# CELLS_REVIEW_VERIFY replaces install and verify, CELLS_REVIEW_SLOW the slow tests, CELLS_REVIEW_INSTALL the install
# alone, and CELLS_REVIEW_CI the lookup of CI's check runs on the commit (its first argument; it prints GitHub's JSON),
# for tools/review.test.ts.
#
# Lifted from yggi/jambot .claude/skills/review-pr/prepare.sh @ ef79048 (adapted: npm, the slow tests in place of the
# end-to-end ones, the ladder's files and the changelog, a probe of the language under Node).
set -u
usage='usage: prepare.sh <pull request number | branch> [--from <commit>] [--against <pull request number | branch>] [--verify] [worktree directory]'
target=${1:?$usage}
shift
from=''
against=''
force=''
while :; do
  case ${1:-} in
    --from) from=${2:?$usage} ;;
    --against) against=${2:?$usage} ;;
    --verify)
      force=1
      shift
      continue
      ;;
    *) break ;;
  esac
  shift 2
done
repo=$(git rev-parse --show-toplevel) || exit 1
cd "$repo" || exit 1

# The source to fetch for a pull request number or a branch, and the ref to fetch it into.
source_of() {
  case $1 in
    *[!0-9]*) echo "$1" ;;
    *) echo "pull/$1/head" ;;
  esac
}
ref_of() {
  case $1 in
    *[!0-9]*) echo "refs/remotes/origin/$1" ;;
    *) echo "refs/remotes/origin/pr/$1" ;;
  esac
}
source=$(source_of "$target")
ref=$(ref_of "$target")
case $target in
  *[!0-9]*) name=$(printf %s "$target" | tr / -) ;;
  *) name="pr-$target" ;;
esac
dir=${1:-${TMPDIR:-/tmp}/cells-review-$name}

# One review at a time, in this repository and its worktrees: its fetch, checkout and checks. A fetch walks every
# worktree's HEAD, so it fails on one another review is still adding. The lock holds the pid of its review, so one left
# by a review that died is taken over.
lock="$(git rev-parse --git-common-dir)/review.lock"
case $lock in /*) ;; *) lock="$repo/$lock" ;; esac
waited=''
until mkdir "$lock" 2>/dev/null; do
  holder=$(cat "$lock/pid" 2>/dev/null)
  if [ -n "$holder" ] && ! kill -0 "$holder" 2>/dev/null; then
    rm -rf "$lock"
    continue
  fi
  if [ -z "$waited" ]; then
    echo "prepare: waiting for another review${holder:+ (pid $holder)}" >&2
    waited=1
  fi
  sleep 1
done
echo $$ >"$lock/pid"
trap 'rm -rf "$lock"' EXIT
trap 'exit 1' INT TERM

refspecs="+main:refs/remotes/origin/main +$source:$ref"
[ -n "$against" ] && refspecs="$refspecs +$(source_of "$against"):$(ref_of "$against")"
# shellcheck disable=SC2086
git fetch -q origin $refspecs || {
  echo "prepare: could not fetch $source${against:+ or $(source_of "$against")} or main" >&2
  exit 1
}
if [ -e "$dir" ]; then
  git -C "$dir" checkout -q --detach "$ref" || exit 1
else
  git worktree add -q --detach "$dir" "$ref" || exit 1
fi

log="$dir.verify.log"
cd "$dir" || exit 1
base=$(git merge-base origin/main HEAD)

# CI's witness: the address of the `verify` run when the latest `verify` and `slow` check runs on this commit both
# passed; nothing when either is missing, running or red, or GitHub can't be asked.
witness() {
  sh -c "${CELLS_REVIEW_CI:-curl -fsS --max-time 20 -H 'Accept: application/vnd.github+json' \"https://api.github.com/repos/yggi/cells/commits/\$1/check-runs?per_page=100\"}" - "$1" 2>/dev/null |
    node -e '
      let text = "";
      process.stdin.on("data", (chunk) => (text += chunk)).on("end", () => {
        let runs;
        try { runs = JSON.parse(text).check_runs ?? []; } catch { return; }
        const last = (name) => runs.filter((r) => r.name === name).sort((a, b) => b.id - a.id)[0];
        const jobs = ["verify", "slow"].map(last);
        if (jobs.every((r) => r && r.status === "completed" && r.conclusion === "success")) console.log(jobs[0].html_url);
      });' 2>/dev/null
}
witnessed=''
[ -n "$force" ] || witnessed=$(witness "$(git rev-parse HEAD)")

if [ -n "$witnessed" ]; then
  # Installed for the probes and the break-its; CI's verify and slow tests stand for this run's.
  if sh -c "${CELLS_REVIEW_INSTALL:-npm ci --no-audit --no-fund --prefer-offline}" >"$log" 2>&1; then
    verdict='witnessed'
  else
    verdict='FAILS'
  fi
elif sh -c "${CELLS_REVIEW_VERIFY:-npm ci --no-audit --no-fund --prefer-offline && npm run verify}" >"$log" 2>&1; then
  verdict='passes'
else
  verdict='FAILS'
fi
unit=$(grep -E '^ +Tests ' "$log" | tail -1 | sed 's/^ *//; s/  */ /g')
verify_lines=$(wc -l <"$log")

# The slow tests (AGENTS.md: the folder, the MIDI import), when the pull request touches what they read and CI hasn't
# passed them on this commit.
slow=''
if [ -z "$witnessed" ] && git diff --name-only "$base...HEAD" | grep -qE '^src/engine/(fold/|midiimport)|^midi/'; then
  if sh -c "${CELLS_REVIEW_SLOW:-npm run -s test:slow}" >>"$log" 2>&1; then slow='passes'; else slow='FAILS'; fi
  slow_tests=$(tail -n +"$((verify_lines + 1))" "$log" | grep -E '^ +Tests ' | tail -1 | sed 's/^ *//; s/  */ /g')
fi
rm -rf "$lock"
trap - EXIT INT TERM

behind=$(git rev-list --count "$base..origin/main")
echo "Reviewing $target at $(git rev-parse --short HEAD), in $dir"
echo "Base: origin/main at $(git rev-parse --short origin/main); merge base $(git rev-parse --short "$base")"
if [ "$behind" -gt 0 ]; then
  s=s
  [ "$behind" -eq 1 ] && s=''
  if conflicts=$(git merge-tree --write-tree --name-only --no-messages origin/main HEAD); then
    echo "Behind main by $behind commit$s; merges with main cleanly"
  else
    echo "Behind main by $behind commit$s; conflicts with main in: $(echo "$conflicts" | tail -n +2 | paste -sd ' ' -)"
  fi
fi
if [ -n "$against" ]; then
  if conflicts=$(git merge-tree --write-tree --name-only --no-messages HEAD "$(ref_of "$against")"); then
    echo "Against $against: merges cleanly"
  else
    echo "Against $against: conflicts in: $(echo "$conflicts" | tail -n +2 | paste -sd ' ' -)"
  fi
fi
commits="$base..HEAD"
range="$base...HEAD"
if [ -n "$from" ]; then
  # Main may have been merged in since <commit>: leave its commits out, and diff against <commit> with main merged into
  # it. Where that merge conflicts, limit the diff to the files the scoped commits touched.
  commits="HEAD ^$from ^origin/main"
  if scoped=$(git merge-tree --write-tree --name-only --no-messages "$from" origin/main); then
    range="$(echo "$scoped" | head -1) HEAD"
  else
    touched="$log.touched"
    # shellcheck disable=SC2086
    git log --format= --name-only $commits | sort -u >"$touched"
    both=$(git diff --name-only "$(git merge-base "$from" origin/main)" origin/main |
      sort | comm -12 - "$touched" | paste -sd ' ' -)
    range="$from HEAD -- $(paste -sd ' ' - <"$touched")"
    rm -f "$touched"
    echo "Note: $(git rev-parse --short "$from") does not merge with main cleanly, so the diff is limited to the files these commits touched, and may show main's changes in: ${both:-none of them}"
  fi
  # shellcheck disable=SC2086
  echo "Scope: $(git rev-parse --short "$from")..HEAD ($(git rev-list --count $commits) of $(git rev-list --count "$base..HEAD") commits)"
fi
echo
# shellcheck disable=SC2086
git log --oneline $commits
echo
# shellcheck disable=SC2086
git diff --compact-summary --stat=100 $range
echo

# The files on the ladder's last rung (AGENTS.md, "Stop, push back, recommend"): each needs the owner's word, asked
# before, and named in the pull request.
# shellcheck disable=SC2086
changed=$(git diff --name-only $range)
ladder() {
  printf '%s\n' "$changed" | grep -E "$1" | paste -sd ' ' -
}
watch=''
moved=$(ladder '^src/engine/snapshot\.txt$')
[ -n "$moved" ] && watch="${watch}Ladder: what a piece plays moves ($moved): asked first, the pieces named, the changelog says?
"
moved=$(ladder '^fixtures/contracts/')
[ -n "$moved" ] && watch="${watch}Ladder: the hub's contract vectors change ($moved): a handshake with every implementer?
"
moved=$(ladder '^(tsconfig\.pure\.json|src/host\.d\.ts)$')
[ -n "$moved" ] && watch="${watch}Ladder: the purity gate changes ($moved)
"
moved=$(ladder '^types/')
[ -n "$moved" ] && watch="${watch}Ladder: the declarations a frontend typechecks against change ($moved): could its next pin break?
"
moved=$(ladder '^src/engine/fold/ratchet\..*\.json$')
[ -n "$moved" ] && watch="${watch}Ratchet: recorded anew ($moved): is the trade named?
"
if printf '%s\n' "$changed" | grep -E '^src/' | grep -qvE '\.test\.ts$|^src/engine/snapshot\.txt$' &&
  ! printf '%s\n' "$changed" | grep -qx 'CHANGELOG.md'; then
  watch="${watch}Changelog: src/ changes beyond its tests, and CHANGELOG.md doesn't: would a frontend notice?
"
fi
[ -n "$watch" ] && printf '%s\n' "$watch"

if [ "$verdict" = witnessed ]; then
  echo "CI passed verify and the slow tests on this commit, so neither ran here (--verify runs them): $witnessed"
else
  echo "npm run verify $verdict${unit:+ ($unit)}; full log: $log"
fi
[ -n "$slow" ] && echo "npm run test:slow $slow${slow_tests:+ ($slow_tests)}"
if [ "$verdict" = FAILS ]; then
  # Vitest's block of failed tests, up to its summary; else the output's end.
  failed=$(head -n "$verify_lines" "$log" | sed -n '/Failed Tests/,/^ *Test Files /p' | head -80)
  if [ -n "$failed" ]; then echo "$failed"; else head -n "$verify_lines" "$log" | tail -30; fi
fi
[ "${slow:-passes}" = passes ] || tail -n +"$((verify_lines + 1))" "$log" | tail -30
echo
echo "Diff: git -C $dir diff $range"
# The language under Node, through tools/node-ts.mjs: `notes(text, seconds)` is what a piece plays, as the event
# snapshot reads it (voice, onset, length, frequency).
probe="import { compileSource } from './src/index.ts'; import { codeShifts } from './src/engine/program.ts'; import { plan, eventsBetween } from './src/engine/realize.ts'; const notes = (text, seconds = 4) => { const r = compileSource(text); return eventsBetween(plan(r, codeShifts(r)), 0, seconds).map((e) => [e.voice, +e.at.toFixed(3), +e.dur.toFixed(3), +e.freq.toFixed(2)]); }; …"
[ -f tools/node-ts.mjs ] &&
  echo "Probe: cd $dir && node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs --input-type=module -e \"$probe\""
echo "Done: git worktree remove --force $dir && rm -f $log"
