// Production build script
const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Building React renderer bundle...');
  execSync('node scripts/build-renderer.js', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('Building for production with electron-builder...');
  execSync('npm run package', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('Build complete.');
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}
