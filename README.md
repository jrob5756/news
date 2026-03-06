# Daily News Digest

An AI-powered daily news aggregation and analysis pipeline built with [Conductor](https://github.com/microsoft/conductor). It gathers articles from curated sources, ranks them by relevance, and generates detailed markdown reports focused on software development, AI, and cloud computing.

📰 **[Latest Report](reports/2026/03/05.md)**

## How It Works

The workflow is defined in [`workflows/news/news.yaml`](workflows/news/news.yaml) and orchestrated by Conductor using the GitHub Copilot provider with Claude Sonnet 4.6. The pipeline runs through six stages:

1. **Build exclusion list** — A script extracts previously reported articles from the last 5 reports for dedup
2. **Gather articles** — 10 news sources are scraped in parallel (max 5 concurrent), each saving results to a temp file
3. **Rank articles** — The model reads all gathered article files from disk, deduplicates, and ranks the top 25 by relevance
4. **Analyze top articles** — The top 3 articles are analyzed in depth (parallel), fetching full content and related discussion
5. **Generate report** — A final markdown report is compiled from the ranked articles and deep analyses
6. **Save report** — The report is saved to `reports/YYYY/MM/DD.md` and temp files are cleaned up

## Usage

### Local
```bash
bash workflows/scripts/run.sh
```

### CI
The workflow runs daily at 7:00 AM EDT via [GitHub Actions](.github/workflows/daily-news.yml) and can also be triggered manually.

## Configuration

Edit [`config.json`](config.json) to customize:

- **sources** — URLs to scrape for article discovery
- **interests.topics** — Topics to prioritize (e.g., Software Development, AI, Cloud Computing)
- **interests.companies** — Companies to track (e.g., Microsoft, Google, OpenAI, Anthropic)

## Project Structure

```
├── config.json                          # Sources and interests configuration
├── templates/
│   └── news_report_template.md          # Markdown template for generated reports
├── workflows/
│   ├── news/
│   │   ├── news.yaml                    # Conductor workflow definition
│   │   └── prompts/                     # Prompt files for each pipeline stage
│   └── scripts/
│       └── run.sh                       # Wrapper script to run the workflow
├── reports/                             # Archive of daily reports (YYYY/MM/DD.md)
└── .github/
    └── workflows/
        └── daily-news.yml               # GitHub Actions CI workflow
```

## Report Format

Each report includes:

- **Summary** — Key themes and trends of the day
- **Top 3 Articles** — In-depth analysis with detailed summaries
- **Other Articles** — Brief summaries of additional relevant stories (up to 25 total)

Reports are deduplicated against the 5 most recent reports to keep coverage fresh.
