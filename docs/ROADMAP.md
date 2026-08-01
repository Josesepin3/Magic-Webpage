# MagicOS-Webpage — Roadmap del Proyecto

> **Contexto:** Página web oficial de MagicOS, desarrollada como proyecto de curso.
> Progresión: HTML → CSS → Backend con JS.
>
> Este documento es la guía viva del proyecto. Los detalles cambiarán sobre la
> marcha, pero la estructura y visión general se mantienen aquí.

> **Estado (1 ago 2026):** Backend fundado, catálogo y configurador funcionando,
> rebranding a **Magic** (rutas `/productos`), navbar liquid-glass, página de
> Sirius rediseñada según maqueta, responsive móvil ajustado y **deploy en
> GitHub Pages funcionando** (requisito del proyecto; Netlify quedó bloqueado por
> créditos de build). Fases 2, 3 y 4 completas. **Migración a Supabase**
> implementada (Fase 4b): cuentas de cliente (email/contraseña + Google opcional),
> avatar en el navbar, carrito solo con cuenta, checkout simulado, "Mis
> servicios" y el admin (login/CRUD/mensajes) ahora corren 100% contra Supabase
> en GitHub Pages. Pendiente: aplicar `supabase/schema.sql` en el SQL Editor,
> ejecutar `npm run seed:supabase`, configurar redirects de Auth y Google OAuth,
> y probar/deploy. Siguiente: Fase 5 (IA con Mistral).

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Vanilla JS + EJS (SSR con Express local / prerender estático en build) |
| **Backend** | Node.js + Express (dev local, páginas públicas) |
| **Base de Datos** | SQLite (`better-sqlite3`) — solo dev local |
| **Autenticación** | **Supabase Auth** (email/contraseña + Google opcional) |
| **Persistencia** | **Supabase** (Postgres + RLS + Storage para avatares) |
| **IA** | Mistral API (modelo open-source gratuito) |
| **CSS** | Vanilla (sin frameworks) |
| **JS Frontend** | Modular, componentes funcionales puros |
| **Deploy** | GitHub Pages (`josesepin3.github.io/MagicOS-Webpage`, workflow Actions) |

---

## Estructura del Proyecto (Actual)

