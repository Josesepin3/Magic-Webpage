const fs = require('fs');
const path = require('path');
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

const insertMessage = db.prepare(`
  INSERT INTO messages (name, email, subject, message, read) VALUES (?, ?, ?, ?, ?)
`);

const sampleMessages = [
  {
    name: 'Ana Torres', email: 'ana@example.com', subject: 'Disponibilidad de Sirius',
    message: 'Hola, ¿cuándo estará disponible la laptop Sirius? Me interesa el modelo con N1 Max.',
    read: 0
  },
  {
    name: 'Luis Pérez', email: 'luis@example.com', subject: 'Licencias de MagicOS',
    message: '¿MagicOS tiene licencias gratuitas para estudiantes? Estoy preparando mi tesis y me encantaría usarlo.',
    read: 1
  },
  {
    name: 'María García', email: 'maria@example.com', subject: 'Cifrado de BlackBox',
    message: 'Quiero saber más sobre el cifrado zero-knowledge de BlackBox Cloud y si funciona en Linux.',
    read: 0
  }
];

const productsData = [
  {
    id: 1,
    name: 'MagicOS', slug: 'magicos',
    tagline: 'El sistema operativo que pone tu privacidad primero.',
    description: 'MagicOS es un sistema operativo premium con núcleo diseñado para el procesamiento estrictamente local. Interfaz minimalista, seguridad radical y cero dependencia de la nube.',
    base_price: 0, category: 'os', status: 'available', image_url: '/img/MagicOS.png',
    features: [
      { title: 'Privacidad Radical', description: 'Procesamiento 100% local. Sin telemetría, sin rastreo.', img: '' },
      { title: 'Interfaz Minimalista', description: 'Diseñado para la productividad sin distracciones.', img: '' }
    ],
    options: []
  },
  {
    id: 2,
    name: 'Sirius Laptop', slug: 'sirius-laptop',
    tagline: 'Hardware modular. Potencia que te pertenece.',
    description: 'La laptop Sirius está diseñada bajo la filosofía de bloques de Lego: componentes fácilmente reparables y actualizables. Con el Chip N1 Kinetic integrado para un rendimiento local sin concesiones.',
    base_price: 1999, category: 'hardware', status: 'coming_soon', image_url: '',
    features: [
      { title: 'Diseño Modular', description: 'Cada componente se reemplaza individualmente. Adiós a la obsolescencia programada.', img: '' },
      { title: 'Chip N1 Kinetic', description: 'Arquitectura de silicio propia optimizada para ejecutar tareas complejas de forma local.', img: '' },
      { title: 'Privacidad por Defecto', description: 'Sin backdoors, sin telemetría. Tu máquina, tus reglas.', img: '' }
    ],
    options: [
      { group_name: 'Procesador', group_order: 1, label: 'N1 Kinetic', description: 'Rendimiento base — silicio propio optimizado', price_modifier: 0, is_default: 1, sort_order: 1 },
      { group_name: 'Procesador', group_order: 1, label: 'N1 Pro', description: '40% más rápido que el N1 Kinetic', price_modifier: 300, is_default: 0, sort_order: 2 },
      { group_name: 'Procesador', group_order: 1, label: 'N1 Max', description: '2x rendimiento respecto al N1 Kinetic', price_modifier: 700, is_default: 0, sort_order: 3 },
      { group_name: 'Procesador', group_order: 1, label: 'Intel Core Ultra 9', description: 'Última generación Intel — alternativa de terceros', price_modifier: 1200, is_default: 0, sort_order: 4 },
      { group_name: 'Procesador', group_order: 1, label: 'AMD Ryzen 9', description: 'Última generación AMD — alternativa de terceros', price_modifier: 1000, is_default: 0, sort_order: 5 },
      { group_name: 'RAM', group_order: 2, label: '8GB', description: '', price_modifier: 0, is_default: 0, sort_order: 1 },
      { group_name: 'RAM', group_order: 2, label: '16GB', description: '', price_modifier: 200, is_default: 1, sort_order: 2 },
      { group_name: 'RAM', group_order: 2, label: '32GB', description: '', price_modifier: 400, is_default: 0, sort_order: 3 },
      { group_name: 'RAM', group_order: 2, label: '64GB', description: '', price_modifier: 800, is_default: 0, sort_order: 4 },
      { group_name: 'Almacenamiento', group_order: 3, label: '256GB SSD', description: '', price_modifier: 0, is_default: 1, sort_order: 1 },
      { group_name: 'Almacenamiento', group_order: 3, label: '512GB SSD', description: '', price_modifier: 200, is_default: 0, sort_order: 2 },
      { group_name: 'Almacenamiento', group_order: 3, label: '1TB SSD', description: '', price_modifier: 400, is_default: 0, sort_order: 3 },
      { group_name: 'Almacenamiento', group_order: 3, label: '2TB SSD', description: '', price_modifier: 800, is_default: 0, sort_order: 4 }
    ]
  },
  {
    id: 3,
    name: 'Chip N1 Kinetic', slug: 'chip-n1-kinetic',
    tagline: 'Silicio propio. Rendimiento sin compromisos.',
    description: 'Arquitectura de silicio propietaria diseñada exclusivamente para MagicOS. Ejecuta tareas complejas de forma local, eficiente y veloz.',
    base_price: 0, category: 'silicon', status: 'coming_soon', image_url: '',
    features: [],
    options: []
  },
  {
    id: 4,
    name: 'BlackBox Cloud', slug: 'blackbox-cloud',
    tagline: 'El puente seguro entre tus dispositivos.',
    description: 'Almacenamiento en la nube con cifrado de extremo a extremo. Tan intuitivo como Google Drive, pero blindado con llaves que solo tú posees.',
    base_price: 0, category: 'cloud', status: 'coming_soon', image_url: '',
    features: [],
    options: []
  }
];

const seed = db.transaction(() => {
  for (const p of productsData) {
    const res = insertProduct.run(
      p.name, p.slug, p.tagline, p.description, p.base_price, p.category, p.status, p.image_url,
      JSON.stringify(p.features)
    );
    for (const opt of p.options) {
      insertOption.run(res.lastInsertRowid, opt.group_name, opt.group_order, opt.label, opt.description, opt.price_modifier, opt.is_default, opt.sort_order);
    }
  }

  const hash = bcrypt.hashSync('admin123', 10);
  insertUser.run('admin', 'admin@magicos.io', hash);

  for (const m of sampleMessages) {
    insertMessage.run(m.name, m.email, m.subject, m.message, m.read);
  }
});

seed();

const jsonPath = path.join(__dirname, 'data', 'products.json');
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(productsData, null, 2));

console.log('Base de datos poblada correctamente.');
console.log('  - 4 productos');
console.log(`  - ${productsData.reduce((n, p) => n + p.options.length, 0)} opciones configurables`);
console.log('  - 1 admin (admin / admin123)');
console.log(`  - ${sampleMessages.length} mensajes de ejemplo`);
console.log(`  - JSON generado en backend/data/products.json`);
