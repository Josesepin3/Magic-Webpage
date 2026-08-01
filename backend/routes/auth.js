const { Router } = require('express');
const bcrypt = require('bcrypt');
const { getDb } = require('../config/db');
const { signToken } = require('../middleware/auth');

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }

  const user = getDb().prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  res.json({ token: signToken(user), user: { username: user.username } });
});

module.exports = router;
