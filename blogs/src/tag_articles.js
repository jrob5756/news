#!/usr/bin/env node

/**
 * Feedly Article Tagger (API Version)
 * 
 * This script reads tagged.json and untagged.json, and uses Feedly's API
 * (executed via the browser's JavaScript context) to add articles to boards.
 * 
 * This is MUCH faster than the UI-based approach because:
 * - API calls are batched (multiple articles per request)
 * - No UI navigation delays
 * - Uses browser's existing authentication
 * 
 * Input files:
 *   - blogs/data/articles/tagged.json   - Articles to tag with _tagged
 *   - blogs/data/articles/untagged.json - Articles to tag with _untagged
 * 
 * Run with: node tag_articles.js
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
  dataDir: path.join(__dirname, '..', 'data', 'articles'),
  taggedFile: 'tagged.json',
  untaggedFile: 'untagged.json',
  processedFile: 'processed.json',
  batchSize: 25,           // Articles per API batch (Feedly supports up to 100)
  batchDelay: 500          // Delay between batches (ms)
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
 * Fix unescaped quotes in JSON string values
 */
function fixUnescapedQuotes(content) {
  const lines = content.split('\n');
  return lines.map(line => {
    // Match lines with string values for title, description, source
    const match = line.match(/^(\s*"(?:title|description|source)":\s*")(.*)(",?\s*)$/);
    if (match) {
      const prefix = match[1];
      let value = match[2];
      const suffix = match[3];
      // Escape any unescaped quotes in the value (quotes not preceded by backslash)
      value = value.replace(/(?<!\\)"/g, '\\"');
      return prefix + value + suffix;
    }
    return line;
  }).join('\n');
}

/**
 * Load articles from JSON file
 */
async function loadArticles(filename) {
  const filePath = path.join(CONFIG.dataDir, filename);
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    
    // Try parsing, if it fails try fixing unescaped quotes
    let data;
    try {
      data = JSON.parse(content);
    } catch (parseErr) {
      if (parseErr instanceof SyntaxError) {
        console.log(`   ⚠ Found JSON syntax error in ${filename}, attempting to fix...`);
        content = fixUnescapedQuotes(content);
        try {
          data = JSON.parse(content);
          // Save the fixed content back to file
          await fs.writeFile(filePath, content);
          console.log(`   ✓ Fixed and saved ${filename}`);
        } catch (e) {
          throw new Error(`Failed to parse ${filename} even after fix attempt: ${e.message}`);
        }
      } else {
        throw parseErr;
      }
    }
    
    return Array.isArray(data) ? data : (data.articles || []);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`   ⚠ File not found: ${filename}`);
      return [];
    }
    throw err;
  }
}

/**
 * Save processed articles list
 */
async function saveProcessed(processed) {
  const filePath = path.join(CONFIG.dataDir, CONFIG.processedFile);
  await fs.writeFile(filePath, JSON.stringify(processed, null, 2));
}

/**
 * Load previously processed articles
 */
async function loadProcessed() {
  const filePath = path.join(CONFIG.dataDir, CONFIG.processedFile);
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    
    try {
      return JSON.parse(content);
    } catch (parseErr) {
      if (parseErr instanceof SyntaxError) {
        console.log(`   ⚠ Found JSON syntax error in ${CONFIG.processedFile}, attempting to fix...`);
        content = fixUnescapedQuotes(content);
        try {
          const data = JSON.parse(content);
          await fs.writeFile(filePath, content);
          console.log(`   ✓ Fixed and saved ${CONFIG.processedFile}`);
          return data;
        } catch (e) {
          console.log(`   ⚠ Could not fix ${CONFIG.processedFile}, starting fresh`);
          return { tagged: [], untagged: [] };
        }
      }
      return { tagged: [], untagged: [] };
    }
  } catch {
    return { tagged: [], untagged: [] };
  }
}

/**
 * Get Feedly user ID and boards from the browser
 */
