const test = require('node:test');
const assert = require('node:assert/strict');
const {
  loadProducts,
  findProduct,
  groupedOptions,
  productTemplate,
  normalizeProduct,
  isSafeSlug
} = require('../data/catalog');

test('carga el catálogo editorial con los cuatro productos', () => {
  const products = loadProducts();
  assert.equal(products.length, 4);
  assert.deepEqual(
    products.map((p) => p.slug),
    ['magicos', 'sirius-laptop', 'chip-n1-kinetic', 'blackbox-cloud']
  );
});

test('MagicOS expone las cinco funciones que usa la home y el carrusel', () => {
  const magicos = findProduct(loadProducts(), 'magicos');
  assert.ok(magicos);
  assert.equal(magicos.features.length, 5);
  assert.deepEqual(
    magicos.features.map((f) => f.theme),
    ['ui', 'security', 'performance', 'open', 'compat']
  );
  assert.equal(magicos.features[2].image, '/img/shell.svg');
});

test('agrupa las opciones de Sirius en orden y normaliza defaults', () => {
  const sirius = findProduct(loadProducts(), 'sirius-laptop');
  const groups = groupedOptions(sirius);
  assert.deepEqual(Object.keys(groups), ['Procesador', 'RAM', 'Almacenamiento']);
  assert.equal(groups.Procesador.length, 5);
  assert.equal(groups.RAM.find((o) => o.is_default === 1).label, '16GB');
  assert.equal(groups.Almacenamiento[0].label, '256GB SSD');
});

test('encuentra productos por slug y devuelve null si no existe', () => {
  const products = loadProducts();
  assert.equal(findProduct(products, 'blackbox-cloud').name, 'BlackBox Cloud');
  assert.equal(findProduct(products, 'no-existe'), null);
});

test('elige plantilla específica o genérica según el slug', () => {
  assert.equal(productTemplate('magicos'), 'pages/product-magicos');
  assert.equal(productTemplate('producto-inventado'), 'pages/product-generic');
});

test('rechaza slugs que podrían escapar de views/ o dist/', () => {
  assert.equal(isSafeSlug('sirius-laptop'), true);
  assert.equal(isSafeSlug('../.env'), false);
  assert.equal(isSafeSlug('Mayusculas'), false);
  assert.equal(isSafeSlug('con espacio'), false);
  assert.equal(productTemplate('../../package'), 'pages/product-generic');
});

test('normaliza features del admin y acepta desc como alias de description', () => {
  const product = normalizeProduct({
    id: 9,
    slug: 'demo',
    features: [{ title: 'Demo', desc: 'Texto antiguo' }],
    options: []
  });
  assert.equal(product.features[0].description, 'Texto antiguo');
  assert.equal(product.features[0].title, 'Demo');
});
