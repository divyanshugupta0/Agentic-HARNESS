const esbuild = require('esbuild');
const path = require('path');

const entryPoint = path.join(__dirname, '../src/renderer/app.jsx');
const outfile = path.join(__dirname, '../src/renderer/dist/app.js');

esbuild
  .build({
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: process.env.NODE_ENV === 'production',
    logLevel: 'info'
  })
  .then(() => {
    console.log('Renderer build complete.');
  })
  .catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
  });