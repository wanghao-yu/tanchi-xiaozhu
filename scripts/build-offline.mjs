import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicUrl = 'https://wanghao-yu.github.io/tanchi-xiaozhu/';
const readSource = name => readFileSync(join(sourceRoot, name), 'utf8');
const dataUrl = (name, mime) => `data:${mime};base64,${readFileSync(join(sourceRoot, name)).toString('base64')}`;
const face = dataUrl('assets/face.png', 'image/png');
const imageData = new Map([['face.png', face]]);

function inlineImages(source) {
  return source.replace(/(['"])\.\/assets\/([^'"\r\n]+\.png)\1/g, (_match, quote, name) => {
    if (!imageData.has(name)) imageData.set(name, dataUrl(`assets/${name}`, 'image/png'));
    return `${quote}${imageData.get(name)}${quote}`;
  });
}

function replaceOnce(source, search, replacement, description) {
  if (source.split(search).length !== 2) {
    throw new Error(`Expected exactly one ${description}; review the source before rebuilding.`);
  }
  return source.replace(search, () => replacement);
}

function removeExports(source) {
  return source.replace(/^export\s+(?=(?:const|let|var|function|class)\b)/gm, '');
}

let css = readSource('style.css');
for (const name of ['rounded-regular.woff2', 'rounded-bold.woff2']) {
  css = replaceOnce(css, `url('./assets/${name}')`, `url('${dataUrl(`assets/${name}`, 'font/woff2')}')`, name);
}

let app = readSource('app.mjs').replace(/^import\s+[^;]+;\s*\r?\n/gm, '');
app = inlineImages(app);
app = replaceOnce(app, `const url = '${publicUrl}';`, `const url = '${publicUrl}';
  if (globalThis.NativeShare?.share) {
    NativeShare.share('贪吃小猪', url);
    return;
  }`, 'public sharing URL');

const javascript = `document.addEventListener('DOMContentLoaded', () => {
'use strict';

${removeExports(readSource('core.mjs'))}

${removeExports(readSource('foods.mjs'))}

${app}
}, { once: true });
`;

if (/^\s*(?:import|export)\s/m.test(javascript)) {
  throw new Error('The offline JavaScript still contains a module declaration.');
}
new Function(javascript); // Parse without running browser code.

let html = readSource('index.html');
html = html.replace(/<link\b[^>]*\bdata-online-only\b[^>]*>/g, '');
html = html.replace(/<script\b[^>]*\bdata-online-only\b[^>]*>[\s\S]*?<\/script>/g, '');
html = replaceOnce(html, '<link rel="stylesheet" href="./style.css">', `<style>\n${css}\n</style>`, 'stylesheet link');
const moduleScripts = [...html.matchAll(/<script\s+type=["']module["']\s+src=["']\.\/app\.mjs(?:\?[^"']*)?["']\s*><\/script>/g)];
if (moduleScripts.length !== 1) throw new Error('Expected exactly one app.mjs module script, with an optional cache query.');
html = replaceOnce(html, moduleScripts[0][0], `<script>\n${javascript.replace(/<\/script/gi, '<\\/script')}\n</script>`, 'module script tag');
html = inlineImages(html);
html = html.replaceAll('href="./download.html"', `href="${publicUrl}download.html"`);

const license = readSource('assets/ROUNDED-LICENSE.txt');
const escapedLicense = license.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
html = replaceOnce(html, '</body>', `  <template id="bundled-font-license">\n${escapedLicense}\n</template>\n</body>`, 'closing body tag');

if (/<(?:script|link)\b[^>]*(?:src|href)=["'](?!data:)/i.test(html) || /['"](?:\.\/)?assets\/[^'"]+['"]/.test(html)) {
  throw new Error('An external asset reference remains in the offline HTML.');
}
for (const match of css.matchAll(/url\(\s*['"]?([^)'"\s]+)/g)) {
  if (!match[1].startsWith('data:')) throw new Error(`External CSS URL remains: ${match[1]}`);
}

const outputPath = process.argv[2]
  ? resolve(process.argv[2])
  : join(sourceRoot, 'android/app/src/main/assets/index.html');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html, 'utf8');
console.log(outputPath + '\t' + statSync(outputPath).size + ' bytes');
