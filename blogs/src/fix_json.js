#!/usr/bin/env node
/**
 * Fix unescaped quotes in JSON article files
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'data', 'articles');
const files = ['tagged.json', 'untagged.json', 'raw.json'];

for (const file of files) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} (not found)`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Fix unescaped quotes within JSON string values
  // This regex finds: "key": "value with "unescaped" quotes",
  // and replaces the internal quotes with escaped ones
  const lines = content.split('\n');
  const fixedLines = lines.map(line => {
    // Match lines with string values for title, description, source, url, feedlyUrl
    const match = line.match(/^(\s*"(?:title|description|source)":\s*")(.*)(",?\s*)$/);
    if (match) {
      const prefix = match[1];
      let value = match[2];
      const suffix = match[3];
      
      // Find and escape unescaped quotes in the value
      // An unescaped quote is one not preceded by backslash
      value = value.replace(/(?<!\\)"/g, '\\"');
      
      return prefix + value + suffix;
    }
    return line;
  });
  
  const fixedContent = fixedLines.join('\n');
  fs.writeFileSync(filePath, fixedContent);
  console.log(`Fixed: ${file}`);
}

// Verify the files are valid JSON
for (const file of files) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) continue;
  
  try {
    JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`✓ ${file} is valid JSON`);
  } catch (e) {
    console.log(`✗ ${file} still has errors: ${e.message}`);
  }
}
