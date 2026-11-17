require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { isSafeSlug } = require('../backend/data/catalog');

const DATA_FILE = path.join(__dirname, '..', 'backend', 'data', 'products.json');

function parseFeatures(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function normalizeOption(option) {
  return {
    id: option.id,
    product_id: option.product_id,
    group_name: option.group_name,
    group_order: Number(option.group_order) || 1,
    label: option.label,
    description: option.description || '',
    price_modifier: Number(option.price_modifier) || 0,
    is_default: option.is_default ? 1 : 0,
    sort_order: Number(option.sort_order) || 1
  };
}

// Trae el catálogo de Supabase (la copia de producción) y lo escribe como
// snapshot editorial en `products.json`. Sin credenciales no hace nada: el
// build sigue usando el JSON versionado.
async function pullCatalog(options = {}) {
  const url = options.url || process.env.SUPABASE_URL;
  const serviceKey = options.serviceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const file = options.file || DATA_FILE;
  const quiet = options.quiet === true;

  if (!url || !serviceKey) {
    if (!quiet) console.log('  catálogo: sin SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY; uso products.json');
    return { skipped: true, reason: 'no-credentials' };
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw new Error(`No se pudo leer products: ${error.message}`);

  const { data: optionsRows, error: optionsError } = await supabase
    .from('product_options')
    .select('*')
    .order('product_id', { ascending: true })
    .order('group_order', { ascending: true })
    .order('sort_order', { ascending: true });
  if (optionsError) throw new Error(`No se pudo leer product_options: ${optionsError.message}`);

  const optionsByProduct = new Map();
  for (const option of optionsRows || []) {
    if (!optionsByProduct.has(option.product_id)) optionsByProduct.set(option.product_id, []);
    optionsByProduct.get(option.product_id).push(normalizeOption(option));
  }

  const catalog = (products || []).map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    tagline: product.tagline || '',
    description: product.description || '',
    base_price: Number(product.base_price) || 0,
    category: product.category,
    status: product.status,
    image_url: product.image_url || '',
    features: parseFeatures(product.features_json),
    options: optionsByProduct.get(product.id) || []
  }));

  if (!catalog.length) {
    throw new Error('Supabase devolvió un catálogo vacío; no se sobrescribe products.json.');
  }

  const badSlug = catalog.find((product) => !isSafeSlug(product.slug));
  if (badSlug) {
    throw new Error(
      `Slug inválido en Supabase: ${JSON.stringify(badSlug.slug)}. ` +
      'Usa minúsculas, números y guiones (ej.: sirius-laptop).'
    );
  }

  fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
  if (!quiet) console.log(`  catálogo actualizado desde Supabase (${catalog.length} productos)`);
  return { skipped: false, count: catalog.length, file };
}

if (require.main === module) {
  pullCatalog().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { pullCatalog, DATA_FILE };
