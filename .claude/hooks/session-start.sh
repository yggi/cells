#!/bin/sh
# A session starts ready to verify: dependencies installed, git's hooks pointed at .githooks (the pre-push gate).
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
git config core.hooksPath .githooks
[ -d node_modules ] || npm ci --no-audit --no-fund >/dev/null 2>&1 || echo "npm ci failed: run it before verifying"
exit 0
