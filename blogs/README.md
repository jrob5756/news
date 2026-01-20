# Feedly CLI

Automated tool to export tagged articles from Feedly boards using Playwright.

## Quick Start

```bash
# 1. Start Edge with remote debugging
microsoft-edge --remote-debugging-port=9222

# 2. Navigate to https://feedly.com and log in

# 3. Run the exporter
cd blogs
./feedly.sh
```

The exporter will automatically:
1. Get all board names from your Feedly sidebar
2. Click on each board
3. Scroll to load articles from the past 12 months
4. Extract article title, URL, source, date, and description
5. Save results to `data/` folder

## Project Structure

```
blogs/
├── README.md
├── feedly.sh               # Main entry point (Linux/macOS)
├── feedly.ps1              # Main entry point (Windows PowerShell)
├── data/                   # Exported article data (JSON files)
│   ├── all_articles.json    # Combined articles from all boards
│   ├── summary.json         # Statistics and overview
│   └── {board_name}.json    # Individual board data
└── src/                    # Playwright scripts
    ├── export_boards.js     # Full automation script
    ├── export_board.js      # Utility functions
    ├── workflow.js          # Workflow helper
    ├── feedly_board_utils.js
    ├── feedly_utils.js
    └── package.json
```

## Usage

### Option 1: Automated Script (Recommended)

**Linux/macOS (Bash):**
```bash
cd blogs

# Export all boards
./feedly.sh

# Or generate summary from existing data
./feedly.sh --summary

# Clear saved login session
./feedly.sh --reset
```

**Windows (PowerShell):**
```powershell
cd blogs

# Export all boards
.\feedly.ps1

# Or generate summary from existing data
.\feedly.ps1 -Summary

# Clear saved login session
.\feedly.ps1 -Reset
```

### Option 2: Direct Node.js

```bash
cd blogs/src
npm install
node export_boards.js
```

### Option 3: VS Code + Playwright MCP

If you have VS Code with Playwright MCP connected to your browser, you can ask Copilot to export boards interactively using the extraction functions in the scripts.

## Output Format

Each board generates a JSON file:

```json
{
  "board": "AI",
  "scrapedAt": "2026-01-19T10:30:00.000Z",
  "articleCount": 65,
  "articles": [
    {
      "title": "Article Title",
      "url": "https://example.com/article",
      "source": "Source Name",
      "date": "2026-01-17",
      "relativeDate": "2d",
      "description": "Article description...",
      "otherBoards": ["Architecture"]
    }
  ]
}
```

## Configuration

Edit `src/export_boards.js` to customize:

```javascript
const CONFIG = {
  cdpUrl: 'http://localhost:9222',  // Browser debug port
  maxAgeMonths: 12,                  // Only articles from last N months
  scrollDelay: 800,                  // Delay between scrolls (ms)
  navigationDelay: 2000,             // Delay after clicking board (ms)
  maxScrolls: 30                     // Maximum scroll attempts per board
};
```

## Boards

The exporter automatically detects all boards in your Feedly account.

## Requirements

- Node.js 18+
- Microsoft Edge or Google Chrome
- Feedly account with saved boards

## Troubleshooting

**Browser not detected:**
```bash
# Make sure Edge is running with debugging enabled
microsoft-edge --remote-debugging-port=9222

# Or use Chrome
google-chrome --remote-debugging-port=9222
```

**No articles found:**
- Make sure you're logged into Feedly
- Check that boards have articles saved

**Script hangs:**
- Increase `navigationDelay` in CONFIG
- Check browser console for errors
