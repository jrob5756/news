You are ranking news articles by relevance.

## Collected Articles from All Sources

{% for result in gather_sources.outputs %}
{% if result.articles is defined %}
{{ result.articles }}
{% endif %}
{% endfor %}

## Exclusion List (final dedup check)
{{ build_exclusion_list.output.exclusion_list }}

## Interests

**Topics:**
{% for topic in workflow.input.topics %}
- {{ topic }}
{% endfor %}

**Companies:**
{% for company in workflow.input.companies %}
- {{ company }}
{% endfor %}

## Instructions

1. Gather all articles from above.
2. Compare each article against the exclusion list one final time to ensure absolutely no duplicates.
3. Remove any duplicate articles that appear across different sources (same story reported by multiple sources — keep the best/most detailed version).
4. Rank the remaining articles by relevance to the interests listed above.
5. Return the top 25 ranked articles as a JSON array, each with: rank, source, title, url, summary, date.
6. Also return the top 3 article URLs separately for detailed analysis.
