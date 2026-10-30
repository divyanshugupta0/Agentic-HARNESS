// Production build script for Agentic Harness Desktop
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

try {
  // 1. Build Vite frontend bundle
  const frontendDir = path.resolve(__dirname, '../../frontend');
  if (fs.existsSync(frontendDir)) {
    console.log('Building Vite React production frontend...');
    execSync('npm run build', {
      stdio: 'inherit',
      cwd: frontendDir
    });
  }

  // 2. Package with electron-builder
  console.log('Packaging desktop application with electron-builder...');
  execSync('npm run package', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('Build complete.');
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}