```
MagicOS-Webpage/
├── frontend/
│   ├── style.css                # Estilos globales (incluye liquid-glass navbar + reveal on scroll)
│   ├── img/                     # Imágenes y SVGs (hero Sirius, módulos, badges, logo blanco)
│   └── js/                      # JS modular del lado cliente
│       ├── components/
│       │   ├── ProductConfigurator.js  # Configurador tipo Apple + "Añadir al carrito" (Supabase)
│       │   ├── RevealOnScroll.js       # Reveal al scrollear (IntersectionObserver)
│       │   ├── ContactForm.js          # Validación + envío FormSubmit + insert en Supabase messages
│       │   ├── NavAuth.js              # Avatar + menú de cuenta + badge de carrito en el navbar
│       │   ├── AuthForm.js             # Login/registro de cliente (email + Google opcional)
│       │   ├── ProfilePage.js          # Perfil: subida de avatar a Storage, nombre, logout
│       │   ├── CartManager.js          # Carrito: cantidad, eliminar, checkout simulado (orders/subscriptions)
│       │   ├── ServicesPage.js         # "Mis servicios" (subscriptions: activo / próximamente)
│       │   ├── LoginForm.js            # Login de admin (Supabase, chequea rol admin)
│       │   └── AdminApp.js             # Dashboard: mensajes + CRUD productos (Supabase)
│       └── services/
│           └── supabase.js             # Cliente Supabase + helpers basePath/url/currentPath
│           └── api.js                  # Fetch wrapper (legacy, no usado en Supabase)
├── supabase/
│   └── schema.sql                  # Schema: profiles, products, cart_items, orders, subscriptions + RLS
├── backend/
│   ├── app.js                   # Entry point de Express (dev local)
│   ├── config/
│   │   └── db.js                # Inicialización SQLite + schemas
│   ├── middleware/
│   │   └── auth.js              # requireAuth (JWT Bearer) + signToken
│   ├── routes/
│   │   ├── home.js              # GET /
│   │   ├── products.js          # GET /productos, /productos/:slug, /productos/:slug/configure
│   │   ├── contact.js           # GET /contacto
│   │   ├── auth.js              # POST /api/auth/login
│   │   ├── admin.js             # GET /admin/login, /admin/dashboard
│   │   └── adminApi.js          # /api/admin/* protegidas (mensajes + CRUD productos)
│   ├── views/
│   │   ├── partials/            # header.ejs, footer.ejs, n1-badge.ejs, blackbox-badge.ejs
│   │   └── pages/
│   │       ├── home.ejs                  # Vacía — pendiente rediseño del ecosistema (landing en /productos/magicos)
│   │       ├── productos.ejs          # Grid de productos
│   │       ├── product-*.ejs          # Página por producto (magicos, sirius-laptop, chip-n1-kinetic, blackbox-cloud)
│   │       ├── configure.ejs          # Configurador con opciones + "Añadir al carrito"
│   │       ├── contact.ejs            # Formulario de contacto (FormSubmit + tabla messages)
│   │       ├── cuenta-login.ejs       # Login/registro de cliente (Supabase Auth)
│   │       ├── cuenta-perfil.ejs      # Perfil: avatar (Storage) + nombre + logout
│   │       ├── carrito.ejs            # Carrito (solo con cuenta) + checkout simulado
│   │       ├── cuenta-servicios.ejs   # "Mis servicios" (subscriptions)
│   │       ├── login.ejs              # Login de admin (Supabase, rol admin)
│   │       ├── dashboard.ejs          # Panel de admin (Supabase: mensajes + CRUD productos)
│   │       └── 404.ejs
│   ├── data/
│   │   ├── magicos.db           # SQLite file (ignorado en git)
│   │   └── products.json        # Datos de productos para el build estático (commiteado)
│   └── seed.js                  # Poblar BD local + generar products.json
├── scripts/
│   └── build-static.js          # Prerender EJS → dist/ (build de GitHub Pages)
├── netlify.toml                 # Config de build/deploy en Netlify
├── docs/
│   ├── mockups/                 # Maquetas de diseño (Sirius.svg)
│   └── ROADMAP.md               # Este archivo
├── package.json
└── .gitignore
```

---

## Tabla de Rutas (API y Páginas)

> Rebranding: las rutas `/catalogo*` pasaron a `/productos*` (marca **Magic**).

### Páginas (Server-rendered con EJS)

| Método | Ruta | Vista | Descripción | Estado |
|--------|------|-------|-------------|--------|
| GET | `/` | `home.ejs` | Landing page (hero + features + CTA) | ✅ |
| GET | `/productos` | `productos.ejs` | Grid de todos los productos | ✅ |
| GET | `/productos/:slug` | `product-<slug>.ejs` | Página individual por producto | ✅ |
| GET | `/productos/:slug/configure` | `configure.ejs` | Configurador de producto | ✅ |
| GET | `/contacto` | `contact.ejs` | Formulario de contacto (**FormSubmit**) | ✅ |
| GET | `/cuenta/login` | `cuenta-login.ejs` | Login/registro de cliente (Supabase) | ✅ |
| GET | `/cuenta/perfil` | `cuenta-perfil.ejs` | Perfil (avatar + nombre + logout) | ✅ |
| GET | `/carrito` | `carrito.ejs` | Carrito (solo con cuenta) + checkout | ✅ |
| GET | `/cuenta/servicios` | `cuenta-servicios.ejs` | "Mis servicios" (subscriptions) | ✅ |
| GET | `/admin/login` | `login.ejs` | Login para admin (Supabase) | ✅ |
| GET | `/admin/dashboard` | `dashboard.ejs` | Panel de administración (Supabase) | ✅ |

### API REST (JSON)

> **Nota:** en el deploy de GitHub Pages la web es estática; ya no hay endpoints
> REST de Express. **Todo** (auth, admin, mensajes, carrito, pedidos) corre contra
> **Supabase** con el SDK de cliente + RLS. Los endpoints antiguos de
> `/api/auth` y `/api/admin` se eliminaron de `backend/app.js`.

