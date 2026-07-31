const { Router } = require('express');
const { getDb } = require('../config/db');

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const products = db.prepare('SELECT * FROM products ORDER BY category').all();
  res.render('pages/productos', { title: 'Productos - Magic', products });
});

router.get('/:slug', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug);
  if (!product) return res.status(404).render('pages/404', { title: 'Producto no encontrado - Magic' });

  let features = [];
  if (product.features_json) {
    try { features = JSON.parse(product.features_json); } catch (e) { features = []; }
  }

  const template = `pages/product-${product.slug}`;
  res.render(template, { title: `${product.name} - Magic`, product, features });
});

router.get('/:slug/configure', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug);
  if (!product) return res.status(404).render('pages/404', { title: 'Producto no encontrado - Magic' });

  const options = db.prepare(
    'SELECT * FROM product_options WHERE product_id = ? ORDER BY group_order, sort_order'
  ).all(product.id);

  const groupedOptions = {};
  for (const opt of options) {
    if (!groupedOptions[opt.group_name]) groupedOptions[opt.group_name] = [];
    groupedOptions[opt.group_name].push(opt);
  }

  res.render('pages/configure', {
    title: `Configurar ${product.name} - Magic`,
    product,
    groupedOptions,
    options
  });
});

module.exports = router;