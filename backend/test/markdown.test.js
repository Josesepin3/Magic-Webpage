const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, mdToHtml } = require('../../frontend/js/lib/markdown');

test('escapeHtml neutraliza etiquetas y atributos', () => {
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
  );
});

test('mdToHtml escapa HTML antes de aplicar markdown', () => {
  const html = mdToHtml('**Hola** <script>alert(1)</script>');
  assert.match(html, /<strong>Hola<\/strong>/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('mdToHtml convierte listas con guion y numeradas', () => {
  assert.equal(mdToHtml('- uno\n- dos'), '<ul><li>uno</li><li>dos</li></ul>');
  assert.equal(mdToHtml('1. uno\n2. dos'), '<ol><li>uno</li><li>dos</li></ol>');
});

test('mdToHtml aplica negrita, cursiva y código en línea', () => {
  assert.equal(
    mdToHtml('**fuerte** *suave* `código`'),
    '<strong>fuerte</strong> <em>suave</em> <code>código</code>'
  );
});

test('mdToHtml no interpreta imágenes ni enlaces crudos del modelo', () => {
  const html = mdToHtml('[link](javascript:alert(1)) ![x](x)');
  assert.doesNotMatch(html, /<a |<img /);
  assert.match(html, /\[link\]/);
});
