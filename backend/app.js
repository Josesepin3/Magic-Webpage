const express = require('express');
const path = require('path');
require('dotenv').config();

const homeRouter = require('./routes/home');
const productsRouter = require('./routes/products');
const contactRouter = require('./routes/contact');
const accountRouter = require('./routes/account');
const adminRouter = require('./routes/admin');
const securityHeaders = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Headers de seguridad
app.use(securityHeaders);

app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));

// Salud para health checks / monitoreo
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.use('/', homeRouter);
app.use('/productos', productsRouter);
app.use('/contacto', contactRouter);
app.use('/carrito', (req, res) => {
  res.render('pages/carrito', { title: 'Carrito - Magic' });
});
app.use('/cuenta', accountRouter);
app.use('/admin', adminRouter);

app.use(notFound);
app.use(errorHandler);

// Solo escuchar cuando se ejecuta directamente (los tests importan la app).
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Magic corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;