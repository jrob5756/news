/**
 * Feedly Board Exporter
 * 
 * This script navigates through Feedly boards and extracts articles
 * from the past 12 months, saving them to JSON files.
 * 
 * Prerequisites:
 * - Run with: npx playwright test feedly_board_utils.spec.js
 * - Or connect to an existing browser session
 * 
 * Usage with existing browser:
 * 1. Start Chrome with remote debugging: 
 *    google-chrome --remote-debugging-port=9222
 * 2. Login to Feedly manually
 * 3. Run: node feedly_board_utils.js
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  // Connect to existing browser on this port
  wsEndpoint: null, // Will be auto-detected
  cdpUrl: 'http://localhost:9222',
  
  // Output directory
  outputDir: path.join(__dirname, '..', 'data'),
  
  // Time filter - articles from last 12 months
  maxAgeMonths: 12,
  
  // Delays between actions (ms)
  navigationDelay: 2000,
  scrollDelay: 500,
  
  // Maximum scrolls per board to load more articles
  maxScrolls: 50
};

// Board list - extracted from Feedly sidebar
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
 * Parse relative date string to actual date
 * Examples: "2d", "4mo", "7mo", "1h", "12mo", "18mo"
 */
function parseRelativeDate(relativeStr) {
  const now = new Date();
  const match = relativeStr.match(/^(\d+)(h|d|w|mo|y)$/);
  
  if (!match) {
    // Try to parse as absolute date
    const parsed = new Date(relativeStr);
    if (!isNaN(parsed)) return parsed;
    return null;
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const date = new Date(now);
  
  switch (unit) {
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
 * Check if article is within the last 12 months
 */
function isWithinTimeframe(relativeStr, maxMonths = 12) {
  const date = parseRelativeDate(relativeStr);
  if (!date) return false;
  
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - maxMonths);
  
  return date >= cutoffDate;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

/**
 * Extract articles from the current board page
 */
async function extractArticles(page) {
  const articles = [];
  
  // Get all article elements
  const articleElements = await page.$$('article');
  
  for (const articleEl of articleElements) {
    try {
      // Extract title and URL
      const titleLink = await articleEl.$('p a');
      const title = titleLink ? await titleLink.textContent() : null;
      const url = titleLink ? await titleLink.getAttribute('href') : null;
      
      // Extract source and date info
      const metaGeneric = await articleEl.$('div > div:nth-child(2)');
      let source = null;
      let relativeDate = null;
      
      if (metaGeneric) {
        const text = await metaGeneric.textContent();
        // Pattern: "Source / 2d" or "100+ Source / 7mo"
        const match = text.match(/(?:\d+\+?\s*)?(.+?)\s*\/\s*(\d+(?:h|d|w|mo|y))/);
        if (match) {
          source = match[1].trim();
          relativeDate = match[2];
        }
      }
      
      // Extract description
      const descEl = await articleEl.$('div > div:nth-child(3)');
      const description = descEl ? await descEl.textContent() : null;
      
      // Extract board tags (if article appears in multiple boards)
      const boardTags = [];
      const tagButtons = await articleEl.$$('button[class*="Board"]');
      for (const tagBtn of tagButtons) {
        const tagText = await tagBtn.textContent();
        if (tagText) {
          // Clean up the text (remove "Board" suffix)
          const cleanTag = tagText.replace(/\s*Board\s*/, '').trim();
          if (cleanTag) boardTags.push(cleanTag);
        }
      }
      
      if (title && url) {
        const articleDate = parseRelativeDate(relativeDate);
        articles.push({
          title: title.trim(),
          url: url,
          source: source,
          relativeDate: relativeDate,
          date: formatDate(articleDate),
          description: description ? description.trim().substring(0, 500) : null,
          boards: boardTags
        });
      }
    } catch (err) {
      console.error('Error extracting article:', err.message);
    }
  }
  
  return articles;
}

/**
 * Scroll to load more articles
 */
async function scrollToLoadMore(page, maxScrolls = 50) {
  let previousHeight = 0;
  let scrollCount = 0;
  
  while (scrollCount < maxScrolls) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    
    if (currentHeight === previousHeight) {
      // No new content loaded
      break;
    }
    
    previousHeight = currentHeight;
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(CONFIG.scrollDelay);
    
    scrollCount++;
    
    // Check if we've scrolled past 12 months of content
    const articles = await page.$$('article');
    if (articles.length > 0) {
      const lastArticle = articles[articles.length - 1];
      const metaGeneric = await lastArticle.$('div > div:nth-child(2)');
      if (metaGeneric) {
        const text = await metaGeneric.textContent();
        const match = text.match(/(\d+(?:h|d|w|mo|y))/);
        if (match && !isWithinTimeframe(match[1], CONFIG.maxAgeMonths)) {
          console.log(`  Reached articles older than ${CONFIG.maxAgeMonths} months, stopping scroll`);
          break;
        }
      }
    }
  }
}

/**
 * Navigate to a specific board
 */
async function navigateToBoard(page, boardName) {
  // Find the board button in the sidebar under "Boards" section
  // The boards section has buttons with the board name
  const boardButton = await page.locator(`button:has-text("${boardName}")`).first();
  
  if (await boardButton.count() > 0) {
    await boardButton.click();
    await page.waitForTimeout(CONFIG.navigationDelay);
    return true;
  }
  
  return false;
}

/**
 * Main export function
 */
async function scrapeBoards() {
  console.log('Feedly Board Exporter');
  console.log('=====================\n');
  
  // Ensure output directory exists
  await fs.mkdir(CONFIG.outputDir, { recursive: true });
  
  // Connect to existing browser
  let browser;
  let context;
  let page;
  
  try {
    // Try to connect to existing browser via CDP
    console.log('Connecting to existing browser...');
    browser = await chromium.connectOverCDP(CONFIG.cdpUrl);
    
    // Get the default context and first page
    const contexts = browser.contexts();
    if (contexts.length === 0) {
      throw new Error('No browser contexts found');
    }
    context = contexts[0];
    
    const pages = context.pages();
    if (pages.length === 0) {
      throw new Error('No pages found');
    }
    
    // Find the Feedly page or use the first one
    page = pages.find(p => p.url().includes('feedly.com')) || pages[0];
    console.log(`Connected to page: ${page.url()}\n`);
    
  } catch (err) {
    console.error('Failed to connect to existing browser:', err.message);
    console.log('\nPlease start Edge with remote debugging:');
    console.log('  microsoft-edge --remote-debugging-port=9222\n');
    console.log('Then login to Feedly and run this script again.');
    process.exit(1);
  }
  
  // Results storage
  const allArticles = {};
  const summary = {
    scrapedAt: new Date().toISOString(),
    totalArticles: 0,
    boards: {}
  };
  
  // Scrape each board
  for (const boardName of BOARDS) {
    console.log(`\nScraping board: ${boardName}`);
    console.log('-'.repeat(40));
    
    try {
      // Navigate to the board
      const navigated = await navigateToBoard(page, boardName);
      
      if (!navigated) {
        console.log(`  ⚠ Could not find board: ${boardName}`);
        continue;
      }
      
      // Wait for articles to load
      await page.waitForSelector('article', { timeout: 10000 }).catch(() => {
        console.log(`  No articles found for ${boardName}`);
      });
      
      // Scroll to load more articles
      console.log('  Loading more articles...');
      await scrollToLoadMore(page, CONFIG.maxScrolls);
      
      // Extract articles
      const articles = await extractArticles(page);
      
      // Filter to last 12 months
      const recentArticles = articles.filter(a => 
        a.relativeDate && isWithinTimeframe(a.relativeDate, CONFIG.maxAgeMonths)
      );
      
      console.log(`  Found ${recentArticles.length} articles from last ${CONFIG.maxAgeMonths} months`);
      
      // Store results
      allArticles[boardName] = recentArticles;
      summary.boards[boardName] = {
        count: recentArticles.length,
        articles: recentArticles.map(a => ({
          title: a.title,
          date: a.date,
          url: a.url
        }))
      };
      summary.totalArticles += recentArticles.length;
      
      // Save individual board data
      const safeBoardName = boardName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const boardFilePath = path.join(CONFIG.outputDir, `${safeBoardName}.json`);
      await fs.writeFile(boardFilePath, JSON.stringify(recentArticles, null, 2));
      console.log(`  Saved to: ${boardFilePath}`);
      
    } catch (err) {
      console.error(`  Error scraping ${boardName}:`, err.message);
    }
  }
  
  // Save combined results
  const allArticlesPath = path.join(CONFIG.outputDir, 'all_articles.json');
  await fs.writeFile(allArticlesPath, JSON.stringify(allArticles, null, 2));
  console.log(`\nSaved all articles to: ${allArticlesPath}`);
  
  // Save summary
  const summaryPath = path.join(CONFIG.outputDir, 'summary.json');
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`Saved summary to: ${summaryPath}`);
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('SCRAPING COMPLETE');
  console.log('='.repeat(50));
  console.log(`Total articles: ${summary.totalArticles}`);
  console.log(`Boards scraped: ${Object.keys(summary.boards).length}`);
  console.log('\nArticles per board:');
  
  Object.entries(summary.boards)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([board, data]) => {
      if (data.count > 0) {
        console.log(`  ${board}: ${data.count}`);
      }
    });
}

// Run the exporter
scrapeBoards().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
