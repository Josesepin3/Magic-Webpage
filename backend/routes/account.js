const { Router } = require('express');

const router = Router();

router.get('/login', (req, res) => {
  res.render('pages/cuenta-login', { title: 'Iniciar sesión - Magic' });
});

router.get('/perfil', (req, res) => {
  res.render('pages/cuenta-perfil', { title: 'Mi perfil - Magic' });
});

router.get('/servicios', (req, res) => {
  res.render('pages/cuenta-servicios', { title: 'Mis servicios - Magic' });
});

module.exports = router;
