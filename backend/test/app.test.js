// Smoke tests del servidor Express (dev local).
// Correr con: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');

let server;
let base;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
});

test('GET /health responde 200 con ok:true', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type').includes('application/json'), true);
  const body = await res.json();
  assert.equal(body.ok, true);
});

test('GET / 200 (home)', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<html lang="es">/);
});

test('GET /productos/slug-que-no-existe -> 404 HTML', async () => {
  const res = await fetch(`${base}/productos/no-existe`);
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /text\/html/);
});

test('GET /ruta-inventada -> 404 HTML', async () => {
  const res = await fetch(`${base}/ruta-inventada`);
  assert.equal(res.status, 404);
});

test('GET /api/inventado -> 404 JSON', async () => {
  const res = await fetch(`${base}/api/inventado`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(typeof body.error, 'string');
});

test('headers de seguridad presentes', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.match(res.headers.get('referrer-policy'), /strict-origin-when-cross-origin/);
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('payload body mayor al límite no rompe el servidor', async () => {
  const big = JSON.stringify({ data: 'x'.repeat(200 * 1024) });
  const res = await fetch(`${base}/api/inventado`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: big
  });
  assert.ok([413, 404].includes(res.status));
});