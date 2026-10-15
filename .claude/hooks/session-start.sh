#!/bin/sh
# A session starts ready to verify: dependencies installed (a fresh git worktree has no node_modules, so it installs
# there too), git's hooks pointed at .githooks (the pre-push gate), `origin/main` and the session's own branch fetched,
# and one line on how the branch stands against them (branch-status.sh). Its stdout goes into the agent's context.
here=$(cd "$(dirname "$0")" && pwd)
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
git config core.hooksPath .githooks
[ -d node_modules ] || npm ci --no-audit --no-fund >/dev/null 2>&1 || echo "npm ci failed: run it before verifying"
# A cloud checkout may hold only its own branch: the explicit refspecs make origin/main exist even then, and follow a
# remote branch that was rewritten. Failing to fetch is reported, not fatal.
wait=
command -v timeout >/dev/null && wait='timeout 30'
$wait git fetch -q origin +main:refs/remotes/origin/main 2>/dev/null || echo 'origin/main not fetched: the line below reads what was fetched before'
branch=$(git symbolic-ref -q --short HEAD) && $wait git fetch -q origin "+$branch:refs/remotes/origin/$branch" 2>/dev/null
sh "$here/branch-status.sh"
exit 0
