#!/usr/bin/env bash
set -e

PR="${1:-.}"
REPORT_CONTENT="${2:-}"

YR=$(date +%Y)
MO=$(date +%m)
DY=$(date +%d)
DIR="$PR/reports/$YR/$MO"
RF="$DIR/$DY.md"

# Create target directory
mkdir -p "$DIR"

# Save the new report
if [ -n "$REPORT_CONTENT" ]; then
  printf '%s\n' "$REPORT_CONTENT" > "$RF"
else
  cat > "$RF"
fi

# Migrate legacy *_news_report.md files from root into yyyy/mm/dd.md format
for f in "$PR"/*_news_report.md; do
  [ -f "$f" ] || continue
  BN=$(basename "$f")
  FY=$(echo "$BN" | cut -c1-4)
  FM=$(echo "$BN" | cut -c5-6)
  FD=$(echo "$BN" | cut -c7-8)
  FDIR="$PR/reports/$FY/$FM"
  mkdir -p "$FDIR"
  mv "$f" "$FDIR/$FD.md"
done

# Migrate legacy files from reports/ root
for f in "$PR/reports"/*_news_report.md; do
  [ -f "$f" ] || continue
  BN=$(basename "$f")
  FY=$(echo "$BN" | cut -c1-4)
  FM=$(echo "$BN" | cut -c5-6)
  FD=$(echo "$BN" | cut -c7-8)
  FDIR="$PR/reports/$FY/$FM"
  mkdir -p "$FDIR"
  mv "$f" "$FDIR/$FD.md"
done

# Update README.md with link to ABOUT.md + latest report content
{
  echo '> 📖 [How this report is generated](ABOUT.md)'
  echo ''
  cat "$RF"
} > "$PR/README.md"

echo "Report saved to $RF"

# Clean up all temp files
rm -rf "$PR/tmp"
