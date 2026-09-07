#!/usr/bin/env bash
# Runs on the Mac side (inside the mounted folder): applies .sync/site.tgz and
# removes files that are no longer part of the tree. Deletion falls back to
# moving files into .sync/_to_delete when the mount refuses rm.
set -uo pipefail
cd "$(dirname "$0")/.."
for a in .sync/site.tgz .sync/qa-*.tgz; do [ -f "$a" ] && tar --overwrite -xzf "$a" 2>/dev/null; done
chmod -R u+rwX,go+rX . 2>/dev/null
# Files present locally (tracked scope) but absent from the manifest. The desktop
# app's "Claude outputs" folder is never ours to prune, and qa/ is only pruned when
# the manifest carries QA captures (SKIP_QA=1 packs leave it alone).
qa_filter=( -not -path './qa/*' )
grep -q '^qa/' .sync/manifest.txt && qa_filter=()
find . -type f \
  -not -path './node_modules/*' -not -path './.next/*' -not -path './.git/*' -not -path './.sync/*' \
  -not -path './Claude outputs/*' "${qa_filter[@]}" \
  -not -name '.DS_Store' -not -path './test-results/*' -not -path './playwright-report/*' \
  | sed 's#^\./##' | sort > .sync/local.txt
sort .sync/manifest.txt > .sync/manifest.sorted.txt
comm -23 .sync/local.txt .sync/manifest.sorted.txt > .sync/stale.txt
if [ -s .sync/stale.txt ]; then
  mkdir -p .sync/_to_delete
  while IFS= read -r f; do
    case "$f" in
      next-env.d.ts|.env*|*.local) continue ;;
    esac
    if ! rm -f "$f" 2>/dev/null; then
      mkdir -p ".sync/_to_delete/$(dirname "$f")" && mv "$f" ".sync/_to_delete/$f" 2>/dev/null
    fi
  done < .sync/stale.txt
  echo "stale files handled: $(wc -l < .sync/stale.txt)"
fi
git log --oneline | head -1
