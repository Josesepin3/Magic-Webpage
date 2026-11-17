const test = require('node:test');
const assert = require('node:assert/strict');
const {
  prefixBasePaths,
  prefixCssUrls,
  pickTemplate,
  groupedOptionsFor
} = require('../../scripts/build-static');

test('prefixBasePaths reescribe href, src y srcset absolutos', () => {
  const html = '<a href="/productos">x</a><img src="/img/a.svg" srcset="/img/a.svg 1x, /img/b.svg 2x">';
  assert.equal(
    prefixBasePaths(html, '/Magic-Webpage'),
    '<a href="/Magic-Webpage/productos">x</a>' +
      '<img src="/Magic-Webpage/img/a.svg" srcset="/Magic-Webpage/img/a.svg 1x, /Magic-Webpage/img/b.svg 2x">'
  );
});

test('prefixBasePaths no toca URLs absolutas externas ni rutas relativas', () => {
  const html = '<a href="https://example.com/x">x</a><img src="img/a.svg">';
  assert.equal(prefixBasePaths(html, '/Magic-Webpage'), html);
});

test('prefixCssUrls reescribe url(/...) y respeta las remotas', () => {
  const css = 'a{background:url(/img/a.svg)}b{background:url("https://x/y.svg")}';
  assert.equal(
    prefixCssUrls(css, '/Magic-Webpage'),
    'a{background:url(/Magic-Webpage/img/a.svg)}b{background:url("https://x/y.svg")}'
  );
});

test('pickTemplate usa la plantilla concreta si existe', () => {
  assert.equal(pickTemplate('magicos'), 'pages/product-magicos');
  assert.equal(pickTemplate('sirius-laptop'), 'pages/product-sirius-laptop');
  assert.equal(pickTemplate('producto-nuevo'), 'pages/product-generic');
});

test('groupedOptionsFor agrupa sin depender de SQLite', () => {
  const grouped = groupedOptionsFor({
    options: [
      { group_name: 'RAM', label: '16GB' },
      { group_name: 'Procesador', label: 'N1' },
      { group_name: 'RAM', label: '32GB' }
    ]
  });
  assert.deepEqual(Object.keys(grouped), ['RAM', 'Procesador']);
  assert.equal(grouped.RAM.length, 2);
});
