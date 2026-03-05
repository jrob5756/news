#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG="$PROJECT_ROOT/config.json"

TEMPLATE=$(cat "$PROJECT_ROOT/templates/news_report_template.md")
SOURCES=$(jq -c '.sources' "$CONFIG")
TOPICS=$(jq -c '.interests.topics' "$CONFIG")
COMPANIES=$(jq -c '.interests.companies' "$CONFIG")

CONDUCTOR="${CONDUCTOR:-cond}"

$CONDUCTOR run "$PROJECT_ROOT/workflows/news/news.yaml" \
  "$@" \
  -i project_root="$PROJECT_ROOT" \
  -i report_template="$TEMPLATE" \
  -i sources="$SOURCES" \
  -i topics="$TOPICS" \
  -i companies="$COMPANIES"
