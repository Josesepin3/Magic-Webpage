const { Router } = require('express');
const { getDb } = require('../config/db');

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const products = db.prepare('SELECT * FROM products WHERE status = ?').all('available');
  res.render('pages/home', { title: 'MagicOS', products });
});

module.exports = router;
