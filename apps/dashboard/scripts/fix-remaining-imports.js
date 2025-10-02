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

function fixRemainingImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Fix relative imports that should be absolute
    const relativeImportRegex = /from ['"]\.\.\/[^'"]*['"]/g;
    const matches = content.match(relativeImportRegex);
    
    if (matches) {
      matches.forEach(match => {
        let fixed = match;
        
        // Fix specific patterns
        if (match.includes('../Pagination')) {
          fixed = match.replace('../Pagination', '@/components/shared/ui/Pagination');
        } else if (match.includes('../EmptyStates')) {
          fixed = match.replace('../EmptyStates', '@/components/shared/ui/EmptyStates');
        } else if (match.includes('../ResizableTable')) {
          fixed = match.replace('../ResizableTable', '@/components/shared/ui/ResizableTable');
        } else if (match.includes('../DashboardCard')) {
          fixed = match.replace('../DashboardCard', '@/components/shared/ui/DashboardCard');
        } else if (match.includes('../InfoTooltip')) {
          fixed = match.replace('../InfoTooltip', '@/components/shared/ui/InfoTooltip');
        } else if (match.includes('../SearchableSelect')) {
          fixed = match.replace('../SearchableSelect', '@/components/common/SearchableSelect');
        } else if (match.includes('../utils/')) {
          fixed = match.replace('../utils/', '@/utils/');
        } else if (match.includes('../hooks/')) {
          fixed = match.replace('../hooks/', '@/hooks/');
        } else if (match.includes('../store/')) {
          fixed = match.replace('../store/', '@/store/');
        } else if (match.includes('../contexts/')) {
          fixed = match.replace('../contexts/', '@/contexts/');
        } else if (match.includes('../types/')) {
          fixed = match.replace('../types/', '@/types/');
        } else if (match.includes('../lib/')) {
          fixed = match.replace('../lib/', '@/lib/');
        }
        
        if (fixed !== match) {
          content = content.replace(match, fixed);
          hasChanges = true;
        }
      });
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed imports: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🚀 Starting remaining import fixes...\n');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const files = getAllFiles(srcDir);
  
  let updatedCount = 0;
  let totalCount = files.length;
  
  files.forEach(file => {
    if (fixRemainingImports(file)) {
      updatedCount++;
    }
  });
  
  console.log(`\n✨ Remaining import fix complete!`);
  console.log(`📊 Fixed ${updatedCount} out of ${totalCount} files`);
}

// Run the script
main();
