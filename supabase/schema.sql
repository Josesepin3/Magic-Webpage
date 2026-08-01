-- ============================================================
-- MagicOS — Schema de Supabase
-- Ejecutar en el SQL Editor del dashboard (Supabase → SQL Editor)
-- ============================================================

-- Perfiles (1:1 con auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'customer' check (role in ('customer','admin')),
  avatar_url text not null default '',
  created_at timestamptz not null default now()
);

-- Identifica admins (rol 'admin' en profiles)
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Crea el perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Catálogo
create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null,
  slug text unique not null,
  tagline text,
  description text,
  base_price numeric not null default 0,
  category text not null default 'os' check (category in ('os','hardware','cloud','silicon')),
  status text not null default 'available' check (status in ('available','coming_soon')),
  image_url text,
  features_json text,
  created_at timestamptz not null default now()
);

create table if not exists public.product_options (
  id bigint generated always as identity primary key,
  product_id bigint references public.products(id) on delete cascade,
  group_name text not null,
  group_order integer not null default 1,
  label text not null,
  description text,
  price_modifier numeric not null default 0,
  is_default boolean not null default false,
  sort_order integer not null default 1
);

-- Mensajes del formulario de contacto
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Carrito (por usuario)
create table if not exists public.cart_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint references public.products(id) on delete cascade,
  product_name text not null,
  product_slug text not null,
  options jsonb not null default '[]'::jsonb,
  unit_price numeric not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

-- Pedidos (checkout simulado)
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  total numeric not null default 0,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

-- Suscripciones / servicios (BlackBox: 'proximamente' hasta estar disponible y pago)
create table if not exists public.subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint references public.products(id) on delete cascade,
  product_name text not null,
  plan jsonb not null default '{}'::jsonb,
  status text not null default 'proximamente' check (status in ('active','proximamente')),
  created_at timestamptz not null default now()
);

-- ============================ RLS ============================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_options enable row level security;
alter table public.messages enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.subscriptions enable row level security;

-- profiles
drop policy if exists "profiles: lee su propio perfil" on public.profiles;
create policy "profiles: lee su propio perfil" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles: actualiza su propio perfil" on public.profiles;
create policy "profiles: actualiza su propio perfil" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "profiles: admin lee todos" on public.profiles;
create policy "profiles: admin lee todos" on public.profiles
  for select using (public.is_admin());

-- products / product_options (catálogo público, mutaciones admin)
drop policy if exists "products: lectura pública" on public.products;
create policy "products: lectura pública" on public.products
  for select using (true);
drop policy if exists "products: mutaciones admin" on public.products;
create policy "products: mutaciones admin" on public.products
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "options: lectura pública" on public.product_options;
create policy "options: lectura pública" on public.product_options
  for select using (true);
drop policy if exists "options: mutaciones admin" on public.product_options;
create policy "options: mutaciones admin" on public.product_options
  for all using (public.is_admin()) with check (public.is_admin());

-- messages (envío público, gestión admin)
drop policy if exists "messages: envío público" on public.messages;
create policy "messages: envío público" on public.messages
  for insert with check (true);
drop policy if exists "messages: admin gestiona" on public.messages;
create policy "messages: admin gestiona" on public.messages
  for all using (public.is_admin()) with check (public.is_admin());

-- cart_items (cada usuario maneja solo su carrito)
drop policy if exists "cart: solo su usuario" on public.cart_items;
create policy "cart: solo su usuario" on public.cart_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- orders
drop policy if exists "orders: solo su usuario" on public.orders;
create policy "orders: solo su usuario" on public.orders
  for select using (auth.uid() = user_id);
drop policy if exists "orders: usuario crea su pedido" on public.orders;
create policy "orders: usuario crea su pedido" on public.orders
  for insert with check (auth.uid() = user_id);
drop policy if exists "orders: admin lee todos" on public.orders;
create policy "orders: admin lee todos" on public.orders
  for select using (public.is_admin());

-- subscriptions
drop policy if exists "subscriptions: solo su usuario" on public.subscriptions;
create policy "subscriptions: solo su usuario" on public.subscriptions
  for select using (auth.uid() = user_id);
drop policy if exists "subscriptions: usuario crea sus servicios" on public.subscriptions;
create policy "subscriptions: usuario crea sus servicios" on public.subscriptions
  for insert with check (auth.uid() = user_id);
drop policy if exists "subscriptions: admin lee todos" on public.subscriptions;
create policy "subscriptions: admin lee todos" on public.subscriptions
  for select using (public.is_admin());

-- ===================== STORAGE (avatares) =====================

-- Subida/gestión: cada usuario solo puede tocar objetos dentro de su carpeta (su user id).
-- El path usado por ProfilePage es: <user_id>/avatar-<timestamp>.<ext>
drop policy if exists "avatars: lectura pública" on storage.objects;
create policy "avatars: lectura pública" on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists "avatars: usuarios suben su foto" on storage.objects;
create policy "avatars: usuarios suben su foto" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars: usuarios actualizan su foto" on storage.objects;
create policy "avatars: usuarios actualizan su foto" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars: usuarios borran su foto" on storage.objects;
create policy "avatars: usuarios borran su foto" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
