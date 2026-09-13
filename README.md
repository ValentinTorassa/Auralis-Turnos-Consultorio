# Auralis - Turnos y Consultorio

**Producción:** https://turnos.yaninacolombero.com (también responde https://turnos.valentorassa.com)

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
| **Informes** | Las pericias llevan plazo de presentación aparte del turno; Hoy lista lo que falta entregar |
| **Tareas** | Checklist del día junto a la agenda |
| **Pacientes** | Ficha admin, búsqueda, WhatsApp, historial, alertas de cancelación/deuda |
| **Pagos** | Por turno: pagó / no pagó / debe / forma / nota |
| **Psiquiatra** | Genera el 3.er viernes de cada mes desde las 15:00 |
| **Recordatorios** | Internos + push al celular + botón WhatsApp con mensaje listo |
| **Caja** | Cobrado, adeudado y por cobrar del mes, cortes por tipo y forma de pago, y quién debe |
| **Copias** | Automática semanal en Convex + export cifrado manual |
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
- `SITE_URL` = dominio público (actual: `https://turnos.yaninacolombero.com`)

### Notificaciones push (avisos en el celular)

Sin estas claves los avisos siguen funcionando dentro de la app, pero no salen
como notificación. El cron detecta que faltan y no hace nada, sin romper.

Ya están configuradas en producción. Para rotarlas o levantar otro entorno,
generá un par nuevo:

```bash
bunx web-push generate-vapid-keys
```

En Convex (producción):

```bash
bunx convex env set VAPID_PUBLIC_KEY  "<clave pública>"
bunx convex env set VAPID_PRIVATE_KEY "<clave privada>"
bunx convex env set VAPID_SUBJECT     "mailto:tu@email.com"
```

En Vercel, la misma clave **pública** (la privada no va acá nunca):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY = <clave pública>
```

Después, cada dispositivo se activa por separado desde **Ajustes → Avisos en el
celular**. En iPhone hay que instalar la app primero (Compartir → Agregar a
inicio): Safari no permite push en pestañas comunes.

### Dominios propios

El proyecto tiene varios dominios apuntados al mismo deploy de Vercel:

| Dominio | Zona DNS | Registro |
|---|---|---|
| `turnos.yaninacolombero.com` | DonWeb (`ns1/ns2.donweb.com`) | `A` → `216.198.79.1` |
| `app.yaninacolombero.com` | DonWeb | `A` → `216.198.79.1` |
| `agenda.yaninacolombero.com` | DonWeb | `A` → `216.198.79.1` |
| `turnos.valentorassa.com` | Cloudflare (DNS-only) | `CNAME` → `cname.vercel-dns.com` |

Los tres apuntan al mismo deploy a propósito: `turnos` es el que se comparte,
y `app` / `agenda` quedan como alias por si alguno se recuerda distinto.

**Al agregar un subdominio, primero el registro DNS y después el dominio en
Vercel.** Al revés, Vercel consulta el nombre cuando todavía no existe y el
`SOA minimum 86400` de DonWeb le deja cacheado "no existe" por 24 horas: el
certificado no se emite y no hay forma de destrabarlo desde la API.

Los dos hostnames sirven el mismo deploy, así que el login (password-only,
sin OAuth ni magic links) funciona en ambos. `SITE_URL` en el dashboard de
Convex conviene igual mantenerlo apuntando al dominio principal: lo usa
**@convex-dev/auth** para armar URLs absolutas si en el futuro se suma un
proveedor con redirect.

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
