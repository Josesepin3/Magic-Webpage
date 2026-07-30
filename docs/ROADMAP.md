# MagicOS-Webpage — Roadmap del Proyecto

> **Contexto:** Página web oficial de MagicOS, desarrollada como proyecto de curso.
> Progresión: HTML → CSS → Backend con JS.
>
> Este documento es la guía viva del proyecto. Los detalles cambiarán sobre la
> marcha, pero la estructura y visión general se mantienen aquí.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Vanilla JS + EJS (SSR con Express) |
| **Backend** | Node.js + Express |
| **Base de Datos** | SQLite (`better-sqlite3`) |
| **Autenticación** | JWT + bcrypt |
| **IA** | Mistral API (modelo open-source gratuito) |
| **CSS** | Vanilla (sin frameworks) |
| **JS Frontend** | Modular, componentes funcionales puros |

---

## Estructura del Proyecto (Objetivo Final)

```
MagicOS-Webpage/
├── frontend/
│   ├── index.html              # Home (estático inicial)
│   ├── style.css                # Estilos globales
│   ├── img/                     # Imágenes y SVGs
│   └── js/                      # JS modular del lado cliente
│       ├── components/
│       │   ├── Card.js          # Card de producto reutilizable
│       │   ├── Header.js        # Navbar dinámico
│       │   ├── ChatWidget.js    # Widget de IA flotante
│       │   ├── ContactForm.js   # Formulario con validación
│       │   └── ProductConfigurator.js  # Configurador tipo Apple
│       ├── services/
│       │   ├── api.js           # Fetch wrapper centralizado
│       │   └── ai.js            # Cliente para Mistral API
│       └── utils/
│           ├── validators.js    # Validaciones frontend
│           └── states.js        # Helpers loading/error/empty
├── backend/
│   ├── app.js                   # Entry point de Express
│   ├── config/
│   │   └── db.js                # Inicialización SQLite + schemas
│   ├── routes/
│   │   ├── home.js              # GET /
│   │   ├── catalog.js           # GET /catalogo, /catalogo/:slug, /catalogo/:slug/configure
│   │   ├── contact.js           # GET /contacto, POST /api/contact
│   │   ├── auth.js              # POST /api/auth/login
│   │   ├── admin.js             # CRUD /api/admin/*
│   │   └── ai.js                # POST /api/ai/chat
│   ├── controllers/
│   ├── models/
│   ├── middleware/
│   │   └── auth.js              # JWT verification
│   ├── views/
│   │   ├── partials/            # header.ejs, footer.ejs, nav.ejs
│   │   ├── pages/
│   │   │   ├── home.ejs
│   │   │   ├── catalog.ejs          # Grid de productos
│   │   │   ├── product.ejs          # Página individual estilo Apple
│   │   │   ├── configure.ejs        # Configurador con opciones
│   │   │   ├── contact.ejs          # Formulario de contacto
│   │   │   └── admin/
│   │   │       ├── login.ejs
│   │   │       └── dashboard.ejs
│   │   └── layouts/
│   ├── data/
│   │   └── magicos.db           # SQLite file
│   └── seed.js                  # Poblar BD con datos iniciales
├── docs/
│   └── ROADMAP.md               # Este archivo
├── package.json
└── .gitignore
```

---

## Tabla de Rutas (API y Páginas)

### Páginas (Server-rendered con EJS)

| Método | Ruta | Vista | Descripción |
|--------|------|-------|-------------|
| GET | `/` | `home.ejs` | Landing page (hero + features + CTA) |
| GET | `/catalogo` | `catalog.ejs` | Grid de todos los productos |
| GET | `/catalogo/:slug` | `product.ejs` | Página individual estilo Apple |
| GET | `/catalogo/:slug/configure` | `configure.ejs` | Configurador de producto |
| GET | `/contacto` | `contact.ejs` | Formulario de contacto |
| GET | `/admin/login` | `login.ejs` | Login para admin |
| GET | `/admin/dashboard` | `dashboard.ejs` | Panel de administración |

### API REST (JSON)

| Método | Ruta | Protegida | Descripción |
|--------|------|-----------|-------------|
| POST | `/api/contact` | No | Enviar mensaje de contacto |
| POST | `/api/auth/login` | No | Autenticar admin, devuelve JWT |
| GET | `/api/admin/messages` | Sí | Listar mensajes recibidos |
| POST | `/api/admin/products` | Sí | Crear producto |
| PUT | `/api/admin/products/:id` | Sí | Editar producto |
| DELETE | `/api/admin/products/:id` | Sí | Eliminar producto |
| POST | `/api/ai/chat` | No | Chat con IA vía Mistral |
| GET | `/api/products/:slug` | No | Datos de producto + opciones |

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

