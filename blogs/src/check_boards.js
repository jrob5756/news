#!/usr/bin/env node

/**
 * Check what boards exist in Feedly
 */

const { chromium } = require('playwright');

async function checkBoards() {
  console.log('\n🔍 Checking Feedly Boards...\n');

  let browser;
  let page;

  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    const pages = contexts[0].pages();
    page = pages.find(p => p.url().includes('feedly.com')) || pages[0];
    
    console.log(`✓ Connected to: ${page.url()}\n`);

    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('https://feedly.com/v3/tags', {
          credentials: 'include'
        });
        const text = await response.text();
        return {
          ok: response.ok,
          status: response.status,
          text: text,
          json: response.ok ? JSON.parse(text) : null
        };
      } catch (e) {
        return { error: e.message };
      }
    });

    if (result.error) {
      console.error('Error:', result.error);
      return;
    }
    
    console.log(`Response status: ${result.status}`);
    console.log(`Response OK: ${result.ok}`);
    console.log(`Response length: ${result.text?.length || 0}\n`);
    
    const boards = result.json || [];
    console.log(`Found ${boards.length} tags/boards:\n`);
    
    // Find all _tagged and _untagged boards
    const taggedBoards = boards.filter(b => 
      b.label?.includes('_tagged') || b.id?.includes('_tagged')
    );
    const untaggedBoards = boards.filter(b => 
      b.label?.includes('_untagged') || b.id?.includes('_untagged')
    );
    
    if (taggedBoards.length > 0) {
      console.log('📌 _tagged boards:');
      taggedBoards.forEach(b => console.log(`   ${b.label}: ${b.id}`));
      console.log();
    }
    
    if (untaggedBoards.length > 0) {
      console.log('📌 _untagged boards:');
      untaggedBoards.forEach(b => console.log(`   ${b.label}: ${b.id}`));
      console.log();
    }
    
    // Show all boards
    console.log('All tags:');
    boards.forEach(b => console.log(`   ${b.label || 'NO LABEL'}: ${b.id}`));

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (browser) {
      browser.close().catch(() => {});
    }
  }
}

checkBoards();
