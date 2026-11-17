const { Router } = require('express');
const { loadProducts } = require('../data/catalog');

const router = Router();

router.get('/', (req, res) => {
  const products = loadProducts();
  res.render('pages/home', { title: 'Magic', products });
});

module.exports = router;
