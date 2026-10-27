// Production build script
const { execSync } = require('child_process');

try {
  console.log('Building for production...');
  execSync('npm run package', { stdio: 'inherit' });
  console.log('Build complete.');
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}
