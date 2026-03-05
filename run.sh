#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$SCRIPT_DIR/config.json"

TEMPLATE=$(cat "$SCRIPT_DIR/templates/news_report_template.md")
SOURCES=$(jq -c '.sources' "$CONFIG")
TOPICS=$(jq -c '.interests.topics' "$CONFIG")
COMPANIES=$(jq -c '.interests.companies' "$CONFIG")

conductor run "$SCRIPT_DIR/workflows/news/news.yaml" \
  "$@" \
  -i project_root="$SCRIPT_DIR" \
  -i report_template="$TEMPLATE" \
  -i sources="$SOURCES" \
  -i topics="$TOPICS" \
  -i companies="$COMPANIES"
