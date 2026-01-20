#!/usr/bin/env node

/**
 * Feedly Board Exporter - Automated Workflow
 * 
 * This script provides step-by-step instructions for exporting all Feedly boards
 * using the Playwright MCP integration in VS Code.
 * 
 * Run this to see the workflow and copy/paste commands.
 */

const fs = require('fs').promises;
const path = require('path');

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

// JavaScript code to extract articles (for browser_evaluate)
const EXTRACT_JS = `() => {
  const articles = [];
  const articleElements = document.querySelectorAll('article');
  
  articleElements.forEach((article) => {
    try {
      const titleLink = article.querySelector('p a');
      const title = titleLink?.textContent?.trim();
      const url = titleLink?.href;
      
      const allText = article.textContent;
      let source = null;
      let relativeDate = null;
      
      const datePatterns = allText.match(/([^\\/\\n]+?)\\s*\\/\\s*(\\d+(?:min|h|d|w|mo|y))/g);
      if (datePatterns && datePatterns.length > 0) {
        const lastMatch = datePatterns[datePatterns.length - 1];
        const parts = lastMatch.match(/(.+?)\\s*\\/\\s*(\\d+(?:min|h|d|w|mo|y))/);
        if (parts) {
          source = parts[1].replace(/^\\d+\\+?\\s*/, '').trim();
          relativeDate = parts[2];
        }
      }
      
      const textNodes = article.querySelectorAll('div');
      let description = '';
      textNodes.forEach(node => {
        const text = node.textContent?.trim();
        if (text && text.length > description.length && text.length > 100) {
          if (!text.includes(' / ') || text.length > 200) {
            description = text.substring(0, 500);
          }
        }
      });
      
      const boards = [];
      article.querySelectorAll('button').forEach(btn => {
        const img = btn.querySelector('img[alt*="Board"]');
        if (img) boards.push(img.alt.replace(' Board', ''));
      });
      
      if (title && url) {
        articles.push({ title, url, source, relativeDate, description, boards });
      }
    } catch (e) {}
  });
  
  return articles;
}`;

// JavaScript to scroll and load more articles
const SCROLL_JS = `() => {
  window.scrollTo(0, document.body.scrollHeight);
  return document.querySelectorAll('article').length;
}`;

// JavaScript to get article count
const COUNT_JS = `() => document.querySelectorAll('article').length`;

/**
 * Parse relative date to approximate actual date
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
    case 'min': date.setMinutes(date.getMinutes() - value); break;
    case 'h': date.setHours(date.getHours() - value); break;
    case 'd': date.setDate(date.getDate() - value); break;
    case 'w': date.setDate(date.getDate() - (value * 7)); break;
    case 'mo': date.setMonth(date.getMonth() - value); break;
    case 'y': date.setFullYear(date.getFullYear() - value); break;
  }
  
  return date;
}

function formatDate(date) {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

function isWithinMonths(relativeStr, months = 12) {
  const date = parseRelativeDate(relativeStr);
  if (!date) return true;
  
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return date >= cutoff;
}

function cleanSource(sourceStr) {
  if (!sourceStr) return null;
  return sourceStr.split('•').pop().replace(/^\d+\+?\s*/, '').trim();
}

/**
 * Process raw articles and filter to last 12 months
 */
function processArticles(rawArticles, boardName) {
  return rawArticles
    .filter(a => isWithinMonths(a.relativeDate, 12))
    .map(a => ({
      title: a.title,
      url: a.url,
      source: cleanSource(a.source),
      date: formatDate(parseRelativeDate(a.relativeDate)),
      relativeDate: a.relativeDate,
      description: a.description?.substring(0, 300),
      board: boardName,
      otherBoards: a.boards?.filter(b => b !== boardName) || []
    }));
}

/**
 * Generate workflow instructions
 */
function generateWorkflow() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         FEEDLY BOARD EXPORTER - AUTOMATED WORKFLOW           ║
╚═══════════════════════════════════════════════════════════════╝

This workflow uses the Playwright MCP integration to export articles
from all ${BOARDS.length} Feedly boards.

PREREQUISITES:
1. Have Feedly open in a browser with Playwright MCP connected
2. Be logged into Feedly with access to your boards

WORKFLOW FOR EACH BOARD:
========================

For each board, execute these MCP commands in sequence:

1. CLICK on the board in the sidebar:
   Tool: mcp_playwright_browser_click
   Element: "[Board Name]" button in Boards section
   
2. WAIT for articles to load:
   Tool: mcp_playwright_browser_wait_for
   Time: 2 (seconds)

3. SCROLL to load more articles (repeat 5-10 times):
   Tool: mcp_playwright_browser_evaluate
   Function: ${SCROLL_JS}

4. EXTRACT all articles:
   Tool: mcp_playwright_browser_evaluate  
   Function: ${EXTRACT_JS}

5. SAVE the extracted data to blogs/data/[board_name].json

BOARDS TO SCRAPE:
=================
`);

  BOARDS.forEach((board, i) => {
    const safeName = board.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    console.log(`${String(i + 1).padStart(2)}. ${board.padEnd(30)} → data/${safeName}.json`);
  });

  console.log(`
EXTRACTION CODE (copy this for browser_evaluate):
=================================================
${EXTRACT_JS}

SCROLL CODE (copy this for browser_evaluate):
=============================================
${SCROLL_JS}

After scraping all boards, run:
  node process_scraped_data.js

This will combine all JSON files into a summary.
`);
}

/**
 * Process all scraped JSON files and create summary
 */
async function processSummary() {
  const dataDir = path.join(__dirname, 'data');
  
  try {
    const files = await fs.readdir(dataDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'summary.json' && f !== 'all_articles.json');
    
    const allArticles = {};
    let totalCount = 0;
    
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(dataDir, file), 'utf-8');
      const data = JSON.parse(content);
      
      const boardName = data.board || file.replace('.json', '').replace(/_/g, ' ');
      const articles = data.articles || data;
      
      allArticles[boardName] = Array.isArray(articles) ? articles : [];
      totalCount += allArticles[boardName].length;
    }
    
    // Create summary
    const summary = {
      generatedAt: new Date().toISOString(),
      totalArticles: totalCount,
      boardCount: Object.keys(allArticles).length,
      boards: Object.entries(allArticles).reduce((acc, [board, articles]) => {
        acc[board] = {
          count: articles.length,
          newestDate: articles.map(a => a.date).filter(Boolean).sort().pop(),
          oldestDate: articles.map(a => a.date).filter(Boolean).sort()[0]
        };
        return acc;
      }, {})
    };
    
    await fs.writeFile(
      path.join(dataDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    await fs.writeFile(
      path.join(dataDir, 'all_articles.json'),
      JSON.stringify(allArticles, null, 2)
    );
    
    console.log('Summary generated:');
    console.log(`  Total articles: ${totalCount}`);
    console.log(`  Boards: ${Object.keys(allArticles).length}`);
    console.log(`  Files: data/summary.json, data/all_articles.json`);
    
  } catch (err) {
    console.error('Error processing summary:', err.message);
  }
}

// Exports
module.exports = {
  BOARDS,
  EXTRACT_JS,
  SCROLL_JS,
  COUNT_JS,
  parseRelativeDate,
  formatDate,
  isWithinMonths,
  cleanSource,
  processArticles,
  processSummary
};

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--summary') || args.includes('-s')) {
    processSummary();
  } else {
    generateWorkflow();
  }
}
