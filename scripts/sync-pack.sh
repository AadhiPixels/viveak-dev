#!/usr/bin/env bash
# Pack the working tree (tracked + untracked, minus ignored) for syncing to the Mac.
# QA outputs are git-ignored but travel alongside, split into <18 MB archives.
set -euo pipefail
cd "$(dirname "$0")/.."
OUTDIR=${1:-/mnt/user-data/outputs/sync}
mkdir -p "$OUTDIR"
rm -f "$OUTDIR"/*.tgz "$OUTDIR"/manifest.txt
git ls-files -co --exclude-standard > /tmp/sync-manifest.txt
tar czf "$OUTDIR/site.tgz" --exclude='.git/objects/tmp*' -T /tmp/sync-manifest.txt .git
if [ -d qa ] && [ -z "${SKIP_QA:-}" ]; then
  find qa -type f | sort > /tmp/sync-qa.txt
  cat /tmp/sync-qa.txt >> /tmp/sync-manifest.txt
  # Split QA files into archives under ~18 MB (uncompressed size as the guide).
  chunk=1; size=0; : > /tmp/sync-qa-chunk.txt
  while IFS= read -r f; do
    s=$(stat -c %s "$f")
    if [ $((size + s)) -gt 18000000 ] && [ -s /tmp/sync-qa-chunk.txt ]; then
      tar czf "$OUTDIR/qa-$chunk.tgz" -T /tmp/sync-qa-chunk.txt; chunk=$((chunk+1)); size=0; : > /tmp/sync-qa-chunk.txt
    fi
    echo "$f" >> /tmp/sync-qa-chunk.txt; size=$((size + s))
  done < /tmp/sync-qa.txt
  [ -s /tmp/sync-qa-chunk.txt ] && tar czf "$OUTDIR/qa-$chunk.tgz" -T /tmp/sync-qa-chunk.txt
fi
cp /tmp/sync-manifest.txt "$OUTDIR/manifest.txt"
ls -la "$OUTDIR"
wc -l /tmp/sync-manifest.txt
