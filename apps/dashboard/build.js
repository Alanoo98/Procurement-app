const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting custom build process...');

try {
  // Clean install
  console.log('Cleaning node_modules...');
  if (fs.existsSync('node_modules')) {
    execSync('rm -rf node_modules', { stdio: 'inherit' });
  }
  if (fs.existsSync('package-lock.json')) {
    execSync('rm -rf package-lock.json', { stdio: 'inherit' });
  }

  // Install dependencies
  console.log('Installing dependencies...');
  execSync('npm install --no-optional', { stdio: 'inherit' });

  // Build
  console.log('Building...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
