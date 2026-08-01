const { Router } = require('express');

const router = Router();

router.get('/login', (req, res) => {
  res.render('pages/login', { title: 'Admin - Magic' });
});

router.get('/dashboard', (req, res) => {
  res.render('pages/dashboard', { title: 'Panel de administración - Magic' });
});

module.exports = router;
