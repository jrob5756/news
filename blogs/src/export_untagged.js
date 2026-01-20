#!/usr/bin/env node

/**
 * Feedly Untagged Feed Exporter
 * 
 * This script exports up to 100 articles from the "All" feed that are NOT
 * already tagged with _tagged or _untagged boards.
 * 
 * Output: blogs/data/articles/raw.json
 * 
 * Run with: node export_untagged.js
 * 
 * Prerequisites:
 * - Edge running with: msedge.exe --remote-debugging-port=9222
 * - Logged into Feedly
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Configuration
const CONFIG = {
  mode: process.env.SCRAPER_MODE || 'cdp',
  cdpUrl: 'http://localhost:9222',
  outputDir: path.join(__dirname, '..', 'data', 'articles'),
  outputFile: 'raw.json',
  maxArticles: 100,
  scrollDelay: 800,
  navigationDelay: 2000,
  maxScrolls: 50,
  excludeBoards: ['_tagged', '_untagged']
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
 * Main export function
 */
async function scrapeUntaggedFeed() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          FEEDLY UNTAGGED FEED EXPORTER                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Ensure output directory exists
  await fs.mkdir(CONFIG.outputDir, { recursive: true });

  let browser;
  let page;

  try {
    // Connect to existing browser via CDP
    console.log('📡 Connecting to browser on port 9222...');
    browser = await chromium.connectOverCDP(CONFIG.cdpUrl);
    
    const contexts = browser.contexts();
    if (contexts.length === 0) throw new Error('No browser contexts found');
    
    const pages = contexts[0].pages();
    page = pages.find(p => p.url().includes('feedly.com')) || pages[0];
    
    // Navigate to All feed
    console.log('📡 Navigating to All feed...');
    
    // Check if already on the All feed
    let currentUrl = page.url();
    let isOnAllFeed = currentUrl.includes('global.all');
    
    if (!isOnAllFeed) {
      // Click the "All" button in the sidebar under "Feeds" section
      console.log('   Clicking All feed button in sidebar...');
      
      // Method 1: Try to find and click button containing "All" with a number
      let clicked = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          // Get text, normalize whitespace
          const text = btn.textContent?.replace(/\s+/g, ' ').trim();
          // Look for "All" followed by digits (the count)
          if (text && /All\s*\d+/.test(text) && !text.includes('Show')) {
            btn.click();
            return { clicked: true, text, method: 'textContent match' };
          }
        }
        return { clicked: false };
      });
      
      // Method 2: If that didn't work, look for button with inner text "All" near a number
      if (!clicked.clicked) {
        clicked = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            // Check if button has a child with just "All" text and another with just digits
            const children = btn.querySelectorAll('*');
            let hasAll = false;
            let hasNumber = false;
            for (const child of children) {
              const t = child.textContent?.trim();
              if (t === 'All') hasAll = true;
              if (t && /^\d+$/.test(t)) hasNumber = true;
            }
            if (hasAll && hasNumber && !btn.textContent.includes('Show Feeds')) {
              btn.click();
              return { clicked: true, text: btn.textContent?.trim(), method: 'child element match' };
            }
          }
          return { clicked: false };
        });
      }
      
      // Method 3: Use Playwright's built-in locator
      if (!clicked.clicked) {
        try {
          // Look for button that has "All" text followed by a number
          const allButton = page.locator('button:has-text("All")').filter({ hasText: /^All\s*\d+/ }).first();
          if (await allButton.count() > 0) {
            await allButton.click();
            clicked = { clicked: true, text: 'Playwright locator', method: 'locator' };
          }
        } catch (e) {
          // Continue to next method
        }
      }
      
      if (clicked.clicked) {
        console.log(`   ✓ Clicked via ${clicked.method}: "${clicked.text}"`);
        await page.waitForTimeout(CONFIG.navigationDelay);
        
        // Wait for navigation to complete
        await page.waitForTimeout(1000);
      } else {
        console.log('   ⚠️  Could not find All button automatically');
      }
    } else {
      console.log('   ✓ Already on All feed');
    }
    
    // Final check - verify we're on All feed
    currentUrl = page.url();
    isOnAllFeed = currentUrl.includes('global.all');
    
    if (!isOnAllFeed) {
      // One more attempt: try clicking using keyboard navigation
      console.log('   Attempting keyboard navigation to All feed...');
      await page.keyboard.press('g');
      await page.waitForTimeout(200);
      await page.keyboard.press('a');
      await page.waitForTimeout(CONFIG.navigationDelay);
      
      currentUrl = page.url();
      isOnAllFeed = currentUrl.includes('global.all');
    }
    
    if (!isOnAllFeed) {
      console.log('\n⚠️  Could not navigate to All feed automatically.');
      console.log('   Current URL:', currentUrl);
      console.log('   Please navigate to All feed manually.\n');
      await waitForEnter('   Press ENTER when ready to continue...');
      await page.waitForTimeout(2000);
    }
    
    // Check if we need to log in
    currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('auth') || currentUrl.includes('homepage')) {
      console.log('\n⚠️  Please log in to Feedly in the browser window.');
      console.log('   Then navigate to the All feed.\n');
      
      await waitForEnter('   Press ENTER when ready to continue...');
      await page.waitForTimeout(2000);
    }
    
    console.log(`\n✓ Connected to: ${page.url()}\n`);

    // Scroll to load articles until we reach bottom or get max articles
    console.log('📜 Scrolling to load articles...');
    
    // Find the scrollable container - Feedly uses a specific container, not window scroll
    const scrollContainerSelector = await page.evaluate(() => {
      // Common Feedly scrollable container selectors
      const selectors = [
        '[data-testid="article-list"]',
        '.feed-content',
        '.StreamList',
        '[role="main"]',
        'main',
        '.list-entries',
        '#feedlyPageFX'
      ];
      
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.scrollHeight > el.clientHeight) {
          return sel;
        }
      }
      
      // Fallback: find any large scrollable container
      const allDivs = document.querySelectorAll('div');
      for (const div of allDivs) {
        if (div.scrollHeight > 1000 && div.scrollHeight > div.clientHeight) {
          // Check if it contains articles
          if (div.querySelector('article')) {
            div.setAttribute('data-scroll-target', 'true');
            return '[data-scroll-target="true"]';
          }
        }
      }
      
      return null;
    });
    
    console.log(`   Scroll container: ${scrollContainerSelector || 'window'}`);
    
    let lastScrollHeight = 0;
    let noChangeCount = 0;
    const maxNoChangeAttempts = 10; // More attempts to confirm we've hit bottom
    
    while (true) {
      // Get current article counts (total and untagged) and scroll height
      const { totalCount, untaggedCount, scrollHeight } = await page.evaluate(({ selector, excludeBoards }) => {
        const container = selector ? document.querySelector(selector) : null;
        const articles = document.querySelectorAll('article');
        
        let untagged = 0;
        articles.forEach(article => {
          const boards = [];
          article.querySelectorAll('svg[title*="Board"]').forEach(svg => {
            const title = svg.getAttribute('title');
            if (title) {
              const boardName = title.replace(/\s*Board\s*$/i, '').trim();
              if (boardName) boards.push(boardName);
            }
          });
          const hasExcludedBoard = boards.some(b => excludeBoards.includes(b));
          if (!hasExcludedBoard) untagged++;
        });
        
        return {
          totalCount: articles.length,
          untaggedCount: untagged,
          scrollHeight: container ? container.scrollHeight : document.body.scrollHeight
        };
      }, { selector: scrollContainerSelector, excludeBoards: CONFIG.excludeBoards });
      
      console.log(`   Loaded ${totalCount} articles (${untaggedCount} untagged, scroll height: ${scrollHeight}px)...`);
      
      // Check if we have enough UNTAGGED articles
      if (untaggedCount >= CONFIG.maxArticles) {
        console.log(`   ✓ Reached ${untaggedCount} untagged articles (target: ${CONFIG.maxArticles})`);
        break;
      }
      
      // Check if we've hit the bottom (no change in scroll height)
      if (scrollHeight === lastScrollHeight) {
        noChangeCount++;
        console.log(`   No new content (attempt ${noChangeCount}/${maxNoChangeAttempts})...`);
        
        if (noChangeCount >= maxNoChangeAttempts) {
          console.log(`   ✓ Reached bottom of feed with ${untaggedCount} untagged articles`);
          break;
        }
      } else {
        noChangeCount = 0; // Reset counter when we get new content
      }
      
      lastScrollHeight = scrollHeight;
      
      // Scroll to bottom of the appropriate container
      await page.evaluate((selector) => {
        const container = selector ? document.querySelector(selector) : null;
        if (container) {
          container.scrollTop = container.scrollHeight;
        } else {
          window.scrollTo(0, document.body.scrollHeight);
        }
      }, scrollContainerSelector);
      await page.waitForTimeout(CONFIG.scrollDelay);
    }

    // Extract articles
    console.log('\n📋 Extracting articles...');
    
    const articles = await page.evaluate((excludeBoards) => {
      const results = [];
      const articleElements = document.querySelectorAll('article');
      
      articleElements.forEach((article, index) => {
        try {
          // Get title and URL from the link
          const titleLink = article.querySelector('p a');
          const title = titleLink?.textContent?.trim();
          const url = titleLink?.href;
          
          if (!title || !url) return;
          
          // Get source from the metadata
          const allText = article.textContent;
          let source = null;
          let relativeDate = null;
          
          // Pattern: "Source / 2d" or "100+ Source / 7mo"
          const datePatterns = allText.match(/([^\/\n]+?)\s*\/\s*(\d+(?:min|h|d|w|mo|y))/g);
          if (datePatterns && datePatterns.length > 0) {
            const lastMatch = datePatterns[datePatterns.length - 1];
            const parts = lastMatch.match(/(.+?)\s*\/\s*(\d+(?:min|h|d|w|mo|y))/);
            if (parts) {
              source = parts[1].replace(/^\d+\+?\s*/, '').trim();
              relativeDate = parts[2];
            }
          }
          
          // Get description - find the longest text block
          let description = '';
          article.querySelectorAll('div').forEach(node => {
            const text = node.textContent?.trim();
            if (text && text.length > description.length && text.length > 100) {
              if (!text.includes(' / ') || text.length > 200) {
                description = text.substring(0, 500);
              }
            }
          });
          
          // Get board tags - look for elements with board indicators
          // The structure is: <a role="button"> containing <svg title="_tagged Board"> and <span>_tagged</span>
          const boards = [];
          
          // Method 1: Look for SVG elements with title containing "Board"
          article.querySelectorAll('svg[title*="Board"]').forEach(svg => {
            const title = svg.getAttribute('title');
            if (title) {
              // Extract board name from title (e.g., "_tagged Board" -> "_tagged")
              const boardName = title.replace(/\s*Board\s*$/i, '').trim();
              if (boardName) {
                boards.push(boardName);
              }
            }
          });
          
          // Method 2: Also check for anchor elements with role="button" that have board info
          if (boards.length === 0) {
            article.querySelectorAll('a[role="button"]').forEach(a => {
              const svg = a.querySelector('svg[title*="Board"]');
              if (svg) {
                const title = svg.getAttribute('title');
                const boardName = title?.replace(/\s*Board\s*$/i, '').trim();
                if (boardName) {
                  boards.push(boardName);
                }
              }
            });
          }
          
          // Check if article is already tagged with excluded boards (_tagged or _untagged)
          const hasExcludedBoard = boards.some(b => excludeBoards.includes(b));
          if (hasExcludedBoard) return;
          
          // Get the article's data-entry-id for Feedly URL
          // The entry ID is usually in a data attribute or can be extracted from click behavior
          const entryId = article.getAttribute('data-entry-id') || 
                          article.id || 
                          `article-${index}`;
          
          results.push({
            title,
            url,
            description,
            source,
            relativeDate,
            boards,
            entryId
          });
        } catch (e) {
          console.error('Error parsing article:', e);
        }
      });
      
      return results;
    }, CONFIG.excludeBoards);

    // Limit to max articles
    const filteredArticles = articles.slice(0, CONFIG.maxArticles);
    
    console.log(`\n✓ Found ${articles.length} untagged articles`);
    console.log(`✓ Saving ${filteredArticles.length} articles\n`);

    // Format output
    const output = {
      scrapedAt: new Date().toISOString(),
      sourceUrl: page.url(),
      articleCount: filteredArticles.length,
      articles: filteredArticles.map(a => ({
        title: a.title,
        url: a.url,
        description: a.description,
        source: a.source,
        feedlyUrl: `https://feedly.com/i/entry/${encodeURIComponent(a.entryId)}`
      }))
    };

    // Save to file
    const outputPath = path.join(CONFIG.outputDir, CONFIG.outputFile);
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    SCRAPING COMPLETE                       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log(`📊 Summary:`);
    console.log(`   Articles saved: ${filteredArticles.length}`);
    console.log(`   Output file: ${outputPath}\n`);
    
    console.log('📝 Next steps:');
    console.log('   1. Review raw.json and create tagged.json / untagged.json');
    console.log('   2. Run: node tag_articles.js\n');

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    console.log('\n💡 Make sure Edge is running with remote debugging:');
    console.log('   Windows: & "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222');
    console.log('   Linux:   microsoft-edge --remote-debugging-port=9222\n');
    process.exit(1);
  } finally {
    if (browser) {
      browser.close().catch(() => {});
    }
    console.log('✅ Done!\n');
    process.exit(0);
  }
}

// Run
scrapeUntaggedFeed();
