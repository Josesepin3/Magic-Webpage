const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const {
  loadProducts,
  groupedOptions: groupedOptionsFor,
  productTemplate: pickTemplate
} = require('../backend/data/catalog');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const VIEWS = path.join(ROOT, 'backend', 'views');
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/+$/, '');

function renderPage(template, data) {
  const file = path.join(VIEWS, `${template}.ejs`);
  return ejs.renderFile(file, { ...data, basePath: BASE_PATH }, { filename: file });
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

// Reescritura de url('/...') absolutas dentro del CSS (las remotas https:// quedan intactas).
function prefixCssUrls(css, basePath) {
  if (!basePath) return css;
  return css.replace(/url\((['"]?)\//g, (_m, quote) => `url(${quote}${basePath}/`);
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
    } else if (entry.name.endsWith('.css')) {
      fs.writeFileSync(to, prefixCssUrls(fs.readFileSync(from, 'utf8'), BASE_PATH));
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

async function main() {
  if (process.env.SYNC_CATALOG === '1') {
    const { pullCatalog } = require('./pull-catalog');
    await pullCatalog();
  }

  const products = loadProducts();

  const pages = [
    { template: 'pages/home', data: { title: 'Magic', products }, file: 'index.html' },
    { template: 'pages/productos', data: { title: 'Productos - Magic', products }, file: 'productos/index.html' },
    { template: 'pages/contact', data: { title: 'Contacto - Magic' }, file: 'contacto/index.html' },
    { template: 'pages/404', data: { title: 'Página no encontrada' }, file: '404.html' },
    { template: 'pages/cuenta-login', data: { title: 'Iniciar sesión - Magic' }, file: 'cuenta/login/index.html' },
    { template: 'pages/cuenta-perfil', data: { title: 'Mi perfil - Magic' }, file: 'cuenta/perfil/index.html' },
    { template: 'pages/carrito', data: { title: 'Carrito - Magic' }, file: 'carrito/index.html' },
    { template: 'pages/cuenta-servicios', data: { title: 'Mis servicios - Magic' }, file: 'cuenta/servicios/index.html' },
    { template: 'pages/login', data: { title: 'Admin - Magic' }, file: 'admin/login/index.html' },
    { template: 'pages/dashboard', data: { title: 'Panel de administración - Magic' }, file: 'admin/dashboard/index.html' },
  ];

  for (const p of products) {
    const template = pickTemplate(p.slug);
    pages.push({
      template,
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

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  prefixBasePaths,
  prefixCssUrls,
  prefixSrcset,
  pickTemplate,
  groupedOptionsFor,
  renderPage
};
