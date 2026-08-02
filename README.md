# Auralis - Turnos y Consultorio

**Producción:** https://turnos.valentorassa.com

Agenda digital **personal** para consultorio psicológico y pericias.  
Pensada para reemplazar la agenda en papel: turnos visuales, tareas del día, fichas de pacientes, pagos livianos, recordatorios y agenda del psiquiatra.

**No** es un sistema de reserva online: solo vos asignás los turnos.

## Stack

- **Next.js 16** + TypeScript + Tailwind
- **Convex** (base de datos reactiva, auth, crons, sync en tiempo real)
- UI en **español (Argentina)**
- PWA liviana (instalable en celular / iPad)

## Funciones

| Área | Qué incluye |
|------|-------------|
| **Hoy** | Turnos del día, próximo turno resaltado, tareas, avisos |
| **Agenda** | Vista día / semana / mes, alta rápida, edición, colores por tipo |
| **Tipos** | Consultorio, pericias (consultorio / Rosario / Rafaela), otros, psiquiatría |
| **Tareas** | Checklist del día junto a la agenda |
| **Pacientes** | Ficha admin, búsqueda, WhatsApp, historial, alertas de cancelación/deuda |
| **Pagos** | Por turno: pagó / no pagó / debe / forma / nota |
| **Psiquiatra** | Genera el 3.er viernes de cada mes desde las 15:00 |
| **Recordatorios** | Internos + botón WhatsApp con mensaje listo |
| **Auth** | Email y contraseña (datos privados por usuario) |

## Requisitos

- Node.js 20+
- Bun 1.3+
- Cuenta en [Convex](https://www.convex.dev) (plan free alcanza para empezar)

## Setup local

```bash
git clone https://github.com/ValentinTorassa/Auralis-Turnos-Consultorio.git
cd Auralis-Turnos-Consultorio
bun install
```

### 1. Crear proyecto Convex + auth

En una terminal:

```bash
bunx convex dev
```

- Iniciá sesión en Convex
- Creá un proyecto Convex para Auralis
- Esto escribe `.env.local` con `NEXT_PUBLIC_CONVEX_URL`

En **otra** terminal (misma carpeta), configurá auth:

```bash
bunx @convex-dev/auth
```

Seguí las instrucciones (genera las claves JWT en el dashboard de Convex).

### 2. Arrancar la app

Con `bunx convex dev` sigue corriendo:

```bash
bun run dev
```

Abrí [http://localhost:3000](http://localhost:3000)

1. **Crear cuenta** (email + contraseña)
2. La app siembra sola los tipos de turno y la configuración
3. Empezá a cargar pacientes y turnos

## Deploy (producción)

### Frontend → Vercel

1. Importá el repo en [Vercel](https://vercel.com)
2. Variables de entorno:
   - `NEXT_PUBLIC_CONVEX_URL` = URL de producción de Convex
3. Deploy

### Backend → Convex

```bash
bunx convex deploy
```

En el dashboard de Convex (producción):

- Completá las variables de **@convex-dev/auth** (JWT)
- `SITE_URL` = dominio público (actual: `https://turnos.valentorassa.com`)

### Dominio propio (Cloudflare)

El dominio `turnos.valentorassa.com` es un CNAME a `cname.vercel-dns.com`
(zona `valentorassa.com` en Cloudflare, DNS-only) y está agregado como
custom domain del proyecto en Vercel.

## Uso diario sugerido

1. Abrís **Hoy** → ves pacientes, próximo horario y tareas
2. Marcás tareas hechas
3. Si hay avisos, tocás WhatsApp y después **Hecho**
4. En **Agenda** cargás turnos a futuro (tocá un hueco libre)
5. En **Psiquiatra** → “Generar próximos 6 meses” la primera vez
6. Cuando llama un paciente → **Pacientes** y buscás por apellido

## Costos aproximados

| Servicio | Plan típico | Costo |
|----------|-------------|-------|
| Convex | Free → Professional | $0 – $25/mes |
| Vercel | Hobby | $0 |
| **Total arranque** | | **~$0/mes** |

## Estructura

```
src/app/             # Aplicación web Next.js
src/components/      # UI web
convex/              # Backend Convex
```

## Privacidad

- Cada usuaria solo ve sus datos (filtrado por `userId` en el backend)
- No hay historia clínica: solo ficha administrativa y agenda
- No se envían SMS/WhatsApp automáticos: solo enlaces `wa.me` que abrís vos

## Licencia

Uso personal / MIT para el código de este repositorio.
