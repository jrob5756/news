You are gathering news articles from a single source.

## Source to Fetch
{{ source }}

## Interests

**Topics:**
{% for topic in workflow.input.topics %}
- {{ topic }}
{% endfor %}

**Companies:**
{% for company in workflow.input.companies %}
- {{ company }}
{% endfor %}

## Exclusion List (DO NOT include these articles)
{{ build_exclusion_list.output.stdout }}

## Instructions

1. Fetch and analyze the source URL above.
2. Identify the top 5 most relevant articles based on the interests listed.
3. For each candidate article, explicitly check it against the exclusion list using the duplicate detection rules:
   - Exact URL match (ignoring trailing slashes and query parameters)
   - Title similarity > 80%
   - Same primary subject/announcement from the same source
4. Ensure articles are recent (within the last 7 days).
5. Skip any article that matches the exclusion list.
6. Return the articles found as a JSON array. Each article must have: source, title, url, summary, date.
