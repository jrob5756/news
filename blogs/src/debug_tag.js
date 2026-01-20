#!/usr/bin/env node

/**
 * Debug script to test Feedly tagging API
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function debug() {
  console.log('\n🔍 DEBUG: Testing Feedly Tag API...\n');

  let browser;
  let page;

  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    const pages = contexts[0].pages();
    page = pages.find(p => p.url().includes('feedly.com')) || pages[0];
    
    console.log(`✓ Connected to: ${page.url()}\n`);

    // Load one article from tagged.json
    const dataDir = path.join(__dirname, '..', 'data', 'articles');
    const content = await fs.readFile(path.join(dataDir, 'tagged.json'), 'utf-8');
    const data = JSON.parse(content);
    const articles = Array.isArray(data) ? data : (data.articles || []);
    
    if (articles.length === 0) {
      console.log('No articles found in tagged.json');
      return;
    }
    
    const testArticle = articles[0];
    console.log(`📰 Test article: ${testArticle.title?.substring(0, 50)}...`);
    console.log(`   URL: ${testArticle.feedlyUrl}\n`);

    // Run comprehensive debug in browser context
    const result = await page.evaluate(async ({ feedlyUrl }) => {
      const debug = {};
      let accessToken = null;
      
      // Step 1: Get session info and extract token
      try {
        const session = localStorage.getItem('feedly.session');
        if (session) {
          const parsed = JSON.parse(session);
          debug.userId = parsed.id;
          accessToken = parsed.feedlyToken || parsed.accessToken || parsed.token;
          debug.hasToken = !!accessToken;
          debug.tokenType = parsed.feedlyToken ? 'feedlyToken' : (parsed.accessToken ? 'accessToken' : 'token');
          debug.tokenPreview = accessToken ? accessToken.substring(0, 20) + '...' : 'none';
        }
      } catch (e) {
        debug.sessionError = e.message;
      }
      
      // Helper to make authenticated requests
      function authFetch(url, options = {}) {
        const headers = { ...options.headers };
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
        return fetch(url, { ...options, credentials: 'include', headers });
      }
      
      // Step 2: Get profile to verify auth
      try {
        const profileResp = await authFetch('https://feedly.com/v3/profile');
        debug.profileStatus = profileResp.status;
        if (profileResp.ok) {
          const profile = await profileResp.json();
          debug.profileId = profile.id;
          debug.email = profile.email;
        } else {
          debug.profileError = await profileResp.text();
        }
      } catch (e) {
        debug.profileError = e.message;
      }
      
      // Step 3: List all existing tags/boards
      try {
        const tagsResp = await authFetch('https://feedly.com/v3/tags');
        debug.tagsStatus = tagsResp.status;
        if (tagsResp.ok) {
          const tags = await tagsResp.json();
          debug.tagCount = tags.length;
          debug.tags = tags.map(t => ({ label: t.label, id: t.id }));
          // Find any _tagged or _untagged boards
          debug.taggedBoards = tags.filter(t => 
            t.label?.toLowerCase().includes('tagged') || 
            t.id?.toLowerCase().includes('tagged')
          );
        } else {
          debug.tagsError = await tagsResp.text();
        }
      } catch (e) {
        debug.tagsError = e.message;
      }
      
      // Step 4: Extract entry ID from feedlyUrl
      if (feedlyUrl) {
        const match = feedlyUrl.match(/\/entry\/([^/?]+)/);
        if (match) {
          debug.rawEntryId = match[1];
          debug.decodedEntryId = decodeURIComponent(match[1]).replace(/_(?:main|preview)$/, '');
        }
      }
      
      // Step 5: Try to get the entry directly to verify it exists
      if (debug.decodedEntryId) {
        try {
          const entryResp = await authFetch(`https://feedly.com/v3/entries/${encodeURIComponent(debug.decodedEntryId)}`);
          debug.entryStatus = entryResp.status;
          if (entryResp.ok) {
            const entry = await entryResp.json();
            debug.entryTitle = entry.title;
            debug.entryTags = entry.tags;
          } else {
            debug.entryError = await entryResp.text();
          }
        } catch (e) {
          debug.entryError = e.message;
        }
      }
      
      // Step 6: Try to tag the article and capture full response
      if (debug.profileId && debug.decodedEntryId) {
        const boardId = `user/${debug.profileId}/tag/_tagged`;
        debug.attemptedBoardId = boardId;
        
        try {
          const tagResp = await authFetch(`https://feedly.com/v3/tags/${encodeURIComponent(boardId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entryIds: [debug.decodedEntryId] })
          });
          debug.tagStatus = tagResp.status;
          debug.tagStatusText = tagResp.statusText;
          debug.tagHeaders = Object.fromEntries(tagResp.headers.entries());
          debug.tagResponse = await tagResp.text();
        } catch (e) {
          debug.tagError = e.message;
        }
        
        // Step 7: Re-fetch the entry to see if tag was applied
        await new Promise(r => setTimeout(r, 1000)); // Wait a second
        try {
          const entryResp2 = await authFetch(`https://feedly.com/v3/entries/${encodeURIComponent(debug.decodedEntryId)}`);
          if (entryResp2.ok) {
            const entry = await entryResp2.json();
            debug.entryTagsAfter = entry.tags;
          }
        } catch (e) {}
        
        // Step 8: Check if board now exists in tags list
        try {
          const tagsResp2 = await authFetch('https://feedly.com/v3/tags');
          if (tagsResp2.ok) {
            const tags = await tagsResp2.json();
            debug.boardExistsAfter = tags.some(t => t.id === boardId || t.label === '_tagged');
            debug.allBoardsAfter = tags.map(t => t.label);
          }
        } catch (e) {}
      }
      
      return debug;
    }, { feedlyUrl: testArticle.feedlyUrl });

    console.log('\n📊 DEBUG RESULTS:\n');
    console.log('=== SESSION ===');
    console.log(`   User ID: ${result.userId || 'NOT FOUND'}`);
    console.log(`   Has Token: ${result.hasToken}`);
    console.log(`   Token Type: ${result.tokenType}`);    console.log(`   Token Preview: ${result.tokenPreview}`);    
    console.log('\n=== PROFILE ===');
    console.log(`   Status: ${result.profileStatus}`);
    console.log(`   Profile ID: ${result.profileId || 'N/A'}`);
    console.log(`   Email: ${result.email || 'N/A'}`);
    
    console.log('\n=== TAGS/BOARDS ===');
    console.log(`   Status: ${result.tagsStatus}`);
    console.log(`   Tag Count: ${result.tagCount}`);
    if (result.taggedBoards?.length > 0) {
      console.log('   _tagged related boards:');
      result.taggedBoards.forEach(t => console.log(`      - ${t.label}: ${t.id}`));
    } else {
      console.log('   No _tagged related boards found');
    }
    
    console.log('\n=== ENTRY ID ===');
    console.log(`   Raw: ${result.rawEntryId?.substring(0, 60)}...`);
    console.log(`   Decoded: ${result.decodedEntryId?.substring(0, 60)}...`);
    
    console.log('\n=== ENTRY LOOKUP ===');
    console.log(`   Status: ${result.entryStatus}`);
    console.log(`   Title: ${result.entryTitle || 'N/A'}`);
    console.log(`   Tags Before: ${JSON.stringify(result.entryTags || [])}`);
    if (result.entryError) console.log(`   Error: ${result.entryError}`);
    
    console.log('\n=== TAG ATTEMPT ===');
    console.log(`   Board ID: ${result.attemptedBoardId}`);
    console.log(`   Status: ${result.tagStatus} ${result.tagStatusText}`);
    console.log(`   Response: ${result.tagResponse || '(empty)'}`);
    if (result.tagError) console.log(`   Error: ${result.tagError}`);
    
    console.log('\n=== VERIFICATION ===');
    console.log(`   Tags After: ${JSON.stringify(result.entryTagsAfter || [])}`);
    console.log(`   Board Exists After: ${result.boardExistsAfter}`);
    
    console.log('\n=== ALL BOARD LABELS ===');
    if (result.allBoardsAfter) {
      result.allBoardsAfter.forEach(l => console.log(`   - ${l}`));
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (browser) {
      browser.close().catch(() => {});
    }
  }
}

debug();
