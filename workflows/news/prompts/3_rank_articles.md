You are ranking news articles by relevance.

## Collected Articles

Read all JSON files from the directory `{{ workflow.input.project_root }}/tmp/articles/`. Each file contains a JSON array of articles gathered from a different news source.

## Exclusion List (final dedup check)
{{ build_exclusion_list.output.stdout }}

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

1. Read all the article JSON files from the directory above.
2. Compare each article against the exclusion list one final time to ensure absolutely no duplicates.
3. Remove any duplicate articles that appear across different sources (same story reported by multiple sources — keep the best/most detailed version).
4. Rank the remaining articles by relevance to the interests listed above.
5. Return the top 25 ranked articles as a JSON array, each with: rank, source, title, url, summary, date.
6. Also return the top 3 articles separately as a JSON array of objects, each with: title, url, source, date, summary.
