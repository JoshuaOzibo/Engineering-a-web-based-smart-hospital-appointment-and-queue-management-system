import fs from 'fs';
import path from 'path';

const clientDir = path.resolve('dist/client');
const distDir = path.resolve('dist');

if (!fs.existsSync(clientDir)) {
  fs.mkdirSync(clientDir, { recursive: true });
}

const assetsDir = path.join(clientDir, 'assets');
let cssFile = '';
let jsFiles = [];

if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  cssFile = files.find(f => f.startsWith('styles-') && f.endsWith('.css')) || '';
  // Find main entry JS files (index-*.js and router-*.js)
  jsFiles = files.filter(f => f.endsWith('.js') && (f.startsWith('index-') || f.startsWith('router-') || f.startsWith('theme-toggle-')));
}

const scriptTags = jsFiles.map(f => `<script type="module" src="/assets/${f}"></script>`).join('\n    ');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mediqueue - Smart Hospital Appointment & Queue Management</title>
    ${cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}">` : ''}
  </head>
  <body>
    <div id="root"></div>
    ${scriptTags}
  </body>
</html>`;

// Write index.html to dist/client
fs.writeFileSync(path.join(clientDir, 'index.html'), htmlContent);

// Copy everything from dist/client to dist/ so Vercel can serve from dist/ as well
if (fs.existsSync(clientDir)) {
  fs.cpSync(clientDir, distDir, { recursive: true });
}

console.log('✓ Successfully generated index.html and synced static assets for Vercel deployment.');
