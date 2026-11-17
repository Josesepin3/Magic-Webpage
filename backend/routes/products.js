const { Router } = require('express');
const {
  loadProducts,
  findProduct,
  groupedOptions,
  productTemplate
} = require('../data/catalog');

const router = Router();

router.get('/', (req, res) => {
  const products = loadProducts().sort((a, b) => a.category.localeCompare(b.category));
  res.render('pages/productos', { title: 'Productos - Magic', products });
});

router.get('/:slug', (req, res) => {
  const product = findProduct(loadProducts(), req.params.slug);
  if (!product) return res.status(404).render('pages/404', { title: 'Producto no encontrado - Magic' });

  res.render(productTemplate(product.slug), {
    title: `${product.name} - Magic`,
    product,
    features: product.features
  });
});

router.get('/:slug/configure', (req, res) => {
  const product = findProduct(loadProducts(), req.params.slug);
  if (!product) return res.status(404).render('pages/404', { title: 'Producto no encontrado - Magic' });

  res.render('pages/configure', {
    title: `Configurar ${product.name} - Magic`,
    product,
    groupedOptions: groupedOptions(product),
    options: product.options
  });
});

module.exports = router;
