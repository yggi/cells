#!/bin/sh
# Whether a branch changes prose alone, so that the docs check (`npm run verify:docs`: Prettier, the docs' own tests, the
# boot set's ceiling) stands in for `npm run verify`. Read by the pre-push hook (.githooks/pre-push) and by CI
# (.github/workflows/ci.yml), so the two agree.
#
#   sh tools/docs-only.sh [base]   # prints `docs` or `code`; base: origin/main
#
# `docs` when every file that differs from the base (`<base>...HEAD`, from the merge base) is markdown outside the
# folders whose markdown is code: examples/ and fragments/ (compiled into src/*.generated.ts), midi/ (the library's
# readmes), docs/language/ (reference.md, generated from the parser's tables; canonical.md, read by Normalise's tests) and
# README.md (the index of forms the reference is made from). `code` otherwise, and whenever the diff can't be read or is
# empty: the fail-safe is the whole of verify. A file read by a test that isn't in verify:docs belongs in that list.
base=${1:-origin/main}
changed=$(git diff --name-only "$base...HEAD" 2>/dev/null) || {
  echo code
  exit 0
}
if [ -z "$changed" ] || printf '%s\n' "$changed" | grep -qv '\.md$' ||
  printf '%s\n' "$changed" | grep -qE '^(examples|fragments|midi|docs/language)/|^README\.md$'; then
  echo code
else
  echo docs
fi