async function getFeedlyContext(page) {
  return await page.evaluate(async () => {
    // Try to get user ID from the page
    // Feedly stores it in various places
    let userId = null;
    let accessToken = null;
    let boards = [];
    
    // Method 1: Extract from current URL (most reliable for userId)
    // URL format: https://feedly.com/i/collection/content/user/UUID/category/...
    const urlMatch = window.location.href.match(/\/user\/([a-f0-9-]{36})\//i);
    if (urlMatch) {
      userId = urlMatch[1];
    }
    
    // Get access token from localStorage (Feedly stores it there)
    try {
      const session = localStorage.getItem('feedly.session');
      if (session) {
        const parsed = JSON.parse(session);
        accessToken = parsed.feedlyToken || parsed.accessToken || parsed.token;
        if (!userId) {
          userId = parsed.id || parsed.userId;
        }
      }
    } catch (e) {}
    
    // Try other localStorage keys for token
    if (!accessToken) {
      try {
        // Try common token storage patterns
        const tokenKeys = ['feedly.token', 'feedlyToken', 'access_token'];
        for (const key of tokenKeys) {
          const val = localStorage.getItem(key);
          if (val) {
            accessToken = val.replace(/^["']|["']$/g, ''); // Remove quotes if present
            break;
          }
        }
      } catch (e) {}
    }
    
    // Try to find token in sessionStorage
    if (!accessToken) {
      try {
        const session = sessionStorage.getItem('feedly.session');
        if (session) {
          const parsed = JSON.parse(session);
          accessToken = parsed.feedlyToken || parsed.accessToken || parsed.token;
        }
      } catch (e) {}
    }
    
    // Method 2: Look for it in the page's JavaScript context
    if (!userId && window.feedly && window.feedly.user) {
      userId = window.feedly.user.id;
    }
    if (!accessToken && window.feedly && window.feedly.user) {
      accessToken = window.feedly.user.token || window.feedly.user.accessToken;
    }
    
    // Method 3: Make an API call to get profile (if we have a token or cookies work)
    if (!userId || !accessToken) {
      try {
        const headers = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};
        const response = await fetch('https://feedly.com/v3/profile', {
          credentials: 'include',
          headers
        });
        if (response.ok) {
          const profile = await response.json();
          userId = userId || profile.id;
          // The profile response doesn't include the token
        }
      } catch (e) {}
    }
    
    // Get boards list (if we have auth)
    if (userId) {
      try {
        const headers = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};
        const response = await fetch('https://feedly.com/v3/tags', {
          credentials: 'include',
          headers
        });
        if (response.ok) {
          const tags = await response.json();
          boards = tags.filter(t => t.id && t.id.includes('/tag/')).map(t => ({
            id: t.id,
            label: t.label
          }));
        }
      } catch (e) {}
    }
    
    return { userId, accessToken, boards };
  });
}

/**
 * Find existing board by name or create reference to new one
 * IMPORTANT: This searches existing boards by label (display name) FIRST
 * to avoid creating duplicates when boards with matching names exist.
 */
async function ensureBoardExists(page, userId, boardName, accessToken) {
  return await page.evaluate(async ({ userId, boardName, accessToken }) => {
    // Check if board exists - search by LABEL first, not just ID
    try {
      const headers = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};
      const response = await fetch('https://feedly.com/v3/tags', {
        credentials: 'include',
        headers
      });
      if (response.ok) {
        const tags = await response.json();
        // Search for exact label match FIRST (case-sensitive)
        let existing = tags.find(t => t.label === boardName);
        if (existing) {
          return { success: true, tagId: existing.id, existed: true, foundBy: 'label' };
        }
        // Fallback: check if the constructed ID exists
        const tagId = `user/${userId}/tag/${boardName}`;
        existing = tags.find(t => t.id === tagId);
        if (existing) {
          return { success: true, tagId: existing.id, existed: true, foundBy: 'id' };
        }
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
    
    // Board doesn't exist - return the ID to use for creation
    const tagId = `user/${userId}/tag/${boardName}`;
    return { success: true, tagId, existed: false };
  }, { userId, boardName, accessToken });
}

/**
 * Tag articles with a board using Feedly API (batched)
 * Falls back to individual processing if batch fails
 */
async function tagArticlesBatch(page, articles, boardTagId, accessToken) {
  // Feedly's API endpoint: PUT /v3/tags/:tagId
  // Body: { entryIds: ["entry1", "entry2", ...] }
  
  const results = await page.evaluate(async ({ articles, boardTagId, accessToken }) => {
    const results = { success: [], failed: [], debug: {} };
    
    // Extract entry IDs from article URLs
    const entryIds = [];
    
    for (const article of articles) {
      let entryId = article.entryId;
      
      if (!entryId && article.feedlyUrl) {
        // Extract from feedlyUrl: https://feedly.com/i/entry/[entryId]
        // The URL may have _main suffix which is not part of the entry ID
        const match = article.feedlyUrl.match(/\/entry\/([^/?]+)/);
        if (match) {
          entryId = decodeURIComponent(match[1]);
          // Remove _main or _preview suffix if present
          entryId = entryId.replace(/_(?:main|preview)$/, '');
        }
      }
      
      if (entryId) {
        entryIds.push({ entryId, article });
      } else {
        results.failed.push({ 
          title: article.title, 
          reason: 'Could not determine entry ID' 
        });
      }
    }
    
    // Debug: Log first 3 entry IDs
    results.debug.sampleEntryIds = entryIds.slice(0, 3).map(e => e.entryId);
    results.debug.totalEntryIds = entryIds.length;
    
    if (entryIds.length === 0) {
      return results;
    }
    
    // Helper function to tag a single article
    async function tagSingle(entryId, article) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
        
        const response = await fetch(`https://feedly.com/v3/tags/${encodeURIComponent(boardTagId)}`, {
          method: 'PUT',
          credentials: 'include',
          headers,
          body: JSON.stringify({ entryIds: [entryId] })
        });
        
        if (response.ok || response.status === 200 || response.status === 204) {
          return { success: true };
        } else {
          const errorText = await response.text();
          return { success: false, error: `API error ${response.status}: ${errorText}` };
        }
      } catch (err) {
        return { success: false, error: `Request failed: ${err.message}` };
      }
    }
    
    // Try batch first
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      
      const apiUrl = `https://feedly.com/v3/tags/${encodeURIComponent(boardTagId)}`;
      const payload = { entryIds: entryIds.map(e => e.entryId) };
      
      // Debug log
      results.debug.apiUrl = apiUrl;
      results.debug.payloadSample = JSON.stringify(payload).substring(0, 200);
      results.debug.boardTagId = boardTagId;
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (response.ok || response.status === 200 || response.status === 204) {
        results.success = entryIds.map(e => e.article);
        return results;
      }
      
      // Batch failed - fall back to individual processing
      const errorText = await response.text();
      
      // Only fall back for 400 errors (bad entry IDs), not for auth issues
      if (response.status !== 400) {
        results.failed = entryIds.map(e => ({
          title: e.article.title,
          reason: `API error ${response.status}: ${errorText}`
        }));
        return results;
      }
      
      // Process individually to find which ones work
      for (const { entryId, article } of entryIds) {
        const result = await tagSingle(entryId, article);
        if (result.success) {
          results.success.push(article);
        } else {
          results.failed.push({ title: article.title, reason: result.error });
        }
      }
      
    } catch (err) {
      results.failed = entryIds.map(e => ({
        title: e.article.title,
        reason: `Request failed: ${err.message}`
      }));
    }
    
    return results;
  }, { articles, boardTagId, accessToken });
  
  return results;
}

