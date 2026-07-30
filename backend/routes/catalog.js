const { Router } = require('express');
const { getDb } = require('../config/db');

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const products = db.prepare('SELECT * FROM products ORDER BY category').all();
  res.render('pages/catalog', { title: 'Catálogo - MagicOS', products });
});

module.exports = router;
