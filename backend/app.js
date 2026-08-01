const express = require('express');
const path = require('path');
require('dotenv').config();

const homeRouter = require('./routes/home');
const productsRouter = require('./routes/products');
const contactRouter = require('./routes/contact');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const adminApiRouter = require('./routes/adminApi');

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
app.use('/api/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/api/admin', adminApiRouter);

app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Página no encontrada' });
});

app.listen(PORT, () => {
  console.log(`Magic corriendo en http://localhost:${PORT}`);
});
