#!/bin/sh
# The stamp of a tree that passed `npm run verify`, read by the pre-push hook (.githooks/pre-push), so a push right after
# a verify run by hand doesn't run it again, and still says how many tests passed. The stamps are lines
# `<tree> <tests passed>` in the git directory (`cells-verified`); a line of a tree alone, from before the count was
# kept, reads as a count unknown.
#
#   begin  (npm's `preverify`) records the tree verify is about to check: the checkout's files as they are, tracked or
#          not, but not ignored, written as a git tree through a scratch index (the real index is left alone). It also
#          points `core.hooksPath` at .githooks when it points elsewhere, and says so, so a clone's first verify installs
#          the pre-push gate: no install script may (a frontend installs cells from git, tools/hooks.test.ts). It
#          removes a count an earlier test run left, which is not this run's.
#   end [n] (npm's `postverify`, which npm runs only when verify passed) stamps that tree, unless a file changed while
#          verify ran, with `n` tests passed, or the count verify's reporter kept (`cells-tests-passed`,
#          tools/test-count.ts), used once, or `?`. A commit of exactly those files then has that tree, and the hook
#          finds it.
#
# Outside a git checkout, or at `end` with nothing begun, it does nothing: verify's result never depends on it.
cd "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || exit 0
gitdir=$(git rev-parse --absolute-git-dir) || exit 0
pending="$gitdir/cells-verifying"
counted="$gitdir/cells-tests-passed"

tree() {
  index=$(mktemp)
  # A copy of the index keeps its file stats, so only what changed is hashed again.
  if ! cp "$(git rev-parse --git-path index)" "$index" 2>/dev/null; then
    rm -f "$index"
  fi
  GIT_INDEX_FILE=$index git add -A . >/dev/null 2>&1 && GIT_INDEX_FILE=$index git write-tree
  status=$?
  rm -f "$index"
  return $status
}

case "$1" in
  begin)
    if [ "$(git config core.hooksPath)" != .githooks ]; then
      git config core.hooksPath .githooks &&
        echo 'verify: core.hooksPath now points at .githooks, so every push runs the pre-push gate (.githooks/pre-push)' >&2
    fi
    rm -f "$counted"
    tree >"$pending" 2>/dev/null || rm -f "$pending"
    ;;
  end)
    count=${2:-$(cat "$counted" 2>/dev/null)}
    rm -f "$counted"
    [ -s "$pending" ] || exit 0
    began=$(cat "$pending")
    rm -f "$pending"
    [ "$(tree 2>/dev/null)" = "$began" ] || exit 0
    grep -q "^$began " "$gitdir/cells-verified" 2>/dev/null || echo "$began ${count:-?}" >>"$gitdir/cells-verified"
    ;;
  *)
    echo 'usage: tools/verified.sh begin|end [tests passed]' >&2
    exit 2
    ;;
esac
exit 0