/**
 * Main tagging function
 */
async function tagArticles() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          FEEDLY ARTICLE TAGGER (API MODE)                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  let browser;
  let page;

  try {
    // Load article lists
    console.log('📂 Loading article lists...');
    const taggedArticles = await loadArticles(CONFIG.taggedFile);
    const untaggedArticles = await loadArticles(CONFIG.untaggedFile);
    const processed = await loadProcessed();
    
    console.log(`   ✓ Tagged articles: ${taggedArticles.length}`);
    console.log(`   ✓ Untagged articles: ${untaggedArticles.length}`);
    console.log(`   ✓ Already processed: ${processed.tagged.length + processed.untagged.length}\n`);

    // Filter out already processed
    const pendingTagged = taggedArticles.filter(a => 
      !processed.tagged.includes(a.url || a.title)
    );
    const pendingUntagged = untaggedArticles.filter(a => 
      !processed.untagged.includes(a.url || a.title)
    );

    if (pendingTagged.length === 0 && pendingUntagged.length === 0) {
      console.log('✅ All articles already processed!\n');
      return;
    }

    console.log(`📋 Pending: ${pendingTagged.length} to tag, ${pendingUntagged.length} to untag\n`);

    // Connect to browser
    console.log('📡 Connecting to browser on port 9222...');
    browser = await chromium.connectOverCDP(CONFIG.cdpUrl);
    
    const contexts = browser.contexts();
    if (contexts.length === 0) throw new Error('No browser contexts found');
    
    const pages = contexts[0].pages();
    page = pages.find(p => p.url().includes('feedly.com')) || pages[0];
    
    // Check login status
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('auth') || currentUrl.includes('homepage')) {
      console.log('\n⚠️  Please log in to Feedly in the browser window.\n');
      await waitForEnter('   Press ENTER when ready to continue...');
      await page.waitForTimeout(2000);
    }
    
    console.log(`\n✓ Connected to: ${page.url()}\n`);

    // Get Feedly context (user ID, existing boards)
    console.log('🔑 Getting Feedly context...');
    const context = await getFeedlyContext(page);
    
    if (!context.userId) {
      throw new Error('Could not get Feedly user ID. Make sure you are logged in.');
    }
    
    console.log(`   ✓ User ID: ${context.userId.substring(0, 20)}...`);
    if (context.accessToken) {
      console.log(`   ✓ Access token found`);
    } else {
      console.log(`   ⚠ No access token found - will try with cookies only`);
    }
    console.log(`   ✓ Found ${context.boards.length} existing boards\n`);

    // Get access token first (needed for board lookup)
    const accessToken = context.accessToken;
    
    // Ensure _tagged and _untagged boards exist
    console.log('🏷️  Ensuring boards exist...');
    const taggedBoard = await ensureBoardExists(page, context.userId, '_tagged', accessToken);
    const untaggedBoard = await ensureBoardExists(page, context.userId, '_untagged', accessToken);
    
    const taggedBoardId = taggedBoard.tagId;
    const untaggedBoardId = untaggedBoard.tagId;
    
    if (!taggedBoard.success || !untaggedBoard.success) {
      throw new Error('Failed to ensure boards exist. Check authentication.');
    }
    
    const taggedStatus = taggedBoard.existed 
      ? `found existing (by ${taggedBoard.foundBy})` 
      : 'will create on first use';
    const untaggedStatus = untaggedBoard.existed 
      ? `found existing (by ${untaggedBoard.foundBy})` 
      : 'will create on first use';
    
    console.log(`   ✓ _tagged board: ${taggedStatus}`);
    console.log(`   ✓ _untagged board: ${untaggedStatus}`);
    console.log(`   ℹ _tagged ID: ${taggedBoardId}`);
    console.log(`   ℹ _untagged ID: ${untaggedBoardId}\n`);

    // Process tagged articles in batches
    if (pendingTagged.length > 0) {
      console.log('🏷️  Processing _tagged articles via API...\n');
      
      for (let i = 0; i < pendingTagged.length; i += CONFIG.batchSize) {
        const batch = pendingTagged.slice(i, i + CONFIG.batchSize);
        const batchNum = Math.floor(i / CONFIG.batchSize) + 1;
        const totalBatches = Math.ceil(pendingTagged.length / CONFIG.batchSize);
        
        console.log(`   Batch ${batchNum}/${totalBatches} (${batch.length} articles)...`);
        
        const results = await tagArticlesBatch(page, batch, taggedBoardId, accessToken);
        
        // Update processed list
        for (const article of results.success) {
          processed.tagged.push(article.url || article.title);
        }
        
        console.log(`   ✓ Success: ${results.success.length}, Failed: ${results.failed.length}`);
        
        if (results.failed.length > 0) {
          results.failed.forEach(f => 
            console.log(`     - ${f.title?.substring(0, 50)}: ${f.reason}`)
          );
        }
        
        await saveProcessed(processed);
        
        if (i + CONFIG.batchSize < pendingTagged.length) {
          await page.waitForTimeout(CONFIG.batchDelay);
        }
      }
    }

    // Process untagged articles in batches
    if (pendingUntagged.length > 0) {
      console.log('\n🏷️  Processing _untagged articles via API...\n');
      
      for (let i = 0; i < pendingUntagged.length; i += CONFIG.batchSize) {
        const batch = pendingUntagged.slice(i, i + CONFIG.batchSize);
        const batchNum = Math.floor(i / CONFIG.batchSize) + 1;
        const totalBatches = Math.ceil(pendingUntagged.length / CONFIG.batchSize);
        
        console.log(`   Batch ${batchNum}/${totalBatches} (${batch.length} articles)...`);
        
        const results = await tagArticlesBatch(page, batch, untaggedBoardId, accessToken);
        
        // Update processed list
        for (const article of results.success) {
          processed.untagged.push(article.url || article.title);
        }
        
        console.log(`   ✓ Success: ${results.success.length}, Failed: ${results.failed.length}`);
        
        if (results.failed.length > 0) {
          results.failed.forEach(f => 
            console.log(`     - ${f.title?.substring(0, 50)}: ${f.reason}`)
          );
        }
        
        await saveProcessed(processed);
        
        if (i + CONFIG.batchSize < pendingUntagged.length) {
          await page.waitForTimeout(CONFIG.batchDelay);
        }
      }
    }

    // Summary
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    TAGGING COMPLETE                        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log(`📊 Summary:`);
    console.log(`   Total tagged: ${processed.tagged.length}`);
    console.log(`   Total untagged: ${processed.untagged.length}\n`);

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
tagArticles();
