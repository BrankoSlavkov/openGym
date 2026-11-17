#!/usr/bin/env bash
# Merges the latest upstream openGym into this fork (FORK.md).
#
#   scripts/sync-upstream.sh            # merge upstream/main
#   scripts/sync-upstream.sh v1.4.6     # merge a release tag instead
#
# After the merge, every path in .fork/removed-paths is deleted again (upstream's changes there
# would otherwise come back, or stop the merge as modify/delete conflicts). Lockfile conflicts are
# set aside so they can be regenerated with npm install. Whatever still conflicts is listed for
# you to resolve; nothing is committed until the tree is clean.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

ref="${1:-upstream/main}"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Commit or stash your changes first." >&2
  exit 1
fi

git fetch upstream --tags
echo "Merging $ref into $(git branch --show-current)..."
git merge --no-ff --no-commit "$ref" || true

# Paths the fork removed: gone again, whether upstream changed, added or conflicted them.
while IFS= read -r p; do
  case "$p" in ''|'#'*) continue ;; esac
  git rm -r -q --cached --ignore-unmatch -- "$p" >/dev/null 2>&1 || true
  rm -rf -- "$p"
done < .fork/removed-paths

# Lockfiles: keep ours for now and regenerate after package.json is settled.
relock=()
for f in $(git diff --name-only --diff-filter=U | grep 'package-lock\.json$' || true); do
  git checkout --ours -- "$f" && git add -- "$f"
  relock+=("$(dirname "$f")")
done

left="$(git diff --name-only --diff-filter=U || true)"
if [ -n "$left" ]; then
  echo
  echo "Resolve these conflicts, then: git add <files> && git commit"
  echo "$left" | sed 's/^/  /'
else
  if [ ! -f "$(git rev-parse --git-dir)/MERGE_HEAD" ]; then
    echo "Already up to date with $ref."
    exit 0
  fi
  # Committed even when upstream only touched removed paths, so those commits count as merged.
  git commit -q --no-edit -m "Merge $ref into the fork"
  echo "Merged and committed."
fi

for d in "${relock[@]}"; do echo "Run npm install in $d to refresh its lockfile (upstream changed it)."; done
cat <<'TXT'

Then check that it still works:
  (cd frontend && npm install && npm test && npm run build)
  (cd api && npm install && npm test)
  (cd mcp && npm install && npm test)
  docker compose up -d --build
If the frontend build fails on a new @capacitor/... package, add a stand-in for it in
frontend/web-only/capacitor/ and its name to frontend/web-only/alias.js.
TXT
