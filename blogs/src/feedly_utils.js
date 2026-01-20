/**
 * Feedly Board Exporter - Interactive Version
 * 
 * This module exports functions to export Feedly boards using the 
 * Playwright MCP server connected to an existing browser.
 * 
 * This is designed to work with VS Code's Copilot Playwright MCP integration.
 */

// Board list from Feedly
const BOARDS = [
  '.NET Core',
  '.NET Framework', 
  'AI',
  'Angular',
  'Architecture',
  'ASP.NET Core',
  'AWS',
  'Azure',
  'Azure DevOps',
  'Big Data',
  'Big Data - Stream Processing',
  'Blazor',
  'Blogging',
  'Business and Soft Skills',
  'C#',
  'Career',
  'Cloud Native',
  'CQRS',
  'Development',
  'Docker',
  'EF Core',
  'Frontend',
  'General',
  'General Security',
  'GitHub',
  'Go',
  'GraphQL',
  'gRPC',
  'IaC',
  'Identity / Authentication',
  'Interview',
  'Interview - Coding',
  'Interview - Systems Design',
  'Kubernetes',
  'Leadership',
  'Microservices',
  'Mobile',
  'Nuget',
  'Patterns',
  'PWAs',
  'Rust',
  'Serverless',
  'Share with Bootcamps',
  'SignalR',
  'SQL, Data Access',
  'Static Sites',
  'Systems Design',
  'Talks',
  'Test Automation',
  'Tools and Frameworks',
  'Visual Studio',
  'Visual Studio Code'
];

/**
 * Parse relative date to get approximate date
 * @param {string} relativeStr - e.g., "2d", "4mo", "1h"
 * @returns {Date|null}
 */
function parseRelativeDate(relativeStr) {
  if (!relativeStr) return null;
  
  const now = new Date();
  const match = relativeStr.match(/^(\d+)(min|h|d|w|mo|y)$/);
  
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  const date = new Date(now);
  
  switch (unit) {
    case 'min':
      date.setMinutes(date.getMinutes() - value);
      break;
    case 'h':
      date.setHours(date.getHours() - value);
      break;
    case 'd':
      date.setDate(date.getDate() - value);
      break;
    case 'w':
      date.setDate(date.getDate() - (value * 7));
      break;
    case 'mo':
      date.setMonth(date.getMonth() - value);
      break;
    case 'y':
      date.setFullYear(date.getFullYear() - value);
      break;
  }
  
  return date;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

/**
 * Check if within last N months
 */
function isWithinMonths(relativeStr, months = 12) {
  const date = parseRelativeDate(relativeStr);
  if (!date) return false;
  
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  
  return date >= cutoff;
}

/**
 * JavaScript code to extract articles from the Feedly board page
 * This is meant to be run via browser_evaluate
 */
const EXTRACT_ARTICLES_CODE = `
() => {
  const articles = [];
  const articleElements = document.querySelectorAll('article');
  
  articleElements.forEach(article => {
    try {
      // Get title and URL
      const titleLink = article.querySelector('p a');
      const title = titleLink?.textContent?.trim();
      const url = titleLink?.href;
      
      // Get the generic divs containing metadata
      const divs = article.querySelectorAll(':scope > div > div');
      
      let source = null;
      let relativeDate = null;
      let description = null;
      
      // Second div usually has source / date
      if (divs.length >= 2) {
        const metaText = divs[1]?.textContent || '';
        // Pattern: "Source / 2d" or "100+ Source / 7mo"
        const match = metaText.match(/(?:\\d+\\+?\\s*)?(.+?)\\s*\\/\\s*(\\d+(?:min|h|d|w|mo|y))/);
        if (match) {
          source = match[1].trim();
          relativeDate = match[2];
        }
      }
      
      // Third div usually has description
      if (divs.length >= 3) {
        description = divs[2]?.textContent?.trim()?.substring(0, 500);
      }
      
      // Get board tags
      const boardButtons = article.querySelectorAll('button');
      const boards = [];
      boardButtons.forEach(btn => {
        const text = btn.textContent?.trim();
        if (text && text.includes('Board')) {
          const boardName = text.replace(/Board\\s*/, '').trim();
          if (boardName) boards.push(boardName);
        }
      });
      
      if (title && url) {
        articles.push({
          title,
          url,
          source,
          relativeDate,
          description,
          boards
        });
      }
    } catch (e) {
      console.error('Error parsing article:', e);
    }
  });
  
  return articles;
}
`;

/**
 * JavaScript code to scroll and check for more content
 */
const SCROLL_AND_CHECK_CODE = `
() => {
  const previousHeight = document.body.scrollHeight;
  window.scrollTo(0, document.body.scrollHeight);
  
  // Return info about scroll state
  return {
    scrolledTo: document.body.scrollHeight,
    previousHeight: previousHeight,
    hasMore: true
  };
}
`;

/**
 * Get the article count on the current page
 */
const COUNT_ARTICLES_CODE = `
() => document.querySelectorAll('article').length
`;

module.exports = {
  BOARDS,
  parseRelativeDate,
  formatDate,
  isWithinMonths,
  EXTRACT_ARTICLES_CODE,
  SCROLL_AND_CHECK_CODE,
  COUNT_ARTICLES_CODE
};

// If run directly, print the boards
if (require.main === module) {
  console.log('Feedly Boards to scrape:');
  BOARDS.forEach((board, i) => {
    console.log(`${i + 1}. ${board}`);
  });
  console.log(`\nTotal: ${BOARDS.length} boards`);
}
