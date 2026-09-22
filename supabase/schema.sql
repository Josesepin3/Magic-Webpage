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

-- ===================== ENDURECIMIENTO =====================
-- Integridad + anti-spam. Todo es idempotente (create or replace / drop trigger)
-- para poder re-ejecutar el archivo sin errores.

-- Precio de un ítem calculado SIEMPRE desde la BD: el cliente no puede forjar
-- unit_price ni totales. Si una opción no existe para el producto, se rechaza.
create or replace function public.recalc_unit_price(p_product_id bigint, p_options jsonb)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_total numeric;
  v_modifier numeric;
  v_item jsonb;
begin
  select base_price into v_total from public.products where id = p_product_id;
  if v_total is null then
    raise exception 'producto inválido';
  end if;
  if p_options is null or jsonb_typeof(p_options) <> 'array' then
    return v_total;
  end if;
  for v_item in select * from jsonb_array_elements(p_options) loop
    if not (v_item ? 'group' and v_item ? 'label') then
      raise exception 'opción malformada';
    end if;
    select price_modifier into v_modifier
      from public.product_options
     where product_id = p_product_id
       and group_name = v_item->>'group'
       and label = v_item->>'label';
    if v_modifier is null then
      raise exception 'opción inválida: %',
        coalesce(v_item->>'group', '') || ' / ' || coalesce(v_item->>'label', '');
    end if;
    v_total := v_total + v_modifier;
  end loop;
  return v_total;
end;
$$;

-- cart_items: nombre, slug y precio se resuelven desde products / product_options
create or replace function public.cart_items_enforce()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_product public.products%rowtype;
begin
  select * into v_product from public.products where id = new.product_id;
  if v_product is null then
    raise exception 'producto inválido';
  end if;
  new.product_name := v_product.name;
  new.product_slug := v_product.slug;
  new.options := coalesce(new.options, '[]'::jsonb);
  new.unit_price := public.recalc_unit_price(new.product_id, new.options);
  if coalesce(new.quantity, 0) < 1 then
    new.quantity := 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cart_items_enforce on public.cart_items;
create trigger trg_cart_items_enforce
  before insert or update on public.cart_items
  for each row execute function public.cart_items_enforce();

-- orders: se reconstruye items (precio por línea recalculado) y el total
-- siempre sale de la BD; el status se fuerza a 'confirmed'.
create or replace function public.orders_enforce()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_items jsonb;
begin
  select coalesce(jsonb_agg(
      jsonb_build_object(
        'product_id',   (v->>'product_id')::bigint,
        'product_name', v->>'product_name',
        'product_slug', v->>'product_slug',
        'options',      coalesce(v -> 'options', '[]'::jsonb),
        'quantity',     greatest(coalesce((v->>'quantity')::int, 1), 1),
        'unit_price',   public.recalc_unit_price(
                          (v->>'product_id')::bigint,
                          coalesce(v -> 'options', '[]'::jsonb)
                        ),
        'line_total',   public.recalc_unit_price(
                          (v->>'product_id')::bigint,
                          coalesce(v -> 'options', '[]'::jsonb)
                        ) * greatest(coalesce((v->>'quantity')::int, 1), 1)
      )
    ), '[]'::jsonb)
  into v_items
  from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) as v;

  new.items := v_items;
  select coalesce(sum((i->>'line_total')::numeric), 0)
    into new.total
    from jsonb_array_elements(v_items) as i;
  new.status := 'confirmed';
  return new;
end;
$$;

drop trigger if exists trg_orders_enforce on public.orders;
create trigger trg_orders_enforce
  before insert on public.orders
  for each row execute function public.orders_enforce();

-- messages: normaliza y limita el spam (máx. 5 mensajes por email cada 10 min)
create or replace function public.messages_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  new.email   := lower(btrim(coalesce(new.email, '')));
  new.name    := btrim(coalesce(new.name, ''));
  new.subject := btrim(coalesce(new.subject, ''));
  new.message := btrim(coalesce(new.message, ''));
  if new.email = '' or new.message = '' then
    raise exception 'email y mensaje son obligatorios';
  end if;
  select count(*) into v_count
    from public.messages
   where email = new.email
     and created_at > now() - interval '10 minutes';
  if v_count >= 5 then
    raise exception 'demasiados mensajes; esperá unos minutos';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_messages_guard on public.messages;
create trigger trg_messages_guard
  before insert on public.messages
  for each row execute function public.messages_guard();

-- subscriptions: nombre y estado siempre resueltos desde products (evita que el
-- cliente marque un producto 'coming_soon' como pago/activo).
create or replace function public.subscriptions_enforce()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_product public.products%rowtype;
begin
  select * into v_product from public.products where id = new.product_id;
  if v_product is null then
    raise exception 'producto inválido';
  end if;
  new.product_name := v_product.name;
  new.status := case when v_product.status = 'available' then 'active' else 'proximamente' end;
  return new;
end;
$$;

drop trigger if exists trg_subscriptions_enforce on public.subscriptions;
create trigger trg_subscriptions_enforce
  before insert on public.subscriptions
  for each row execute function public.subscriptions_enforce();
