const { Router } = require('express');
const { getDb } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = Router();
router.use(requireAuth);

const CATEGORIES = ['os', 'hardware', 'cloud', 'silicon'];
const STATUSES = ['available', 'coming_soon'];

function parseFeatures(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function serializeProduct(row) {
  return Object.assign({}, row, { features: parseFeatures(row.features_json) });
}

function productPayload(body) {
  const name = String(body.name || '').trim();
  if (!name) throw new Error('El nombre es obligatorio');

  const slug = String(body.slug || '').trim() || slugify(name);
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('El slug solo admite minúsculas, números y guiones');

  const category = String(body.category || 'os');
  if (!CATEGORIES.includes(category)) throw new Error('Categoría inválida');

  const status = String(body.status || 'available');
  if (!STATUSES.includes(status)) throw new Error('Estado inválido');

  const base_price = Number(body.base_price);
  if (Number.isNaN(base_price) || base_price < 0) throw new Error('Precio base inválido');

  const features = Array.isArray(body.features) ? body.features : parseFeatures(body.features_json);

  return {
    name,
    slug,
    tagline: String(body.tagline || '').trim(),
    description: String(body.description || '').trim(),
    base_price,
    category,
    status,
    image_url: String(body.image_url || '').trim(),
    features_json: JSON.stringify(features)
  };
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

router.get('/messages', (req, res) => {
  const messages = getDb().prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
  res.json(messages);
});

router.patch('/messages/:id', (req, res) => {
  const db = getDb();
  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!message) return res.status(404).json({ error: 'Mensaje no encontrado' });

  const read = req.body && typeof req.body.read === 'boolean'
    ? (req.body.read ? 1 : 0)
    : (message.read ? 0 : 1);

  db.prepare('UPDATE messages SET read = ? WHERE id = ?').run(read, message.id);
  res.json({ ok: true, read: Boolean(read) });
});

router.delete('/messages/:id', (req, res) => {
  const result = getDb().prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Mensaje no encontrado' });
  res.json({ ok: true });
});

router.get('/products', (req, res) => {
  const products = getDb().prepare('SELECT * FROM products ORDER BY category, name').all();
  res.json(products.map(serializeProduct));
});

router.get('/products/:id', (req, res) => {
  const product = getDb().prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(serializeProduct(product));
});

router.post('/products', (req, res) => {
  const db = getDb();
  let payload;
  try {
    payload = productPayload(req.body || {});
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const exists = db.prepare('SELECT id FROM products WHERE slug = ?').get(payload.slug);
  if (exists) return res.status(409).json({ error: 'Ya existe un producto con ese slug' });

  const result = db.prepare(`
    INSERT INTO products (name, slug, tagline, description, base_price, category, status, image_url, features_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(payload.name, payload.slug, payload.tagline, payload.description, payload.base_price, payload.category, payload.status, payload.image_url, payload.features_json);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(serializeProduct(product));
});

router.put('/products/:id', (req, res) => {
  const db = getDb();
  const current = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Producto no encontrado' });

  let payload;
  try {
    payload = productPayload(req.body || {});
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const clash = db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?').get(payload.slug, current.id);
  if (clash) return res.status(409).json({ error: 'Ya existe otro producto con ese slug' });

  db.prepare(`
    UPDATE products
    SET name = ?, slug = ?, tagline = ?, description = ?, base_price = ?, category = ?, status = ?, image_url = ?, features_json = ?
    WHERE id = ?
  `).run(payload.name, payload.slug, payload.tagline, payload.description, payload.base_price, payload.category, payload.status, payload.image_url, payload.features_json, current.id);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(current.id);
  res.json(serializeProduct(product));
});

router.delete('/products/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM product_options WHERE product_id = ?').run(product.id);
    db.prepare('DELETE FROM products WHERE id = ?').run(product.id);
  });
  tx();
  res.json({ ok: true });
});

router.get('/products/:id/options', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  const options = db.prepare(
    'SELECT * FROM product_options WHERE product_id = ? ORDER BY group_order, sort_order'
  ).all(product.id);
  res.json(options);
});

router.put('/products/:id/options', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  const options = Array.isArray(req.body.options) ? req.body.options : [];

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM product_options WHERE product_id = ?').run(product.id);
    const insert = db.prepare(`
      INSERT INTO product_options (product_id, group_name, group_order, label, description, price_modifier, is_default, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    options.forEach((opt, i) => {
      insert.run(
        product.id,
        String(opt.group_name || '').trim(),
        Number(opt.group_order) || 1,
        String(opt.label || '').trim(),
        String(opt.description || '').trim(),
        Number(opt.price_modifier) || 0,
        opt.is_default ? 1 : 0,
        Number(opt.sort_order) || (i + 1)
      );
    });
  });
  tx();

  res.json({ ok: true, count: options.length });
});

module.exports = router;
