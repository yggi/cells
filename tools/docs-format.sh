#!/bin/sh
# The docs check's Prettier (`npm run verify:docs`, #529): the files a branch changes from the base, as tools/docs-only.sh
# reads them (`<base>...HEAD`), deleted ones aside, checked with the lockfile's Prettier; so a file the branch doesn't
# touch can't fail it. The whole repository's check (`npm run format:check`) whenever the diff can't be read or is empty.
#
#   sh tools/docs-format.sh [base]   # base: origin/main
base=${1:-origin/main}
files=$(git diff --name-only --diff-filter=d "$base...HEAD" 2>/dev/null) || exec npm run -s format:check
[ -n "$files" ] || exec npm run -s format:check
printf '%s\n' "$files" | tr '\n' '\0' | xargs -0 prettier --check --ignore-unknown --no-error-on-unmatched-pattern
