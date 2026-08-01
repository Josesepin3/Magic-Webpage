require('dotenv').config();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const ADMIN_EMAIL = 'admin@magicos.io';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME = 'Administrador';

async function ensureBucket() {
  const { data, error } = await supabase.storage.getBucket('avatars');
  if (error) {
    const { error: createError } = await supabase.storage.createBucket('avatars', { public: true });
    if (createError) console.log('  aviso bucket:', createError.message);
    else console.log('  bucket avatars creado (público)');
  } else {
    console.log('  bucket avatars ya existe');
  }
}

async function seedProducts() {
  const products = require(path.join(__dirname, '..', 'backend', 'data', 'products.json'));
  for (const p of products) {
    const { data: existing } = await supabase
      .from('products').select('id').eq('slug', p.slug).maybeSingle();

    let productId;
    if (existing) {
      productId = existing.id;
      console.log(`  producto ${p.slug} ya existe (id ${productId})`);
    } else {
      const { data, error } = await supabase
        .from('products').insert({
          name: p.name,
          slug: p.slug,
          tagline: p.tagline,
          description: p.description,
          base_price: p.base_price,
          category: p.category,
          status: p.status,
          image_url: p.image_url,
          features_json: JSON.stringify(p.features || [])
        }).select('id').single();
      if (error) {
        console.error(`  error producto ${p.slug}:`, error.message);
        continue;
      }
      productId = data.id;
      console.log(`  producto ${p.slug} creado (id ${productId})`);
    }

    if (!p.options || !p.options.length) continue;

    await supabase.from('product_options').delete().eq('product_id', productId);
    const rows = p.options.map((o) => ({
      product_id: productId,
      group_name: o.group_name,
      group_order: o.group_order,
      label: o.label,
      description: o.description,
      price_modifier: o.price_modifier,
      is_default: !!o.is_default,
      sort_order: o.sort_order
    }));
    const { error } = await supabase.from('product_options').insert(rows);
    if (error) console.error(`  error opciones ${p.slug}:`, error.message);
    else console.log(`  ${rows.length} opciones para ${p.slug}`);
  }
}

async function seedAdmin() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const admin = users.users.find((u) => u.email === ADMIN_EMAIL);

  let adminId;
  if (admin) {
    adminId = admin.id;
    console.log('  admin ya existe');
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: ADMIN_NAME }
    });
    if (error) {
      console.error('  error crear admin:', error.message);
      return;
    }
    adminId = data.user.id;
    console.log('  admin creado');
  }

  const { error } = await supabase
    .from('profiles').update({ role: 'admin', full_name: ADMIN_NAME }).eq('id', adminId);
  if (error) console.error('  error rol admin:', error.message);
  else console.log(`  perfil admin con rol admin (${ADMIN_EMAIL} / ${ADMIN_PASSWORD})`);
}

async function seedMessages() {
  const { data: existing } = await supabase.from('messages').select('id').limit(1);
  if (existing && existing.length) {
    console.log('  mensajes de ejemplo ya existen');
    return;
  }
  const { error } = await supabase.from('messages').insert([
    {
      name: 'Ana Torres',
      email: 'ana@example.com',
      subject: 'Disponibilidad de Sirius',
      message: 'Hola, ¿cuándo estará disponible la laptop Sirius? Me interesa el modelo con N1 Max.',
      read: false
    },
    {
      name: 'Luis Pérez',
      email: 'luis@example.com',
      subject: 'Licencias de MagicOS',
      message: '¿MagicOS tiene licencias gratuitas para estudiantes?',
      read: true
    }
  ]);
  if (error) console.error('  error mensajes:', error.message);
  else console.log('  2 mensajes de ejemplo');
}

async function main() {
  console.log('Seed Supabase en', URL);
  await ensureBucket();
  await seedProducts();
  await seedAdmin();
  await seedMessages();
  console.log('Seed Supabase completado.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
