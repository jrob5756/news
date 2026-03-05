You are performing an in-depth analysis of a top news article.

## Article to Analyze
- **Title**: {{ article.title }}
- **URL**: {{ article.url }}
- **Source**: {{ article.source }}
- **Date**: {{ article.date }}
- **Initial Summary**: {{ article.summary }}

## Interests for Context

**Topics:**
{% for topic in workflow.input.topics %}
- {{ topic }}
{% endfor %}

**Companies:**
{% for company in workflow.input.companies %}
- {{ company }}
{% endfor %}

## Instructions

1. Fetch the full content from the article URL.
2. Analyze the article in depth.
3. Search for additional context or related information if needed.
4. Review any comments or discussions related to the article, if available.
5. Return a detailed summary focusing on:
   - Key points and findings
   - Relevance to the specified topics and companies
   - Implications and insights
   - Notable quotes or data points
