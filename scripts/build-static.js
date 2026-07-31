const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const VIEWS = path.join(ROOT, 'backend', 'views');
const DATA_FILE = path.join(ROOT, 'backend', 'data', 'products.json');
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/+$/, '');

const products = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

function renderPage(template, data) {
  const file = path.join(VIEWS, `${template}.ejs`);
  return ejs.renderFile(file, data, { filename: file });
}

function prefixSrcset(value, basePath) {
  return value
    .split(/\s+/)
    .map((token) => (token.charAt(0) === '/' ? basePath + token : token))
    .join(' ');
}

function prefixBasePaths(html, basePath) {
  if (!basePath) return html;
  return html
    .replace(/(href=")\//g, `$1${basePath}/`)
    .replace(/(src=")\//g, `$1${basePath}/`)
    .replace(/srcset="([^"]*)"/g, (_m, value) => `srcset="${prefixSrcset(value, basePath)}"`);
}

function writePage(relPath, html) {
  const out = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, prefixBasePaths(html, BASE_PATH));
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function groupedOptionsFor(product) {
  const groupedOptions = {};
  for (const opt of product.options) {
    if (!groupedOptions[opt.group_name]) groupedOptions[opt.group_name] = [];
    groupedOptions[opt.group_name].push(opt);
  }
  return groupedOptions;
}

async function main() {
  const pages = [
    { template: 'pages/home', data: { title: 'Magic', products }, file: 'index.html' },
    { template: 'pages/productos', data: { title: 'Productos - Magic', products }, file: 'productos/index.html' },
    { template: 'pages/contact', data: { title: 'Contacto - Magic' }, file: 'contacto/index.html' },
    { template: 'pages/404', data: { title: 'Página no encontrada' }, file: '404.html' },
  ];

  for (const p of products) {
    pages.push({
      template: `pages/product-${p.slug}`,
      data: { title: `${p.name} - Magic`, product: p, features: p.features },
      file: `productos/${p.slug}/index.html`,
    });
    pages.push({
      template: 'pages/configure',
      data: { title: `Configurar ${p.name} - Magic`, product: p, groupedOptions: groupedOptionsFor(p), options: p.options },
      file: `productos/${p.slug}/configure/index.html`,
    });
  }

  for (const page of pages) {
    const html = await renderPage(page.template, page.data);
    writePage(page.file, html);
    console.log(`  prerender ${page.template} -> dist/${page.file}`);
  }

  copyDir(path.join(ROOT, 'frontend'), DIST);
  console.log('  assets frontend copiados a dist/');

  console.log('Build estático completado.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
