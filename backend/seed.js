const bcrypt = require('bcrypt');
const { getDb } = require('./config/db');

const db = getDb();

db.exec('DELETE FROM product_options');
db.exec('DELETE FROM products');
db.exec('DELETE FROM messages');
db.exec('DELETE FROM users');

const insertProduct = db.prepare(`
  INSERT INTO products (name, slug, tagline, description, base_price, category, status, image_url, features_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertOption = db.prepare(`
  INSERT INTO product_options (product_id, group_name, group_order, label, description, price_modifier, is_default, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertUser = db.prepare(`
  INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)
`);

const seed = db.transaction(() => {
  const magicos = insertProduct.run(
    'MagicOS', 'magicos',
    'El sistema operativo que pone tu privacidad primero.',
    'MagicOS es un sistema operativo premium con núcleo diseñado para el procesamiento estrictamente local. Interfaz minimalista, seguridad radical y cero dependencia de la nube.',
    0, 'os', 'available', '/img/MagicOS.png',
    JSON.stringify([
      { title: 'Privacidad Radical', description: 'Procesamiento 100% local. Sin telemetría, sin rastreo.', img: '' },
      { title: 'Interfaz Minimalista', description: 'Diseñado para la productividad sin distracciones.', img: '' }
    ])
  );

  const sirius = insertProduct.run(
    'Sirius Laptop', 'sirius-laptop',
    'Hardware modular. Potencia que te pertenece.',
    'La laptop Sirius está diseñada bajo la filosofía de bloques de Lego: componentes fácilmente reparables y actualizables. Con el Chip N1 Kinetic integrado para un rendimiento local sin concesiones.',
    1999, 'hardware', 'coming_soon', '',
    JSON.stringify([
      { title: 'Diseño Modular', description: 'Cada componente se reemplaza individualmente. Adiós a la obsolescencia programada.', img: '' },
      { title: 'Chip N1 Kinetic', description: 'Arquitectura de silicio propia optimizada para ejecutar tareas complejas de forma local.', img: '' },
      { title: 'Privacidad por Defecto', description: 'Sin backdoors, sin telemetría. Tu máquina, tus reglas.', img: '' }
    ])
  );

  const chip = insertProduct.run(
    'Chip N1 Kinetic', 'chip-n1-kinetic',
    'Silicio propio. Rendimiento sin compromisos.',
    'Arquitectura de silicio propietaria diseñada exclusivamente para MagicOS. Ejecuta tareas complejas de forma local, eficiente y veloz.',
    0, 'silicon', 'coming_soon', '',
    '[]'
  );

  const cloud = insertProduct.run(
    'BlackBox Cloud', 'blackbox-cloud',
    'El puente seguro entre tus dispositivos.',
    'Almacenamiento en la nube con cifrado de extremo a extremo. Tan intuitivo como Google Drive, pero blindado con llaves que solo tú posees.',
    0, 'cloud', 'coming_soon', '',
    '[]'
  );

  const optionsData = [
    { product_id: sirius.lastInsertRowid, group_name: 'Procesador', group_order: 1, label: 'N1 Kinetic', description: 'Rendimiento base — silicio propio optimizado', price_modifier: 0, is_default: 1, sort_order: 1 },
    { product_id: sirius.lastInsertRowid, group_name: 'Procesador', group_order: 1, label: 'N1 Pro', description: '40% más rápido que el N1 Kinetic', price_modifier: 300, is_default: 0, sort_order: 2 },
    { product_id: sirius.lastInsertRowid, group_name: 'Procesador', group_order: 1, label: 'N1 Max', description: '2x rendimiento respecto al N1 Kinetic', price_modifier: 700, is_default: 0, sort_order: 3 },
    { product_id: sirius.lastInsertRowid, group_name: 'Procesador', group_order: 1, label: 'Intel Core Ultra 9', description: 'Última generación Intel — alternativa de terceros', price_modifier: 1200, is_default: 0, sort_order: 4 },
    { product_id: sirius.lastInsertRowid, group_name: 'Procesador', group_order: 1, label: 'AMD Ryzen 9', description: 'Última generación AMD — alternativa de terceros', price_modifier: 1000, is_default: 0, sort_order: 5 },
    { product_id: sirius.lastInsertRowid, group_name: 'RAM', group_order: 2, label: '8GB', description: '', price_modifier: 0, is_default: 0, sort_order: 1 },
    { product_id: sirius.lastInsertRowid, group_name: 'RAM', group_order: 2, label: '16GB', description: '', price_modifier: 200, is_default: 1, sort_order: 2 },
    { product_id: sirius.lastInsertRowid, group_name: 'RAM', group_order: 2, label: '32GB', description: '', price_modifier: 400, is_default: 0, sort_order: 3 },
    { product_id: sirius.lastInsertRowid, group_name: 'RAM', group_order: 2, label: '64GB', description: '', price_modifier: 800, is_default: 0, sort_order: 4 },
    { product_id: sirius.lastInsertRowid, group_name: 'Almacenamiento', group_order: 3, label: '256GB SSD', description: '', price_modifier: 0, is_default: 1, sort_order: 1 },
    { product_id: sirius.lastInsertRowid, group_name: 'Almacenamiento', group_order: 3, label: '512GB SSD', description: '', price_modifier: 200, is_default: 0, sort_order: 2 },
    { product_id: sirius.lastInsertRowid, group_name: 'Almacenamiento', group_order: 3, label: '1TB SSD', description: '', price_modifier: 400, is_default: 0, sort_order: 3 },
    { product_id: sirius.lastInsertRowid, group_name: 'Almacenamiento', group_order: 3, label: '2TB SSD', description: '', price_modifier: 800, is_default: 0, sort_order: 4 },
  ];

  for (const opt of optionsData) {
    insertOption.run(opt.product_id, opt.group_name, opt.group_order, opt.label, opt.description, opt.price_modifier, opt.is_default, opt.sort_order);
  }

  const hash = bcrypt.hashSync('admin123', 10);
  insertUser.run('admin', 'admin@magicos.io', hash);

  console.log('Base de datos poblada correctamente.');
  console.log('  - 4 productos');
  console.log(`  - ${optionsData.length} opciones configurables`);
  console.log('  - 1 admin (admin / admin123)');
});

seed();
