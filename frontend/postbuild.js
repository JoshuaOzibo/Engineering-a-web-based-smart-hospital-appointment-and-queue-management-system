import fs from 'fs';
import path from 'path';

const clientDir = path.resolve('dist/client');
const assetsDir = path.join(clientDir, 'assets');

if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  const cssFile = files.find(f => f.startsWith('styles-') && f.endsWith('.css')) || '';
  
  // Find all index JS bundles sorted by size to get the main entry bundle
  const jsFiles = files
    .filter(f => f.endsWith('.js') && f.startsWith('index-'))
    .map(f => ({ name: f, size: fs.statSync(path.join(assetsDir, f)).size }))
    .sort((a, b) => b.size - a.size);

  const mainJs = jsFiles.length > 0 ? jsFiles[0].name : '';

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
    ${mainJs ? `<script type="module" src="/assets/${mainJs}"></script>` : ''}
  </body>
</html>`;

  fs.writeFileSync(path.join(clientDir, 'index.html'), htmlContent);

  const distDir = path.resolve('dist');
  fs.cpSync(clientDir, distDir, { recursive: true });
  console.log('✓ Generated SPA index.html with entry bundle:', mainJs);
}