### `/catalogo` — Grid de productos

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

### `/catalogo/:slug` — Página de producto (estilo Apple)

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

### `/catalogo/:slug/configure` — Configurador

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
│  ○ N1 Pro (+40% veloz)     │ selección     │ │
│  ○ N1 Max (2x rendim.)     │               │ │
│                            │ N1 Pro        │ │
│  Memoria RAM               │ 32GB RAM      │ │
│  ○ 8GB                      │ 512GB SSD     │ │
│  ◉ 16GB  (+$200)           │               │ │
│  ○ 32GB  (+$400)           │ Total:        │ │
│  ○ 64GB  (+$800)           │ $2,499        │ │
│                            │               │ │
│  Almacenamiento            │ [Añadir al    │ │
│  ◉ 256GB SSD               │  carrito]     │ │
│  ○ 512GB SSD  (+$200)      │               │ │
│  ○ 1TB SSD    (+$400)     └───────────────┘ │
│  ○ 2TB SSD    (+$800)                        │
│                                              │
│  Pantalla                                     │
│  ◉ 13" Liquid Retina                         │
│  ○ 15" Liquid Retina XDR                     │
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

- [ ] `npm init` + instalar express, better-sqlite3, ejs, bcrypt, jsonwebtoken, dotenv
- [ ] Crear `backend/app.js` con Express configurado
- [ ] `backend/config/db.js`: inicializar SQLite, crear tablas
- [ ] `backend/seed.js`: poblar BD con productos MagicOS + admin por defecto
- [ ] Migrar landing actual (HTML estático) a `views/pages/home.ejs`
- [ ] Crear `views/partials/header.ejs` y `footer.ejs`
- [ ] Rutas básicas: home, catálogo, contacto (vistas vacías con layout)

### Fase 2 — Catálogo de Productos

**Objetivo:** Páginas de producto con estilo Apple.

- [ ] Ruta `GET /catalogo` — grid de productos desde BD
- [ ] Ruta `GET /catalogo/:slug` — página individual con secciones narrativas
- [ ] Ruta `GET /catalogo/:slug/configure` — configurador con opciones desde BD
- [ ] Componente JS `ProductConfigurator.js` — cálculo dinámico de precio
- [ ] CSS para diseño Apple: hero full-screen, sticky nav, secciones con scroll
- [ ] Animaciones: reveal al scrollear con IntersectionObserver

### Fase 3 — Formulario de Contacto

**Objetivo:** Formulario funcional con validación y persistencia.

- [ ] Ruta `GET /contacto` — página con formulario
- [ ] Componente JS `ContactForm.js` — validación frontend en tiempo real
- [ ] Ruta `POST /api/contact` — validación backend + guardar en SQLite
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
- [ ] Animaciones CSS: hover en cards, transiciones de página, scroll reveal
- [ ] Validación en tiempo real en formularios
- [ ] Responsive real probado en mobile/tablet/desktop
- [ ] `.gitignore` (node_modules, .env, *.db)
- [ ] Comentarios técnicos en código clave
- [ ] Documentación de cómo ejecutar el proyecto

---

## Productos del Ecosistema MagicOS

| Producto | Categoría | Estado | Slugs |
|----------|-----------|--------|-------|
| **MagicOS** | Sistema Operativo | ✔ Disponible | `magicos` |
| **Sirius Laptop** | Hardware | ⏳ En desarrollo | `sirius-laptop` |
| **Chip N1 Kinetic** | Silicon | ⏳ En desarrollo | `chip-n1-kinetic` |
| **BlackBox Cloud** | Cloud | ⏳ En desarrollo | `blackbox-cloud` |

### Opciones configurables por producto (futuro)

**Sirius Laptop:**
- Procesador: N1 Kinetic (base), N1 Pro, N1 Max
- RAM: 8GB, 16GB, 32GB, 64GB
- Almacenamiento: 256GB, 512GB, 1TB, 2TB SSD
- Pantalla: 13" Liquid Retina, 15" Liquid Retina XDR
- Color: Obsidian Black, Starlight Silver, Midnight Blue

**BlackBox Cloud:**
- Plan: Personal (1TB), Professional (5TB), Enterprise (50TB)
- Cifrado: Estándar, AES-256 + Zero-Knowledge

---

## Notas Técnicas

### Ejecución del proyecto
```bash
npm install
node backend/seed.js     # Poblar BD (primera vez)
node backend/app.js      # Iniciar servidor
```

### Variables de entorno (`.env`)
```
PORT=3000
JWT_SECRET=...
MISTRAL_API_KEY=...
MISTRAL_API_URL=https://api.mistral.ai/v1/chat/completions
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
