const isProd = process.env.NODE_ENV === 'production';

// 404: JSON para rutas /api/*, HTML para el resto.
function notFound(req, res) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Recurso no encontrado' });
  }
  res.status(404).render('pages/404', { title: 'Página no encontrada' });
}

// Error handler central: nunca filtra detalles internos en producción.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  if (isProd) {
    console.error('[error]', err);
  } else {
    console.error(err.stack || err);
  }

  if (req.path.startsWith('/api/')) {
    return res.status(status).json({
      error: isProd ? 'Error interno del servidor' : (err.message || 'Error interno')
    });
  }

  if (status >= 500) {
    return res.status(500).render('pages/500', {
      title: 'Error del servidor',
      message: isProd ? 'Algo salió mal. Intentalo de nuevo en unos minutos.' : (err.message || 'Error interno')
    });
  }

  res.status(status).render('pages/404', { title: 'Página no encontrada' });
}

module.exports = { notFound, errorHandler };