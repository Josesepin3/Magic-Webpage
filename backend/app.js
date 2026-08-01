const express = require('express');
const path = require('path');
require('dotenv').config();

const homeRouter = require('./routes/home');
const productsRouter = require('./routes/products');
const contactRouter = require('./routes/contact');
const accountRouter = require('./routes/account');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/', homeRouter);
app.use('/productos', productsRouter);
app.use('/contacto', contactRouter);
app.use('/carrito', (req, res) => {
  res.render('pages/carrito', { title: 'Carrito - Magic' });
});
app.use('/cuenta', accountRouter);
app.use('/admin', adminRouter);

app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Página no encontrada' });
});

app.listen(PORT, () => {
  console.log(`Magic corriendo en http://localhost:${PORT}`);
});
