#!/usr/bin/env node

/**
 * Feedly Board Exporter - Run with MCP Playwright
 * 
 * This script exports articles from Feedly boards using an existing browser session.
 * It extracts article data and saves it to JSON files in the blogs/data folder.
 * 
 * Usage:
 * 1. Have Feedly open in a browser with Playwright MCP connected
 * 2. Run this script via the Playwright MCP browser_evaluate function
 * 
 * The extraction code can be run via the browser_evaluate MCP tool.
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, '..', 'data'),
  maxAgeMonths: 12
};

// All boards to scrape
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
 * JavaScript code to extract articles from a Feedly board page
 * Copy this into the browser_evaluate function when scraping
 */
const EXTRACT_ARTICLES_JS = `
() => {
  const articles = [];
  const articleElements = document.querySelectorAll('article');
  
  articleElements.forEach((article, index) => {
    try {
      // Get title and URL
      const titleLink = article.querySelector('p a');
      const title = titleLink?.textContent?.trim();
      const url = titleLink?.href;
      
      // Find source and date pattern in text
      const allText = article.textContent;
      let source = null;
      let relativeDate = null;
      
      // Match patterns like "Milan's .NET Weekly / 2d" 
      const datePatterns = allText.match(/([^\\/\\n]+?)\\s*\\/\\s*(\\d+(?:min|h|d|w|mo|y))/g);
      if (datePatterns && datePatterns.length > 0) {
        const lastMatch = datePatterns[datePatterns.length - 1];
        const parts = lastMatch.match(/(.+?)\\s*\\/\\s*(\\d+(?:min|h|d|w|mo|y))/);
        if (parts) {
          source = parts[1].replace(/^\\d+\\+?\\s*/, '').trim();
          relativeDate = parts[2];
        }
      }
      
      // Get description - longest text block > 100 chars
      const textNodes = article.querySelectorAll('div');
      let description = '';
      textNodes.forEach(node => {
        const text = node.textContent?.trim();
        if (text && text.length > description.length && text.length > 100 && !text.includes(title)) {
          if (!text.includes(' / ') || text.length > 200) {
            description = text.substring(0, 500);
          }
        }
      });
      
      // Get board tags from button images with "Board" in alt text
      const boards = [];
      const buttons = article.querySelectorAll('button');
      buttons.forEach(btn => {
        const img = btn.querySelector('img[alt*="Board"]');
        if (img) {
          const boardName = img.alt.replace(' Board', '');
          if (boardName) boards.push(boardName);
        }
      });
      
      if (title && url) {
        articles.push({
          title,
          url,
          source,
          relativeDate,
          description: description || null,
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
 * Parse relative date string to actual date
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
  if (!date) return true; // Include if we can't parse
  
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  
  return date >= cutoff;
}

/**
 * Clean up source string
 */
function cleanSource(sourceStr) {
  if (!sourceStr) return null;
  
  // Remove common prefixes that get concatenated
  return sourceStr
    .split('•').pop() // Take last part after bullet
    .replace(/^\d+\+?\s*/, '') // Remove count prefix like "100+"
    .trim();
}

/**
 * Process raw articles from exporter
 */
function processArticles(rawArticles, boardName) {
  return rawArticles
    .filter(a => isWithinMonths(a.relativeDate, CONFIG.maxAgeMonths))
    .map(a => ({
      title: a.title,
      url: a.url,
      source: cleanSource(a.source),
      date: formatDate(parseRelativeDate(a.relativeDate)),
      relativeDate: a.relativeDate,
      description: a.description,
      board: boardName,
      otherBoards: a.boards.filter(b => b !== boardName)
    }));
}

/**
 * Save articles to JSON file
 */
async function saveArticles(articles, boardName) {
  await fs.mkdir(CONFIG.outputDir, { recursive: true });
  
  const safeName = boardName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const filePath = path.join(CONFIG.outputDir, `${safeName}.json`);
  
  await fs.writeFile(filePath, JSON.stringify(articles, null, 2));
  console.log(`Saved ${articles.length} articles to ${filePath}`);
  
  return filePath;
}

/**
 * Save combined results
 */
async function saveCombinedResults(allArticles) {
  await fs.mkdir(CONFIG.outputDir, { recursive: true });
  
  // All articles in one file
  const allPath = path.join(CONFIG.outputDir, 'all_articles.json');
  await fs.writeFile(allPath, JSON.stringify(allArticles, null, 2));
  
  // Summary
  const summary = {
    scrapedAt: new Date().toISOString(),
    totalArticles: Object.values(allArticles).flat().length,
    boards: Object.entries(allArticles).reduce((acc, [board, articles]) => {
      acc[board] = {
        count: articles.length,
        oldestDate: articles.length > 0 
          ? articles.map(a => a.date).filter(Boolean).sort()[0] 
          : null,
        newestDate: articles.length > 0 
          ? articles.map(a => a.date).filter(Boolean).sort().pop() 
          : null
      };
      return acc;
    }, {})
  };
  
  const summaryPath = path.join(CONFIG.outputDir, 'summary.json');
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log(`\nSaved combined results:`);
  console.log(`  ${allPath}`);
  console.log(`  ${summaryPath}`);
  console.log(`\nTotal: ${summary.totalArticles} articles from ${Object.keys(summary.boards).length} boards`);
}

// Export for use
module.exports = {
  BOARDS,
  CONFIG,
  EXTRACT_ARTICLES_JS,
  parseRelativeDate,
  formatDate,
  isWithinMonths,
  cleanSource,
  processArticles,
  saveArticles,
  saveCombinedResults
};

// Show usage if run directly
if (require.main === module) {
  console.log('Feedly Board Exporter');
  console.log('=====================\n');
  console.log('This module provides utilities for exporting Feedly boards.');
  console.log('\nBoards to scrape:');
  BOARDS.forEach((board, i) => console.log(`  ${i + 1}. ${board}`));
  console.log(`\nTotal: ${BOARDS.length} boards`);
  console.log('\nExtraction JavaScript code:');
  console.log(EXTRACT_ARTICLES_JS);
}