| Recurso | Operaciones | Dónde |
|---------|-------------|-------|
| `auth.users` + `auth` | signUp, signInWithPassword, signInWithOAuth (Google), signOut | SDK `supabase.auth` |
| `profiles` | perfil propio (rol, nombre, avatar_url) — trigger crea fila al registrarse | tabla pública + RLS |
| `products` / `product_options` | catálogo lectura pública; CRUD admin (rol `admin`) | tabla pública + RLS |
| `messages` | insert público (contacto) + gestión admin | tabla pública + RLS |
| `cart_items` | solo el dueño (`auth.uid() = user_id`) | tabla pública + RLS |
| `orders` | el usuario crea su pedido y lo lee; admin lee todos | tabla pública + RLS |
| `subscriptions` | el usuario crea sus servicios y los lee; admin lee todos | tabla pública + RLS |
| `storage.avatars` | subida pública de fotos de perfil (bucket `avatars`) | Storage |
| POST | `/api/ai/chat` | Chat con IA vía Mistral | ⏳ |

---

## Modelos de Datos (SQLite)

### products

```sql
CREATE TABLE products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  tagline     TEXT,                  -- Frase corta tipo Apple
  description TEXT,
  base_price  REAL,
  category    TEXT,                  -- 'os', 'hardware', 'cloud', 'silicon'
  status      TEXT DEFAULT 'available',  -- 'available' | 'coming_soon'
  image_url   TEXT,
  features_json TEXT,                -- [{"title":"Diseño","desc":"...","img":"..."}]
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### product_options (Configuraciones tipo Apple)

```sql
CREATE TABLE product_options (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id      INTEGER REFERENCES products(id),
  group_name      TEXT NOT NULL,     -- 'Procesador', 'RAM', 'Almacenamiento', 'Pantalla'
  group_order     INTEGER,           -- Orden del grupo en la UI
  label           TEXT NOT NULL,      -- 'N1 Pro', '16GB', '512GB SSD'
  description     TEXT,               -- '40% más rápido que el base'
  price_modifier  REAL,               -- +$200
  is_default      INTEGER DEFAULT 0, -- Opción seleccionada por defecto
  sort_order      INTEGER
);
```

### messages

```sql
CREATE TABLE messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT,
  message     TEXT NOT NULL,
  read        INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### users (Admin)

> Solo aplica al dev local. En el deploy se prevé sustituir por Supabase Auth.

