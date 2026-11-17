// Catálogo editorial único del sitio.
//
// `products.json` es la fuente autoral: lo leen el build estático, Express y
// los scripts de seed. SQLite ya no se usa (era una tercera copia que se
// desincronizaba); Supabase es la proyección de producción y se puede volver
// a traer al JSON con `npm run catalog:pull`.
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'products.json');
const VIEWS_DIR = path.join(__dirname, '..', 'views');
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isSafeSlug(slug) {
  return typeof slug === 'string' && SAFE_SLUG.test(slug);
}

function assertSafeSlug(slug, source = 'catálogo') {
  if (!isSafeSlug(slug)) {
    throw new Error(`Slug inválido en ${source}: ${JSON.stringify(slug)}`);
  }
}

function parseFeatures(value) {
  let parsed = [];
  if (Array.isArray(value)) parsed = value;
  else if (typeof value === 'string' && value.trim()) {
    try {
      const json = JSON.parse(value);
      parsed = Array.isArray(json) ? json : [];
    } catch (err) {
      parsed = [];
    }
  }
  return parsed
    .filter((feature) => feature && typeof feature === 'object')
    .map((feature) => ({
      ...feature,
      title: feature.title || '',
      description: feature.description || feature.desc || ''
    }));
}

function normalizeOption(option) {
  return {
    ...option,
    group_order: Number(option.group_order) || 1,
    price_modifier: Number(option.price_modifier) || 0,
    is_default: option.is_default === true || Number(option.is_default) === 1 ? 1 : 0,
    sort_order: Number(option.sort_order) || 1
  };
}

function normalizeProduct(product) {
  return {
    ...product,
    base_price: Number(product.base_price) || 0,
    features: parseFeatures(product.features || product.features_json),
    options: Array.isArray(product.options) ? product.options.map(normalizeOption) : []
  };
}

function loadProducts(file = DATA_FILE) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(raw)) throw new Error(`Catálogo inválido: ${file}`);
  return raw.map((product) => {
    assertSafeSlug(product.slug, file);
    if (!Number.isFinite(Number(product.id)) || Number(product.id) <= 0) {
      throw new Error(`Producto sin id válido en ${file}: ${product.slug}`);
    }
    return normalizeProduct(product);
  });
}

function findProduct(products, slug) {
  return products.find((product) => product.slug === slug) || null;
}

function groupedOptions(product) {
  const grouped = {};
  const options = [...(product.options || [])].sort(
    (a, b) => (a.group_order - b.group_order) || (a.sort_order - b.sort_order)
  );
  for (const option of options) {
    if (!grouped[option.group_name]) grouped[option.group_name] = [];
    grouped[option.group_name].push(option);
  }
  return grouped;
}

// Plantilla específica por slug si existe; si no, la genérica para que un
// producto creado desde el admin también tenga página publicable.
function productTemplate(slug, viewsDir = VIEWS_DIR) {
  if (!isSafeSlug(slug)) return 'pages/product-generic';
  const specific = path.join(viewsDir, 'pages', `product-${slug}.ejs`);
  return fs.existsSync(specific) ? `pages/product-${slug}` : 'pages/product-generic';
}

module.exports = {
  DATA_FILE,
  loadProducts,
  findProduct,
  groupedOptions,
  productTemplate,
  normalizeProduct,
  isSafeSlug
};
