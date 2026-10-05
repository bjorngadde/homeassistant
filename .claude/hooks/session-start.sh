#!/bin/bash
# SessionStart hook for Claude Code cloud sessions: installs the dev tools (esbuild, Biome, TypeScript)
# so npm run verify works, and enables the leak-check pre-commit hook. Idempotent.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund
git config core.hooksPath .githooks