```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Diseño Visual de Páginas Clave

### `/productos` — Grid de productos

Cuadrícula minimalista con cards que muestran imagen, nombre, descripción corta
y estado (disponible/próximamente). Cada card enlaza a la página individual.

```
┌─────────────────────────────────────────────┐
│   [Filtros por categoría]                    │
│                                             │
│   ┌────────┐  ┌────────┐                    │
│   │MagicOS │  │ Sirius  │                    │
│   │  OS    │  │ Laptop  │                    │
│   │Desde $0│  │  --     │                    │
│   └────────┘  └────────┘                    │
│   ┌────────┐  ┌────────┐                    │
│   │  Chip  │  │ BlackBox│                    │
│   │ N1     │  │  Cloud  │                    │
│   │Kinetic │  │Próximo  │                    │
│   └────────┘  └────────┘                    │
└─────────────────────────────────────────────┘
```

### `/productos/:slug` — Página de producto (estilo Apple)

Diseño vertical con secciones narrativas. Cada sección ocupa la pantalla o
cerca, con imagen a tamaño completo y texto superpuesto o al costado.

```
┌─────────────────────────────────────────────┐
│  [Sticky nav: MagicOS  ♥  Sirius  →Comprar]│
├─────────────────────────────────────────────┤
│       ┌──────────────────────────┐          │
│       │                          │          │
│       │   Hero: imagen grande    │          │
│       │   Nombre + tagline       │          │
│       │   "Diseñado para la      │          │
│       │    libertad. Potencia    │          │
│       │    que te pertenece."    │          │
│       └──────────────────────────┘          │
│                                             │
│   ─── Sección 1: Diseño ───                 │
│   [Imagen del perfil delgado]               │
│   "Modular como Lego. Robusto como roca."   │
│                                             │
│   ─── Sección 2: Chip N1 Kinetic ───        │
│   [Imagen chip integrado]                   │
│   "Procesamiento local sin concesiones."    │
│                                             │
│   ─── Sección 3: Privacidad ───             │
│   [Gráfico escudo / datos locales]          │
│   "Tus datos, tu propiedad."                │
│                                             │
│   ─── Sección 4: Configura y compra ───     │
│   [Botón "Configurar" → /configure]         │
│                                             │
└─────────────────────────────────────────────┘
```

### `/productos/:slug/configure` — Configurador

Dos columnas: opciones a la izquierda, resumen + imagen actualizada a la derecha.
Cada grupo de opciones (Procesador, RAM, Almacenamiento) es un conjunto de cards
seleccionables (radio buttons estilizados). El precio se actualiza en tiempo real
conforme se cambian opciones.

```
┌─────────────────────────────────────────────┐
│  Sirius Laptop           [Resumen lateral]  │
│  Configura tu equipo      ┌───────────────┐ │
│                            │               │ │
│  Procesador                │ Imagen del    │ │
│  ◉ N1 Kinetic (base)       │ laptop según  │ │
│  ○ N1 Pro        (+$300)   │ selección     │ │
│  ○ N1 Max        (+$700)   │               │ │
│  ─── Intel / AMD ───        │ N1 Kinetic    │ │
│  ○ Intel Core Ultra 9     │ 32GB RAM      │ │
│    (+$1,200)                │ 512GB SSD     │ │
│  ○ AMD Ryzen 9             │               │ │
│    (+$1,000)                │ Total:        │ │
│                            │ $1,999        │ │
│  Memoria RAM               │               │ │
│  ○ 8GB                      │ [Añadir al    │ │
│  ◉ 16GB  (+$200)           │  carrito]     │ │
│  ○ 32GB  (+$400)           │               │ │
│  ○ 64GB  (+$800)           └───────────────┘ │
│                                              │
│  Almacenamiento                               │
│  ◉ 256GB SSD                                 │
│  ○ 512GB SSD  (+$200)                        │
│  ○ 1TB SSD    (+$400)                        │
│  ○ 2TB SSD    (+$800)                        │
│                                              │
│  Pantalla 13.3"                              │
│  Panel LiquidUX — 2880×1800                  │
│  (única opción, misma pantalla               │
│   en todos los modelos)                      │
│                                              │
└─────────────────────────────────────────────┘
```

---

## Integración con Mistral API

### System Prompt (voz de marca)

```
Eres un asistente de MagicOS, un sistema operativo premium
enfocado en privacidad radical y procesamiento local.
Conoces todos los productos del ecosistema: MagicOS (OS),
Sirius Laptop (hardware modular), Chip N1 Kinetic (silicio
propio) y BlackBox Cloud (almacenamiento cifrado).
Responde en español con tono elegante, minimalista y
profesional. Si te preguntan por productos futuros, indica
que están en desarrollo pero sin dar fechas concretas.
Genera textos listos para usar cuando te pidan descripciones
o copy de marketing.
```

### Flujo de la API

1. Frontend envía `POST /api/ai/chat` con `{ messages: [{role, content}] }`
2. Backend arma el contexto:
   - System prompt (fijo)
   - Productos actuales desde BD (nombre, descripción, precio)
   - Historial de mensajes del usuario
3. Backend llama a Mistral API (modelo open-source vía endpoint gratuito)
4. Backend devuelve `{ reply: "..." }` al frontend
5. ChatWidget muestra la respuesta con formato loading → typing → completo

---

## Plan de Implementación por Fases

### Fase 1 — Fundación del Backend

**Objetivo:** Tener Express funcionando con SQLite y EJS.

- [x] `npm init` + instalar express, better-sqlite3, ejs, bcrypt, jsonwebtoken, dotenv
- [x] Crear `backend/app.js` con Express configurado
- [x] `backend/config/db.js`: inicializar SQLite, crear tablas
- [x] `backend/seed.js`: poblar BD con productos MagicOS + admin por defecto
- [x] Migrar landing actual (HTML estático) a `views/pages/home.ejs`
- [x] Crear `views/partials/header.ejs` y `footer.ejs`
- [x] Rutas básicas: home, catálogo (`/productos`), contacto

### Fase 2 — Catálogo de Productos

**Objetivo:** Páginas de producto con estilo Apple.

- [x] Ruta `GET /productos` — grid de productos desde BD (antes `/catalogo`)
- [x] Ruta `GET /productos/:slug` — página individual por producto
- [x] Ruta `GET /productos/:slug/configure` — configurador con opciones desde BD
- [x] Componente JS `ProductConfigurator.js` — cálculo dinámico de precio
- [x] CSS para diseño Apple: hero full-screen, navbar sticky liquid-glass, secciones narrativas (Sirius)
- [x] Animaciones: reveal al scrollear con IntersectionObserver (`RevealOnScroll.js`)

### Fase 3 — Formulario de Contacto

**Objetivo:** Formulario funcional con validación y persistencia.

> **Cambio de enfoque:** la persistencia se resuelve con **FormSubmit**
> (compatible con GitHub Pages, sin registro) en vez de `POST /api/contact` +
> SQLite. El formulario usa `data-ajax="true"` para que el envío sea por AJAX y
> el componente maneje los estados sin recargar la página.

- [x] Ruta `GET /contacto` — página con formulario (estructura básica)
- [x] Persistencia de envíos — FormSubmit (`https://formsubmit.co/josesepint3@gmail.com`,
      con honeypot `_honey`, `_subject` y captcha deshabilitado)
