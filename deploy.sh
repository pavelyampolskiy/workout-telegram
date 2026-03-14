#!/usr/bin/env bash
# Deploy: build webapp, commit dist + changes, push to main. Railway deploys on push.
set -e
cd "$(dirname "$0")"

echo "Building webapp..."
cd webapp && npm ci --silent 2>/dev/null || true && npm run build && cd ..

echo "Staging changes..."
git add -A
if git diff --staged --quiet; then
  echo "Nothing to commit. Already up to date."
  exit 0
fi

MSG="${1:-Deploy: build and push}"
git commit -m "$MSG"
echo "Pushing to origin main..."
git push origin main
echo "Done. Railway will deploy from main."
