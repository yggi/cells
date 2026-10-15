#!/bin/sh
# Adapted from yggi/jambot .claude/hooks/branch-status.sh @ 8871429 (cells runs it when a session starts or resumes).
# One line on how the checkout stands against `origin/main` and its own remote
# branch, for the agent that starts or resumes in it: behind or ahead
# of main, a branch main already holds, a remote branch that moved. Reads what
# is fetched; session-start.sh fetches first. Run in the current directory.
branch=$(git symbolic-ref -q --short HEAD) || {
  echo 'branch: detached HEAD'
  exit 0
}
git rev-parse -q --verify refs/remotes/origin/main >/dev/null || {
  echo "branch $branch: origin/main unknown"
  exit 0
}
set -- $(git rev-list --left-right --count origin/main...HEAD)
behind=$1 ahead=$2
main=$(git log -1 --format='%h, %cr' origin/main)
line="branch $branch: $behind behind, $ahead ahead of origin/main ($main)"
if [ "$behind" -gt 0 ] && [ "$ahead" -eq 0 ]; then
  line="$line; nothing here that main lacks: restart with git checkout -B $branch origin/main"
elif [ "$behind" -gt 0 ]; then
  line="$line; merge origin/main before starting, docs conflicts are likely"
fi
if git rev-parse -q --verify "refs/remotes/origin/$branch" >/dev/null; then
  set -- $(git rev-list --left-right --count "origin/$branch...HEAD")
  if [ "$1" -gt 0 ] && [ "$2" -eq 0 ]; then
    line="$line; origin/$branch has $1 commits this checkout lacks: git merge --ff-only origin/$branch"
  elif [ "$1" -gt 0 ]; then
    line="$line; origin/$branch has $1 commits this checkout lacks and has diverged"
  fi
fi
echo "$line"