- [x] Componente JS `ContactForm.js` — validación frontend en tiempo real
      (nombre, correo, asunto, mensaje con mensajes por campo)
- [x] Estados: loading (spinner en botón), éxito (mensaje verde), error (alerta)
- [x] CSS para el formulario: estilo Apple (inputs sin bordes con fondo sutil,
      focus ring azul, botón pill)

### Fase 4 — Admin Panel

**Objetivo:** Login + dashboard protegido.

> **Nota:** solo aplica al dev local (Express + SQLite). En GitHub Pages no hay
> backend, así que el admin no se publica en el sitio estático. El plan para
> llevarlo al deploy es migrar la persistencia a Supabase (Auth + tablas + SDK).

- [x] Ruta `GET /admin/login` — página de login
- [x] Componente JS `LoginForm.js` — validación + llamada a `POST /api/auth/login`,
      guarda el JWT en localStorage y redirige al dashboard
- [x] Ruta `POST /api/auth/login` — verifica credenciales (bcrypt), devuelve JWT
      (2h, firma `JWT_SECRET` del `.env`; fallback dev)
- [x] Middleware `backend/middleware/auth.js` — verifica `Authorization: Bearer` en rutas protegidas
- [x] Ruta `GET /admin/dashboard` — panel protegido (el cliente redirige a login si no hay token) con:
  - Lista de mensajes de contacto (marcar leído/no leído, eliminar, contador)
  - CRUD de productos (nombre, slug, tagline, descripción, precio, categoría,
    estado, imagen, features JSON) + opciones configurables (builder por filas)
  - Logout (limpia localStorage)
- [x] Rutas API (`/api/admin`, protegidas con JWT): `GET/POST /products`,
      `GET/PUT/DELETE /products/:id`, `GET/PUT /products/:id/options`,
      `GET/PATCH/DELETE /messages/:id`

### Fase 4b — Migración a Supabase (cuentas + carrito + admin en GitHub Pages)

**Objetivo:** que **todo** (admin, cuentas de cliente, carrito, servicios) funcione
en el deploy estático de GitHub Pages, sin backend Express.

- [x] `supabase/schema.sql` — `profiles` (trigger `handle_new_user`), `products`,
      `product_options`, `messages`, `cart_items`, `orders`, `subscriptions`,
      función `is_admin()` y políticas RLS por usuario/admin
- [x] `scripts/seed-supabase.js` (`npm run seed:supabase`) — crea admin
      (`admin@magicos.io` / `admin123`, rol admin), 4 productos con sus opciones,
      2 mensajes de ejemplo y el bucket `avatars`
- [x] Cliente: `frontend/vendor/supabase.js` (UMD) + `config.js` (URL + anon key)
      + `services/supabase.js` (helpers `url`/`currentPath` con `data-base-path`)
