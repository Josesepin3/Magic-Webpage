const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = process.env.PORT || 3210;
const BASE = `http://127.0.0.1:${PORT}`;

async function fetchText(urlPath) {
  const res = await fetch(`${BASE}${urlPath}`);
  return { status: res.status, body: await res.text() };
}

function writePage(relPath, html) {
  const out = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
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

async function waitForServer() {
  for (let i = 0; i < 150; i++) {
    try {
      const r = await fetchText('/');
      if (r.status) return;
    } catch (_) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error('El servidor Express no arrancó a tiempo.');
}

async function main() {
  const server = spawn('node', ['backend/app.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer();

    const { getDb } = require(path.join(ROOT, 'backend/config/db'));
    const db = getDb();
    const products = db.prepare('SELECT slug FROM products ORDER BY category').all();

    const routes = ['/', '/productos', '/contacto'];
    for (const p of products) {
      routes.push(`/productos/${p.slug}`);
      routes.push(`/productos/${p.slug}/configure`);
    }

    const targets = [
      { url: '/', file: 'index.html' },
      { url: '/productos', file: 'productos/index.html' },
      { url: '/contacto', file: 'contacto/index.html' },
    ];
    for (const p of products) {
      targets.push({ url: `/productos/${p.slug}`, file: `productos/${p.slug}/index.html` });
      targets.push({ url: `/productos/${p.slug}/configure`, file: `productos/${p.slug}/configure/index.html` });
    }

    for (const t of targets) {
      const { status, body } = await fetchText(t.url);
      if (status !== 200) {
        throw new Error(`Ruta ${t.url} devolvió HTTP ${status}`);
      }
      writePage(t.file, body);
      console.log(`  prerender ${t.url} -> dist/${t.file}`);
    }

    const { status, body } = await fetchText('/ruta-que-no-existe-404');
    if (status !== 404) {
      throw new Error(`La ruta 404 devolvió HTTP ${status}`);
    }
    writePage('404.html', body);
    console.log('  prerender /404 -> dist/404.html');

    copyDir(path.join(ROOT, 'frontend'), DIST);
    console.log('  assets frontend copiados a dist/');
  } finally {
    server.kill('SIGTERM');
  }

  console.log('Build estático completado.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
