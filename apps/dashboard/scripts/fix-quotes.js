#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function fixQuotes(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Fix double quotes in import statements
    const quoteFixRegex = /from ['"]@\/[^'"]*";/g;
    const matches = content.match(quoteFixRegex);
    
    if (matches) {
      matches.forEach(match => {
        const fixed = match.replace(/";$/, "';");
        content = content.replace(match, fixed);
        hasChanges = true;
      });
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed quotes: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🚀 Starting quote fixes...\n');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const files = getAllFiles(srcDir);
  
  let updatedCount = 0;
  let totalCount = files.length;
  
  files.forEach(file => {
    if (fixQuotes(file)) {
      updatedCount++;
    }
  });
  
  console.log(`\n✨ Quote fix complete!`);
  console.log(`📊 Fixed ${updatedCount} out of ${totalCount} files`);
}

// Run the script
main();