- [x] Cuentas de cliente: `AuthForm.js` (email/contraseña + Google opcional con
      flag `GOOGLE` en config), trigger crea el perfil al registrarse
- [x] Avatar en el navbar: `NavAuth.js` — desktop a la derecha del menú; mobile
      absoluto a la izquierda (el toggle queda a la derecha); foto desde
      Storage + avatar de Google + fallback de iniciales; sin sesión despliega
      menú "Iniciar sesión / Crear cuenta"; badge de carrito con contador
- [x] Carrito solo con cuenta: `CartManager.js` + botón "Añadir al carrito" en
      el configurador (redirige a login con `next` si no hay sesión)
- [x] Checkout simulado: crea `orders` + `subscriptions` (los no disponibles
      quedan `proximamente`) y vacía el carrito
- [x] "Mis servicios": `ServicesPage.js` (licencias activas / próximamente)
- [x] Contacto: `ContactForm.js` inserta también en `messages` (además de FormSubmit)
- [x] Admin a Supabase: `LoginForm.js` (chequea rol `admin`) y `AdminApp.js`
      (mensajes + CRUD productos/opciones) sin endpoints Express
- [x] `backend/app.js` — eliminados `/api/auth` y `/api/admin` (Express solo
      sirve páginas públicas en dev local); nuevas rutas de cuenta/carrito
- [x] CSS sección 22 — cuenta, carrito, servicios, avatar y menú de usuario
- [ ] Aplicar `supabase/schema.sql` en el SQL Editor de Supabase
- [ ] `npm run seed:supabase` (requiere el schema aplicado)
- [ ] Dashboard de Supabase → Auth → URL Configuration: redirects
      `http://localhost:3000/**` y `https://josesepin3.github.io/MagicOS-Webpage/**`
- [ ] Google OAuth en Supabase (opcional) y poner `GOOGLE: true` en `config.js`
- [ ] Probar local (`npm run dev` + `npx serve dist`) y desplegar a `main`

### Fase 5 — IA

**Objetivo:** Chatbot con Mistral API.

- [ ] Componente JS `ChatWidget.js` — flotante, toggle mostrar/ocultar
- [ ] Servicio `services/ai.js` — llama a `POST /api/ai/chat`
- [ ] Ruta `POST /api/ai/chat` — arma contexto + llama a Mistral
- [ ] System prompt con productos desde BD (dinámico)
- [ ] Estados: loading (puntos animados), error (reintentar), vacío (placeholder)

### Fase 6 — Refinamiento UX

**Objetivo:** Pulir toda la experiencia.

- [ ] Estados de carga en todas las páginas (skeleton screens o spinners)
- [ ] Estados de error con mensajes claros y acción de reintentar
- [ ] Estados vacío ("No hay productos", "No hay mensajes")
- [~] Animaciones CSS: hover en cards ✅, scroll reveal ✅ (Fase 2)
- [x] Validación en tiempo real en formularios (Fase 3 — ContactForm.js)
- [~] Responsive real probado en mobile/tablet/desktop (Sirius en curso)
- [x] `.gitignore` (node_modules, .env, *.db)
- [x] Comentarios técnicos en código clave
- [x] Documentación de cómo ejecutar el proyecto

---

## Productos del Ecosistema MagicOS

| Producto | Categoría | Estado | Slugs |
|----------|-----------|--------|-------|
| **MagicOS** | Sistema Operativo | ✔ Disponible | `magicos` |
| **Sirius Laptop** | Hardware | ⏳ En desarrollo | `sirius-laptop` |
| **Chip N1 Kinetic** | Silicon | ⏳ En desarrollo | `chip-n1-kinetic` |
| **BlackBox Cloud** | Cloud | ⏳ En desarrollo | `blackbox-cloud` |

### Opciones configurables por producto

> Sirius: las opciones de Procesador, RAM y Almacenamiento ya están sembradas en
> la BD (`seed.js`) y el configurador las muestra en `/productos/sirius-laptop/configure`.

**Sirius Laptop:**
- **Procesador N1** (silicio propio, optimizado para MagicOS):
  - N1 Kinetic (base)
  - N1 Pro (+$300)
  - N1 Max (+$700)
