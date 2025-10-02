#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import mapping rules
const importMappings = [
  // Components
  { from: /from ['"]\.\.\/components\//g, to: "from '@/components/" },
  { from: /from ['"]\.\.\/\.\.\/components\//g, to: "from '@/components/" },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/components\//g, to: "from '@/components/" },
  
  // Pages
  { from: /from ['"]\.\.\/pages\//g, to: "from '@/pages/" },
  { from: /from ['"]\.\.\/\.\.\/pages\//g, to: "from '@/pages/" },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/pages\//g, to: "from '@/pages/" },
  
  // Hooks
  { from: /from ['"]\.\.\/hooks\//g, to: "from '@/hooks/" },
  { from: /from ['"]\.\.\/\.\.\/hooks\//g, to: "from '@/hooks/" },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/hooks\//g, to: "from '@/hooks/" },
  
  // Store
  { from: /from ['"]\.\.\/store\//g, to: "from '@/store/" },
  { from: /from ['"]\.\.\/\.\.\/store\//g, to: "from '@/store/" },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/store\//g, to: "from '@/store/" },
  
  // Contexts
  { from: /from ['"]\.\.\/contexts\//g, to: "from '@/contexts/" },
  { from: /from ['"]\.\.\/\.\.\/contexts\//g, to: "from '@/contexts/" },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/contexts\//g, to: "from '@/contexts/" },
  
  // Utils
  { from: /from ['"]\.\.\/utils\//g, to: "from '@/utils/" },
  { from: /from ['"]\.\.\/\.\.\/utils\//g, to: "from '@/utils/" },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/utils\//g, to: "from '@/utils/" },
  
  // Types
  { from: /from ['"]\.\.\/types\//g, to: "from '@/types/" },
  { from: /from ['"]\.\.\/\.\.\/types\//g, to: "from '@/types/" },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/types\//g, to: "from '@/types/" },
  
  // Lib
  { from: /from ['"]\.\.\/lib\//g, to: "from '@/lib/" },
  { from: /from ['"]\.\.\/\.\.\/lib\//g, to: "from '@/lib/" },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/lib\//g, to: "from '@/lib/" },
];

// Specific component path updates
const componentPathUpdates = [
  // Shared components
  { from: /@\/components\/Pagination/g, to: '@/components/shared/ui/Pagination' },
  { from: /@\/components\/ResizableTable/g, to: '@/components/shared/ui/ResizableTable' },
  { from: /@\/components\/EmptyStates/g, to: '@/components/shared/ui/EmptyStates' },
  { from: /@\/components\/DashboardCard/g, to: '@/components/shared/ui/DashboardCard' },
  { from: /@\/components\/InfoTooltip/g, to: '@/components/shared/ui/InfoTooltip' },
  
  // Layout components
  { from: /@\/components\/Sidebar/g, to: '@/components/shared/layout/Sidebar' },
  { from: /@\/components\/GlobalFilters/g, to: '@/components/shared/layout/GlobalFilters' },
  { from: /@\/components\/UserMenu/g, to: '@/components/shared/layout/UserMenu' },
  { from: /@\/components\/NotificationCenter/g, to: '@/components/shared/layout/NotificationCenter' },
  
  // Form components
  { from: /@\/components\/LocationSelector/g, to: '@/components/shared/forms/LocationSelector' },
  { from: /@\/components\/OrganizationSelector/g, to: '@/components/shared/forms/OrganizationSelector' },
  { from: /@\/components\/BusinessUnitSelector/g, to: '@/components/shared/forms/BusinessUnitSelector' },
  
  // Feature components - Dashboard
  { from: /@\/components\/dashboard\//g, to: '@/components/features/dashboard/' },
  
  // Feature components - Products
  { from: /@\/components\/productDetail\//g, to: '@/components/features/products/productDetail/' },
  { from: /@\/components\/ProductMapping/g, to: '@/components/features/products/ProductMapping' },
  { from: /@\/components\/ProductExportModal/g, to: '@/components/features/products/ProductExportModal' },
  { from: /@\/components\/ProductLocationBreakdown/g, to: '@/components/features/products/ProductLocationBreakdown' },
  
  // Feature components - Analytics
  { from: /@\/components\/efficiency\//g, to: '@/components/features/analytics/efficiency/' },
  { from: /@\/components\/cogs\//g, to: '@/components/features/analytics/cogs/' },
  { from: /@\/components\/pax\//g, to: '@/components/features/analytics/pax/' },
  
  // Feature components - Alerts
  { from: /@\/components\/priceAlerts\//g, to: '@/components/features/alerts/priceAlerts/' },
  { from: /@\/components\/priceAgreements\//g, to: '@/components/features/alerts/priceAgreements/' },
  { from: /@\/components\/ResolveAlertDialog/g, to: '@/components/features/alerts/ResolveAlertDialog' },
  
  // Feature components - Cases
  { from: /@\/components\/cases\//g, to: '@/components/features/cases/' },
  
  // Feature components - Import
  { from: /@\/components\/import\//g, to: '@/components/features/import/' },
  
  // Feature components - Auth
  { from: /@\/components\/auth\//g, to: '@/components/features/auth/' },
  
  // Common components
  { from: /@\/components\/common\//g, to: '@/components/common/' },
  { from: /@\/components\/SearchableSelect/g, to: '@/components/common/SearchableSelect' },
];

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

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Apply import mappings
    importMappings.forEach(mapping => {
      if (mapping.from.test(content)) {
        content = content.replace(mapping.from, mapping.to);
        hasChanges = true;
      }
    });
    
    // Apply component path updates
    componentPathUpdates.forEach(mapping => {
      if (mapping.from.test(content)) {
        content = content.replace(mapping.from, mapping.to);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🚀 Starting import path updates...\n');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const files = getAllFiles(srcDir);
  
  let updatedCount = 0;
  let totalCount = files.length;
  
  files.forEach(file => {
    if (updateFile(file)) {
      updatedCount++;
    }
  });
  
  console.log(`\n✨ Import update complete!`);
  console.log(`📊 Updated ${updatedCount} out of ${totalCount} files`);
  
  if (updatedCount > 0) {
    console.log('\n🔧 Next steps:');
    console.log('1. Run the linter to check for any issues');
    console.log('2. Test the application to ensure everything works');
    console.log('3. Commit the changes');
  }
}

// Run the script
main();
