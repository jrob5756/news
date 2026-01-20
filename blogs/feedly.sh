#!/bin/bash
# Feedly CLI - Export and manage Feedly boards and articles
#
# Usage:
#   ./feedly.sh              # Export all boards
#   ./feedly.sh --help       # Show help
#   ./feedly.sh --untagged   # Export untagged articles from All feed
#   ./feedly.sh --tag        # Tag articles from tagged.json and untagged.json

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/src"
cd "$SRC_DIR"

show_help() {
    echo ""
    echo "Feedly CLI"
    echo "=========="
    echo ""
    echo "Usage:"
    echo "  ./feedly.sh              Export all boards"
    echo "  ./feedly.sh --summary    Generate summary from existing data"
    echo "  ./feedly.sh --reset      Clear saved login session"
    echo "  ./feedly.sh --untagged   Export untagged articles from All feed"
    echo "  ./feedly.sh --tag        Tag articles in Feedly from JSON files"
    echo "  ./feedly.sh --help       Show this help"
    echo ""
    echo "Workflows:"
    echo "  1. Standard export: ./feedly.sh (exports all boards)"
    echo "  2. Tagging workflow:"
    echo "     a) ./feedly.sh --untagged  (creates data/articles/raw.json)"
    echo "     b) Manually create tagged.json and untagged.json from raw.json"
    echo "     c) ./feedly.sh --tag       (adds articles to Feedly boards)"
    echo ""
    echo "First run: A browser will open - log into Feedly when prompted."
    echo "Subsequent runs: Uses saved session (no login needed)."
    echo ""
}

install_deps() {
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
}

case "${1:-}" in
    --help|-h)
        show_help
        ;;
    --summary|-s)
        node workflow.js --summary
        ;;
    --reset|-r)
        echo "🗑️  Clearing saved session..."
        rm -rf "$SRC_DIR/.browser-data"
        echo "✓ Session cleared. You'll need to log in again next run."
        ;;
    --untagged|-u)
        install_deps
        echo ""
        echo "📰 Exporting untagged articles from All feed..."
        echo ""
        node export_untagged.js
        ;;
    --tag|-t)
        install_deps
        echo ""
        echo "🏷️  Tagging articles..."
        echo ""
        node tag_articles.js
        ;;
    *)
        install_deps
        node export_boards.js
        ;;
esac
