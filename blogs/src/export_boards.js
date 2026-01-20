#!/usr/bin/env node

/**
 * Feedly Board Exporter - Automated Full Export
 * 
 * This script automates the entire export process:
 * 1. Launches browser (with persistent session)
 * 2. Gets all boards from Feedly sidebar
 * 3. Clicks on each board
 * 4. Scrolls to load articles
 * 5. Extracts article data
 * 6. Saves to JSON files
 * 
 * Run with: node export_boards.js
 * 
 * First run: You'll need to log into Feedly manually.
 * Subsequent runs: Uses saved session cookies.
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const readline = require('readline');

// Configuration
const CONFIG = {
  // Connection mode: 'cdp' connects to existing browser, 'launch' opens new browser
  mode: process.env.SCRAPER_MODE || 'cdp',
  cdpUrl: 'http://localhost:9222',
  userDataDir: path.join(__dirname, '.browser-data'),
  outputDir: path.join(__dirname, '..', 'data', 'boards'),
  maxAgeDays: 7,
  scrollDelay: 800,
  navigationDelay: 2000,
  maxScrolls: 30,
  headless: false
};

/**
 * Wait for user to press Enter
 */
function waitForEnter(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * Parse relative date to actual date
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

function isWithinDays(relativeStr, days) {
  const date = parseRelativeDate(relativeStr);
  if (!date) return true;
  
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date >= cutoff;
}

function cleanSource(sourceStr) {
  if (!sourceStr) return null;
  return sourceStr
    .split('•').pop()
    .replace(/^\d+\+?\s*/, '')
    .trim();
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

/**
 * Main export function
 */
async function scrapeAllBoards() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          FEEDLY BOARD EXPORTER - FULL AUTOMATION          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Ensure output directory exists
  await fs.mkdir(CONFIG.outputDir, { recursive: true });

  let browser;
  let context;
  let page;

  try {
    if (CONFIG.mode === 'cdp') {
      // Connect to existing browser via CDP
      console.log('📡 Connecting to browser on port 9222...');
      browser = await chromium.connectOverCDP(CONFIG.cdpUrl);
      
      const contexts = browser.contexts();
      if (contexts.length === 0) throw new Error('No browser contexts found');
      
      const pages = contexts[0].pages();
      page = pages.find(p => p.url().includes('feedly.com')) || pages[0];
      
      // Navigate to Feedly if not already there
      if (!page.url().includes('feedly.com')) {
        console.log('📡 Navigating to Feedly...');
        await page.goto('https://feedly.com/i/my', { waitUntil: 'networkidle', timeout: 30000 });
      }
    } else {
      // Launch browser with persistent context
      console.log('🚀 Launching browser...');
      context = await chromium.launchPersistentContext(CONFIG.userDataDir, {
        headless: CONFIG.headless,
        channel: 'msedge',
        viewport: { width: 1280, height: 900 }
      });
      
      page = context.pages()[0] || await context.newPage();
      
      console.log('📡 Navigating to Feedly...');
      await page.goto('https://feedly.com/i/my', { waitUntil: 'networkidle', timeout: 30000 });
    }
    
    // Check if we need to log in or wait for user
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('auth') || currentUrl.includes('homepage')) {
      console.log('\n⚠️  Please log in to Feedly in the browser window.');
      console.log('   Then navigate to a page where you can see your boards in the sidebar.\n');
      
      await waitForEnter('   Press ENTER when ready to continue...');
      await page.waitForTimeout(2000);
    }
    
    console.log(`\n✓ Connected to: ${page.url()}\n`);

    // Step 1: Get all board names from sidebar
    console.log('📋 Step 1: Getting board list from sidebar...');
    
    const boards = await page.evaluate(() => {
      // Find the Boards h3 heading
      const boardsH3 = Array.from(document.querySelectorAll('h3')).find(h => h.textContent?.trim() === 'Boards');
      if (!boardsH3) return [];
      
      // Find the section container that holds the boards
      const section = boardsH3.closest('.LeftnavSection');
      if (!section) return [];
      
      // Get all labels within this specific section only
      const labels = Array.from(section.querySelectorAll('.LeftnavItem__label'));
      const boardNames = labels.map(s => s.textContent?.trim()).filter(t => 
        t && t !== 'Boards' && !t.includes('Create New')
      );
      
      return boardNames;
    });

    // Filter out system boards (starting with _ or named _tagged/_untagged)
    const filteredBoards = boards.filter(b => !b.startsWith('_') && b !== 'tagged' && b !== 'untagged');
    
    console.log(`✓ Found ${boards.length} boards (${boards.length - filteredBoards.length} system boards excluded):\n`);
    filteredBoards.forEach((b, i) => console.log(`   ${String(i + 1).padStart(2)}. ${b}`));
    console.log('');

    // Step 2: Scrape each board
    console.log('📚 Step 2: Scraping each board...\n');
    
    const allResults = {};
    const summary = {
      scrapedAt: new Date().toISOString(),
      totalArticles: 0,
      boards: {}
    };

    for (let i = 0; i < filteredBoards.length; i++) {
      const boardName = filteredBoards[i];
      const progress = `[${i + 1}/${filteredBoards.length}]`;
      
      console.log(`${progress} 📂 ${boardName}`);
      
      try {
        // Click on the board - boards are divs with role="button" containing a label span
        const clicked = await page.evaluate((name) => {
          // Find the label span with matching text
          const labels = document.querySelectorAll('.LeftnavItem__label');
          for (const label of labels) {
            if (label.textContent?.trim() === name) {
              // Find the clickable parent (div with role="button")
              const clickable = label.closest('[role="button"]') || label.closest('button');
              if (clickable) {
                clickable.click();
                return true;
              }
            }
          }
          return false;
        }, boardName);

        if (!clicked) {
          console.log(`   ⚠ Could not find board button`);
          continue;
        }

        // Wait for navigation
        await page.waitForTimeout(CONFIG.navigationDelay);

        // Scroll to load more articles
        let lastCount = 0;
        let scrolls = 0;
        
        while (scrolls < CONFIG.maxScrolls) {
          const count = await page.evaluate(() => document.querySelectorAll('article').length);
          
          if (count === lastCount) break;
          lastCount = count;
          
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(CONFIG.scrollDelay);
          scrolls++;
          
          // Check if oldest visible article is beyond our timeframe
          const oldestDate = await page.evaluate(() => {
            const articles = document.querySelectorAll('article');
            if (articles.length === 0) return null;
            const last = articles[articles.length - 1];
            const text = last.textContent;
            const match = text.match(/\/\s*(\d+(?:mo|y))/);
            return match ? match[1] : null;
          });
          
          if (oldestDate) {
            const days = oldestDate.includes('y') 
              ? parseInt(oldestDate) * 365 
              : oldestDate.includes('mo')
              ? parseInt(oldestDate) * 30
              : parseInt(oldestDate);
            if (days > CONFIG.maxAgeDays) break;
          }
        }

        // Extract articles
        const articles = await page.evaluate(() => {
          const results = [];
          document.querySelectorAll('article').forEach(article => {
            try {
              const titleLink = article.querySelector('p a');
              const title = titleLink?.textContent?.trim();
              const url = titleLink?.href;
              
              if (!title || !url) return;
              
              const allText = article.textContent;
              let source = null;
              let relativeDate = null;
              
              const datePatterns = allText.match(/([^\/\n]+?)\s*\/\s*(\d+(?:min|h|d|w|mo|y))/g);
              if (datePatterns && datePatterns.length > 0) {
                const lastMatch = datePatterns[datePatterns.length - 1];
                const parts = lastMatch.match(/(.+?)\s*\/\s*(\d+(?:min|h|d|w|mo|y))/);
                if (parts) {
                  source = parts[1].replace(/^\d+\+?\s*/, '').trim();
                  relativeDate = parts[2];
                }
              }
              
              // Get description
              let description = '';
              article.querySelectorAll('div').forEach(node => {
                const text = node.textContent?.trim();
                if (text && text.length > description.length && text.length > 100) {
                  if (!text.includes(' / ') || text.length > 200) {
                    description = text.substring(0, 400);
                  }
                }
              });
              
              // Get board tags
              const boards = [];
              article.querySelectorAll('button img[alt*="Board"]').forEach(img => {
                boards.push(img.alt.replace(' Board', ''));
              });
              
              results.push({ title, url, source, relativeDate, description, boards });
            } catch (e) {}
          });
          return results;
        });

        // Filter by age and process
        const filteredArticles = articles
          .filter(a => isWithinDays(a.relativeDate, CONFIG.maxAgeDays))
          .map(a => ({
            title: a.title,
            url: a.url,
            source: cleanSource(a.source),
            date: formatDate(parseRelativeDate(a.relativeDate)),
            relativeDate: a.relativeDate,
            description: a.description,
            otherBoards: a.boards.filter(b => b !== boardName)
          }));

        console.log(`   ✓ ${filteredArticles.length} articles (last ${CONFIG.maxAgeDays} days)`);

        // Save to individual file
        const filename = sanitizeFilename(boardName) + '.json';
        const filePath = path.join(CONFIG.outputDir, filename);
        
        const boardData = {
          board: boardName,
          scrapedAt: new Date().toISOString(),
          articleCount: filteredArticles.length,
          articles: filteredArticles
        };
        
        await fs.writeFile(filePath, JSON.stringify(boardData, null, 2));

        // Add to combined results
        allResults[boardName] = filteredArticles;
        summary.totalArticles += filteredArticles.length;
        summary.boards[boardName] = {
          count: filteredArticles.length,
          file: filename
        };

      } catch (err) {
        console.log(`   ✗ Error: ${err.message}`);
      }
    }

    // Save combined results
    console.log('\n💾 Saving combined results...');
    
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'all_articles.json'),
      JSON.stringify(allResults, null, 2)
    );
    
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );

    // Print summary
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    SCRAPING COMPLETE                       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log(`📊 Summary:`);
    console.log(`   Total articles: ${summary.totalArticles}`);
    console.log(`   Boards scraped: ${Object.keys(summary.boards).length}`);
    console.log(`   Output folder:  ${CONFIG.outputDir}\n`);
    
    console.log('📁 Files created:');
    console.log('   • all_articles.json (combined)');
    console.log('   • summary.json');
    
    const topBoards = Object.entries(summary.boards)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
    
    console.log('\n🏆 Top 10 boards by article count:');
    topBoards.forEach(([board, data], i) => {
      console.log(`   ${String(i + 1).padStart(2)}. ${board.padEnd(30)} ${data.count} articles`);
    });

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    if (CONFIG.mode === 'cdp') {
      console.log('\n💡 Make sure Edge is running with remote debugging:');
      console.log('   Windows: & "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222');
      console.log('   Linux:   microsoft-edge --remote-debugging-port=9222\n');
    } else {
      console.log('\n💡 Try deleting the browser data and running again:');
      console.log(`   rm -rf "${CONFIG.userDataDir}"\n`);
    }
    process.exit(1);
  } finally {
    // Clean up connections
    if (context) {
      await context.close();
    }
    if (browser) {
      browser.close().catch(() => {});  // Disconnect from CDP
    }
    console.log('\n✅ Done!\n');
    process.exit(0);
  }
}

// Run
scrapeAllBoards();
