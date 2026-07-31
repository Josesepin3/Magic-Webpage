# MagicOS-Webpage — Roadmap del Proyecto

> **Contexto:** Página web oficial de MagicOS, desarrollada como proyecto de curso.
> Progresión: HTML → CSS → Backend con JS.
>
> Este documento es la guía viva del proyecto. Los detalles cambiarán sobre la
> marcha, pero la estructura y visión general se mantienen aquí.

> **Estado (31 jul 2026):** Backend fundado, catálogo y configurador funcionando,
> rebranding a **Magic** (rutas `/productos`), navbar liquid-glass, página de
> Sirius rediseñada según maqueta (hero, badges N1/BlackBox, sección "Diseño
> Modular", tarjetas con hover/tint), responsive móvil ajustado y **deploy en
> Netlify funcionando** (estático con `dist/`, sin dependencia de módulos nativos
> en el build). Fase 2 completa (incluye reveal on scroll). Siguiente:
> Fase 3 (contacto) — falta `ContactForm.js`, estados y CSS Apple.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Vanilla JS + EJS (SSR con Express local / prerender estático en build) |
| **Backend** | Node.js + Express |
| **Base de Datos** | SQLite (`better-sqlite3`) — solo dev local |
| **Autenticación** | JWT + bcrypt (pendiente; plan: Supabase + Netlify Functions) |
| **IA** | Mistral API (modelo open-source gratuito) |
| **CSS** | Vanilla (sin frameworks) |
| **JS Frontend** | Modular, componentes funcionales puros |
| **Deploy** | Netlify (estático, `dist/` + Netlify Forms) |

---

## Estructura del Proyecto (Actual)

```
MagicOS-Webpage/
├── frontend/
│   ├── style.css                # Estilos globales (incluye liquid-glass navbar + reveal on scroll)
│   ├── img/                     # Imágenes y SVGs (hero Sirius, módulos, badges, logo blanco)
│   └── js/                      # JS modular del lado cliente
│       ├── components/
│       │   ├── ProductConfigurator.js  # Configurador tipo Apple
│       │   └── RevealOnScroll.js       # Reveal al scrollear (IntersectionObserver)
│       └── services/
│           └── api.js           # Fetch wrapper centralizado
├── backend/
│   ├── app.js                   # Entry point de Express (dev local)
│   ├── config/
│   │   └── db.js                # Inicialización SQLite + schemas
│   ├── routes/
│   │   ├── home.js              # GET /
│   │   ├── products.js          # GET /productos, /productos/:slug, /productos/:slug/configure
│   │   └── contact.js           # GET /contacto
│   ├── views/
│   │   ├── partials/            # header.ejs, footer.ejs, n1-badge.ejs, blackbox-badge.ejs
│   │   └── pages/
│   │       ├── home.ejs                  # Vacía — pendiente rediseño del ecosistema (landing en /productos/magicos)
│   │       ├── productos.ejs          # Grid de productos
│   │       ├── product-*.ejs          # Página por producto (magicos, sirius-laptop, chip-n1-kinetic, blackbox-cloud)
│   │       ├── configure.ejs          # Configurador con opciones
│   │       ├── contact.ejs            # Formulario de contacto (Netlify Forms)
│   │       └── 404.ejs
│   ├── data/
│   │   ├── magicos.db           # SQLite file (ignorado en git)
│   │   └── products.json        # Datos de productos para el build estático (commiteado)
│   └── seed.js                  # Poblar BD local + generar products.json
├── scripts/
│   └── build-static.js          # Prerender EJS → dist/ (build de Netlify)
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
| GET | `/contacto` | `contact.ejs` | Formulario de contacto (**Netlify Forms**) | ✅ |
| GET | `/admin/login` | `login.ejs` | Login para admin | ⏳ Pendiente |
| GET | `/admin/dashboard` | `dashboard.ejs` | Panel de administración | ⏳ Pendiente |

### API REST (JSON)

> **Nota:** en el deploy de Netlify la web es estática; los endpoints REST de
> Express solo aplican al dev local. El formulario de contacto ya se persiste vía
> **Netlify Forms**. Auth/admin se replanteará con **Supabase + Netlify Functions**.

| Método | Ruta | Protegida | Descripción | Estado |
|--------|------|-----------|-------------|--------|
| POST | `/api/contact` | No | Enviar mensaje de contacto | ✅ reemplazado por Netlify Forms |
| POST | `/api/auth/login` | No | Autenticar admin, devuelve JWT | ⏳ (plan: Supabase) |
| GET | `/api/admin/messages` | Sí | Listar mensajes recibidos | ⏳ |
| POST | `/api/admin/products` | Sí | Crear producto | ⏳ |
| PUT | `/api/admin/products/:id` | Sí | Editar producto | ⏳ |
| DELETE | `/api/admin/products/:id` | Sí | Eliminar producto | ⏳ |
| POST | `/api/ai/chat` | No | Chat con IA vía Mistral | ⏳ |
| GET | `/api/products/:slug` | No | Datos de producto + opciones | ⏳ (datos servidos por SSR/prerender) |

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

> **Cambio de enfoque:** la persistencia se resuelve con **Netlify Forms** en el
> deploy estático (en vez de `POST /api/contact` + SQLite). El envío funciona en
> producción; quedan pendientes la validación frontend y los estados.

- [x] Ruta `GET /contacto` — página con formulario (estructura básica)
- [x] Persistencia de envíos — Netlify Forms (`name="contact"` + `data-netlify`)
- [ ] Componente JS `ContactForm.js` — validación frontend en tiempo real
- [ ] Estados: loading (spinner en botón), éxito (mensaje verde), error (alerta)
- [ ] CSS para el formulario: estilo Apple (inputs sin bordes, focus sutiles)

### Fase 4 — Admin Panel

**Objetivo:** Login + dashboard protegido.

- [ ] Ruta `GET /admin/login` — página de login
- [ ] Componente JS `LoginForm.js` — validación + llamada a API
- [ ] Ruta `POST /api/auth/login` — verificar credenciales, devolver JWT
- [ ] Middleware `backend/middleware/auth.js` — verificar JWT en rutas protegidas
- [ ] Ruta `GET /admin/dashboard` — panel protegido con:
  - Lista de mensajes de contacto (leer/no leídos)
  - CRUD de productos (nombre, precio, imágenes, opciones)
  - Logout
- [ ] Ruta `POST /api/admin/products`
- [ ] Rutas `PUT/DELETE /api/admin/products/:id`

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
- [~] Animaciones CSS: hover en cards ✅, scroll reveal pendiente
- [ ] Validación en tiempo real en formularios
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
npm run dev           # Servidor Express local (nodemon, http://localhost:3000)
npm run build         # Prerender estático EJS → dist/ (sin SQLite ni módulos nativos)
```

### Deploy (Netlify)
- Auto-deploy desde la rama `main` en cada push (también disponible la `dev`).
- `netlify.toml`: `command = "npm run build"`, `publish = "dist"`, `NODE_VERSION = 20`.
- **Importante:** el build NO usa `npm run seed` (mejor-sqlite3/bcrypt causan segfault
  en el entorno de Netlify). Los datos vienen de `backend/data/products.json` (commiteado).
- Formularios: Netlify Forms (`name="contact"` + `data-netlify="true"`).
- Sitio: `magic-os.netlify.app`

### Variables de entorno (`.env`)
```
PORT=3000
JWT_SECRET=...
MISTRAL_API_KEY=...
MISTRAL_API_URL=https://api.mistral.ai/v1/chat/completions
# Futuro (auth en Netlify): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
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
