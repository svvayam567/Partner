import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;

export function runBuild() {
  console.log('========================================================');
  console.log('   Svvayam Partner App - Production Build Verification   ');
  console.log('========================================================\n');

  const htmlPath = path.join(rootDir, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error('ERROR: index.html not found at root!');
    process.exit(1);
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  let errors = [];

  // 1. Check for invalid domain-absolute paths (missing base-path compatibility)
  const absoluteAssetRegex = /(?:href|src|srcset)=["'](\/(?:app\.|assets\/|content\.json)[^"']*)["']/g;
  let match;
  while ((match = absoluteAssetRegex.exec(html)) !== null) {
    errors.push(`Invalid domain-absolute path in HTML: "${match[1]}". Must use relative path "./..." for base-path compatibility.`);
  }

  // 2. Extract and verify all asset references
  const assetRegex = /(?:href|src|srcset)=["'](\.\/[^"']*)["']/g;
  const referencedAssets = new Set();
  while ((match = assetRegex.exec(html)) !== null) {
    const cleanPath = match[1].split('?')[0]; // Remove query params
    referencedAssets.add(cleanPath);
  }

  let verifiedCount = 0;
  for (const assetRelPath of referencedAssets) {
    const fullPath = path.join(rootDir, assetRelPath.replace(/^\.\//, ''));
    if (!fs.existsSync(fullPath)) {
      errors.push(`Missing referenced asset: ${assetRelPath} (expected at ${fullPath})`);
    } else {
      verifiedCount++;
    }
  }

  // 3. Verify CSS
  const cssPath = path.join(rootDir, 'app.css');
  let cssSize = 0;
  if (!fs.existsSync(cssPath)) {
    errors.push('Missing app.css at deployed root!');
  } else {
    cssSize = fs.statSync(cssPath).size;
  }

  // 4. Verify JS
  const jsPath = path.join(rootDir, 'app.js');
  let jsSize = 0;
  if (!fs.existsSync(jsPath)) {
    errors.push('Missing app.js at deployed root!');
  } else {
    jsSize = fs.statSync(jsPath).size;
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    if (jsContent.includes("fetch('/content.json')")) {
      errors.push("Invalid domain-absolute path in app.js: fetch('/content.json'). Must be fetch('./content.json').");
    }
  }

  // 5. Verify content.json
  const contentPath = path.join(rootDir, 'content.json');
  let contentSize = 0;
  if (!fs.existsSync(contentPath)) {
    errors.push('Missing content.json at deployed root!');
  } else {
    contentSize = fs.statSync(contentPath).size;
  }

  // 6. Verify .nojekyll
  const nojekyllPath = path.join(rootDir, '.nojekyll');
  if (!fs.existsSync(nojekyllPath)) {
    errors.push('Missing .nojekyll at deployed root (needed for GitHub Pages).');
  }

  console.log(`- Deployed Root HTML:   index.html (${(fs.statSync(htmlPath).size / 1024).toFixed(1)} KB)`);
  console.log(`- Stylesheet:           app.css (${(cssSize / 1024).toFixed(1)} KB)`);
  console.log(`- Client JavaScript:    app.js (${(jsSize / 1024).toFixed(1)} KB)`);
  console.log(`- Dynamic Content:      content.json (${contentSize} bytes)`);
  console.log(`- Referenced Assets:    ${verifiedCount} files verified on disk`);
  console.log(`- GitHub Pages Config:  .nojekyll present, base path compatible (./)`);

  if (errors.length > 0) {
    console.error('\nBUILD FAILED with errors:');
    errors.forEach(e => console.error('  [X] ' + e));
    process.exit(1);
  }

  console.log('\n>>> BUILD & ASSET VERIFICATION PASSED SUCCESSFULLY! <<<\n');
}

runBuild();