- **Procesador alternativo** (decoy — más caro para que N1 sea más atractivo):
  - Intel Core Ultra 9 (última generación) +$1,200
  - AMD Ryzen 9 (última generación) +$1,000
  > Estrategia: Al ofrecer Intel/AMD como alternativa más cara, el N1
  > parece la opción inteligente (precio justo por rendimiento propio).
  > También da libertad a quien insista en CPU de marca conocida.
- RAM: 8GB, 16GB, 32GB, 64GB
- Almacenamiento: 256GB, 512GB, 1TB, 2TB SSD
- **Pantalla única:** 13.3" — panel LiquidUX 2880×1800 (misma en todos los modelos)
- Color: Obsidian Black, Starlight Silver, Midnight Blue

**BlackBox Cloud:**
- Plan: Personal (1TB), Professional (5TB), Enterprise (50TB)
- Cifrado: Estándar, AES-256 + Zero-Knowledge

---

## Notas Técnicas

### Ejecución del proyecto
```bash
npm install
npm run seed          # Poblar BD local (dev) + regenerar backend/data/products.json
npm run seed:supabase # Poblar Supabase (admin, productos, opciones, mensajes) — requiere schema aplicado
npm run dev           # Servidor Express local (nodemon, http://localhost:3000)
npm run build         # Prerender estático EJS → dist/ (sin SQLite ni módulos nativos)
```

### Deploy (GitHub Pages — requerimiento del proyecto)

> **Importante:** Netlify bloqueó los deploys (créditos de build del plan gratuito,
> periodo 16 jul → 16 ago 2026), así que el deploy oficial ahora es **GitHub Pages**.

- **GitHub Pages:** `https://josesepin3.github.io/MagicOS-Webpage/`
  - Workflow `.github/workflows/deploy.yml`: en cada push a `main` corre
    `npm ci` + `npm run build` (en runners de GitHub, sin límite de créditos) y
    publica `dist/` vía `actions/deploy-pages`.
  - El build usa `BASE_PATH=/MagicOS-Webpage` para prefijar las rutas absolutas
    (`href/src/srcset`) en el HTML prerenderizado (`scripts/build-static.js`).
  - En dev local y Netlify el `BASE_PATH` queda vacío (rutas de raíz).
- **Netlify** (`magic-os.netlify.app`): quedó deshabilitado por límite de créditos.
  El sitio estático seguiría desplegándose si se repone crédito (los datos ya están
  en `main`), pero la web oficial es GitHub Pages.
- `netlify.toml`: build `npm run build`, publish `dist` (ya no es el canal principal).
- Formularios: FormSubmit (`https://formsubmit.co/josesepint3@gmail.com`) con
  `data-ajax="true"` + `ContactForm.js`. El envío llega por correo al email de la
  cuenta; la primera vez que se envía hay que confirmar la activación que llega
  a la bandeja. (Netlify Forms era solo Netlify; en GitHub Pages el POST no
  tiene backend, por eso se migró.)

### Variables de entorno (`.env`)
```
PORT=3000
JWT_SECRET=...
MISTRAL_API_KEY=...
MISTRAL_API_URL=https://api.mistral.ai/v1/chat/completions
SUPABASE_URL=https://ukfbueqhnxehifisidan.supabase.co
SUPABASE_ANON_KEY=eyJ...   # key pública (también va en frontend/js/config.js)
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # solo para el seed (¡nunca al frontend!)
```

### Patrón de componentes (Vanilla JS)
```js
// Cada componente es una función pura que recibe datos y retorna HTML
function Card({ title, description, image, status }) {
  return `<div class="card">
    <img src="${image}" alt="${title}" />
    <h3>${title}</h3>
    <p>${description}</p>
    ${status === 'coming_soon' ? '<span class="badge">Próximamente</span>' : ''}
  </div>`
}

// Los componentes con estado usan closures
function ContactForm(container) {
  let state = { name: '', email: '', message: '', status: 'idle' }
  function render() { /* renderiza usando state */ }
  function handleSubmit(e) { /* actualiza state, llama API */ }
  return { render, destroy }
}
```

---

*Este roadmap es una guía viva. Cada fase se ajustará según el avance del curso
y las decisiones de diseño que surjan durante el desarrollo.*
