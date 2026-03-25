#!/usr/bin/env bash
# Install post-commit hook for automatic deploy after every commit.
set -e
cd "$(dirname "$0")/.."
HOOK=".git/hooks/post-commit"
cp scripts/post-commit "$HOOK"
chmod +x "$HOOK"
echo "Installed: $HOOK — deploy will run automatically after each commit."
