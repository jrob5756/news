# Daily News Report

An AI-powered daily news aggregation and analysis tool built on GitHub Copilot prompt files. It gathers articles from curated sources, ranks them by relevance, and generates detailed markdown reports focused on software development, AI, and cloud computing.

## How It Works

The core workflow is driven by a [Copilot prompt file](.github/prompts/news.prompt.md) that orchestrates multiple AI sub-agents to:

1. **Build an exclusion list** from recent reports to avoid duplicate coverage
2. **Gather articles** from configured sources (Hacker News, Reddit, TechMeme, DZone, etc.)
3. **Rank articles** by relevance to configured topics and companies of interest
4. **Analyze the top articles** in depth, fetching full content and related discussion
5. **Generate a markdown report** with summaries of the top 25 articles

## Usage

1. Open the repository in VS Code with [GitHub Copilot](https://github.com/features/copilot) enabled (Claude Opus 4.5 recommended).
2. Run the **News for Today** prompt from the Copilot prompt picker, or reference it directly:
   ```
   @workspace /prompt news
   ```
3. The report is saved to the root as `yyyyMMdd_news_report.md`. Previous reports are stored in the [`reports/`](reports/) directory.

## Configuration

Edit [`config.json`](config.json) to customize:

- **sources** — URLs to scrape for article discovery
- **interests.topics** — Topics to prioritize (e.g., Software Development, AI, Cloud Computing)
- **interests.companies** — Companies to track (e.g., Microsoft, Google, OpenAI, Anthropic)

## Project Structure

```
├── config.json                  # Sources and interests configuration
├── templates/
│   └── news_report_template.md  # Markdown template for generated reports
├── reports/                     # Archive of previous daily reports
│   ├── 2025/
│   └── *.md
└── .github/
    └── prompts/
        └── news.prompt.md       # Copilot prompt that drives the workflow
```

## Report Format

Each report includes:

- **Summary** — Key themes and trends of the day
- **Top 3 Articles** — In-depth analysis with detailed summaries
- **Other Articles** — Brief summaries of additional relevant stories

Reports are deduplicated against the 5 most recent reports to keep coverage fresh.
