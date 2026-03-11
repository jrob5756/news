#!/usr/bin/env bash
set -e

PR="${1:-.}"

# Find the 5 most recent report files (yyyy/mm/dd.md structure)
FILES=$(find "$PR/reports" -name '*.md' -type f 2>/dev/null | sort -r | head -5)

# Also check for legacy files
LEGACY=$(find "$PR" -maxdepth 1 -name '*_news_report.md' -type f 2>/dev/null | sort -r)
LEGACY2=$(find "$PR/reports" -maxdepth 1 -name '*_news_report.md' -type f 2>/dev/null | sort -r)

ALL_FILES=$(echo -e "$FILES\n$LEGACY\n$LEGACY2" | grep -v '^$' | sort -r | head -5)

EXCL_DIR="$PR/tmp"
EXCL_FILE="$EXCL_DIR/exclusion_list.json"
mkdir -p "$EXCL_DIR"

if [ -z "$ALL_FILES" ]; then
  echo "[]" > "$EXCL_FILE"
  echo "$EXCL_FILE"
  exit 0
fi

# Extract markdown links [Title](URL) and save as JSON array to temp file
echo "$ALL_FILES" | xargs grep -ohE '\[([^]]+)\]\(([^)]+)\)' 2>/dev/null \
  | sed -E 's/\[([^]]+)\]\(([^)]+)\)/\1\t\2/' \
  | jq -R -s '
      split("\n") | map(select(length > 0)) | map(
        split("\t") | { title: .[0], url: .[1] }
      )
    ' > "$EXCL_FILE"

echo "$EXCL_FILE"
