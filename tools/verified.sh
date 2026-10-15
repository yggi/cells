#!/bin/sh
# The stamp of a tree that passed `npm run verify`, read by the pre-push hook (.githooks/pre-push), so a push right after
# a verify run by hand doesn't run it again. The stamps are tree hashes, one to a line, in the git directory
# (`cells-verified`).
#
#   begin  (npm's `preverify`) records the tree verify is about to check: the checkout's files as they are, tracked or
#          not, but not ignored, written as a git tree through a scratch index (the real index is left alone).
#   end    (npm's `postverify`, which npm runs only when verify passed) stamps that tree, unless a file changed while
#          verify ran. A commit of exactly those files then has that tree, and the hook finds it.
#
# Outside a git checkout, or at `end` with nothing begun, it does nothing: verify's result never depends on it.
cd "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || exit 0
gitdir=$(git rev-parse --absolute-git-dir) || exit 0
pending="$gitdir/cells-verifying"

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
    tree >"$pending" 2>/dev/null || rm -f "$pending"
    ;;
  end)
    [ -s "$pending" ] || exit 0
    began=$(cat "$pending")
    rm -f "$pending"
    [ "$(tree 2>/dev/null)" = "$began" ] || exit 0
    grep -qx "$began" "$gitdir/cells-verified" 2>/dev/null || echo "$began" >>"$gitdir/cells-verified"
    ;;
  *)
    echo 'usage: tools/verified.sh begin|end' >&2
    exit 2
    ;;
esac
exit 0
