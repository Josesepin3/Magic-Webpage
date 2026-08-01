<div align="center">
  
  <img src="https://raw.githubusercontent.com/Josesepin3/Magic-Webpage/main/frontend/img/magic-logo-white.svg" alt="Magic" width="400" />

</div>

---

¡Bienvenido al repositorio oficial de la plataforma web de **Magic**!

Este proyecto comprende el desarrollo de la aplicación web oficial de nuestro ecosistema de vanguardia, enfocado en la privacidad radical y el procesamiento local. La plataforma está diseñada bajo una arquitectura Full-Stack utilizando JavaScript como lenguaje principal.

---

## 🚀 Información General del Emprendimiento

### 👤 Nombre del Negocio

**Magic**

### 🛑 El Problema que Resuelve

En la era digital actual, los usuarios viven en "una casa con paredes de vidrio". Las grandes corporaciones tecnológicas (*Big Tech*) vulneran la privacidad de los profesionales mediante el rastreo constante de datos, la sincronización forzada en nubes vulnerables y la obsolescencia programada de hardware cerrado y no reparable. La privacidad hoy en día se ha convertido en una ilusión costosa.

### 🎯 A Quién va Dirigido (Público Objetivo)

**Mercado Premium y Profesional Independiente:**
* Desarrolladores de software y programadores.
* Diseñadores UI/UX y creadores de contenido digital.
* Profesionales y entusiastas de la tecnología que exigen control absoluto de su propiedad intelectual y privacidad local sin sacrificar un entorno estético y elegante.

---

## 🛠️ Pilares y Productos Principales

Nuestra solución no es solo una aplicación; es un ecosistema cerrado de hardware y software diseñado para trabajar exclusivamente para el usuario:

1. **MagicOS:** Sistema operativo premium con interfaz minimalista e intuitiva, cuyo núcleo está diseñado para el procesamiento estrictamente local e impenetrable.

### _Proyectos futuros_

1. **Sirius Laptop:** Hardware modular diseñado bajo la filosofía de "bloques de Lego". Componentes fácilmente reparables y actualizables para combatir la obsolescencia programada.
2. **Chip N1 Kinetic™:** Arquitectura de silicio propia y optimizada para ejecutar tareas complejas de forma local, eficiente y veloz.
3. **BlackBox Cloud\*:** El puente seguro. Un servicio de almacenamiento en la nube tan intuitivo y transparente como Google Drive, pero blindado con cifrado de extremo a extremo propiedad exclusiva del usuario.

---

## 🌐 Sobre este Repositorio (`Magic-Webpage`)

La plataforma web de Magic, estructurada como una aplicación **Full-Stack** con JavaScript como lenguaje principal:

- **Producción:** sitio estático generado con `scripts/build-static.js` (prerender de las vistas EJS → `dist/`) y desplegado en **GitHub Pages**, con **Supabase** como backend de servicios (cuentas, carrito y panel de administración).
- **Desarrollo local:** servidor **Express** (`backend/app.js`) que sirve las vistas EJS y el frontend, con SQLite para datos locales.

### 📁 Estructura del Proyecto
```text
├── frontend/            # Interfaz de usuario
│   ├── img/             # Assets (logo, galaxia, productos)
│   ├── js/
│   │   ├── components/  # Módulos: NavAuth, HomeCinema, CartManager, ...
│   │   └── services/    # api.js, supabase.js
│   ├── vendor/          # Librerías locales (GSAP, ScrollTrigger, Lenis, Supabase)
│   └── style.css        # Diseño premium (tema oscuro, resplandores)
├── backend/             # App Express para desarrollo local
│   ├── views/           # Plantillas EJS (prerender en el build)
│   ├── routes/          # home, productos, contacto, cuenta, admin
│   ├── middleware/      # autenticación
│   ├── data/            # products.json (+ SQLite en dev)
│   └── app.js / seed.js
├── scripts/             # build-static.js, seed-supabase.js
├── supabase/            # schema.sql (backend de producción)
├── docs/                # ROADMAP.md y mockups del ecosistema
└── .github/workflows/   # Deploy automático a GitHub Pages
```

### 💻 Tecnologías

- **Front-End:** HTML5 semántico, CSS3 avanzado (gradientes oscuros, resplandores Kinetic™ y diseño premium responsivo) y JavaScript.
- **Animación:** GSAP + ScrollTrigger + Lenis para la homepage cinematográfica.
- **Vistas:** EJS, prerenderizadas a HTML estático en el build.
- **Back-End (dev):** Node.js + Express.
- **Back-End (prod):** Supabase (PostgreSQL + Auth).
- **Deploy:** GitHub Pages (Actions) y Netlify (config `netlify.toml`).

### 🚦 Desarrollo y Deploy

```bash
npm install        # dependencias
npm run dev        # Express en http://localhost:3000
npm run build      # prerender EJS → dist/
npm run seed       # datos de desarrollo (SQLite)
npm run seed:supabase   # seed del backend de Supabase
```

Al hacer push a `main`, el workflow de GitHub Actions genera el build y publica el sitio en `josesepin3.github.io/Magic-Webpage` (base path `/Magic-Webpage`).

---

<div align="center">
  
  _With ♥️ by PGTM_

</div>
