You are generating the final news report.

## Report Template
{{ workflow.input.report_template }}

## Ranked Articles (Top 25)
{{ rank_articles.output.ranked_articles }}

## Detailed Analyses of Top 3
{% for analysis in analyze_top_articles.outputs %}
### Article {{ loop.index }}
{{ analysis.detailed_summary }}
{% endfor %}

## Instructions

1. Using the report template format, generate a complete markdown news report.
2. The **Top 3 Articles** section should use the detailed analyses above for rich, in-depth summaries.
3. The **Other Articles** section should list the remaining articles (ranks 4-25) from the ranked list with their brief summaries.
4. The **Summary** section at the top should synthesize the key themes and trends across all articles.
5. Replace `<Current Date>` in the template with today's date.
6. Return the complete markdown report content.
