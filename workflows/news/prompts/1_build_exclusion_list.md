Read the 5 most recent news report files from the project at: {{ workflow.input.project_root }}

Reports are stored in `./reports/` using a `yyyy/mm/dd.md` directory structure (e.g., `reports/2026/03/05.md`). There may also be legacy `*_news_report.md` files in the root directory or directly under `./reports/`.

Find and read the 5 most recent report files across all of these locations.

Extract all previously reported articles into a structured exclusion list. For each article, capture:
- **title**: The exact article title text
- **url**: The article URL
- **keywords**: Brief topic keywords (e.g., "McKinsey AI agents", "Claude Healthcare", "Google UCP")

Return the complete exclusion list as a JSON array of objects with those three fields.
