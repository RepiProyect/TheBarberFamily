# BARBER THE FAMILY · App de reservas

Web app (PWA) para gestionar clientes, reservas de turnos online y recordatorios por WhatsApp.

- **Frontend:** Vite + React + TypeScript + Tailwind CSS v4
- **Backend:** Supabase (Postgres, Auth, Edge Functions)
- **Proyecto Supabase:** `poujgtdtshuhlhgazsbd`

---

## Cómo correr el proyecto

```bash
npm install
npm run dev
```

Abre http://localhost:5173

> Nota de Windows: como la ruta del proyecto contiene `&`, los scripts usan `node`
> directamente sobre los binarios (ver `package.json`). `npm run dev` / `npm run build`
> funcionan normal; evita usar `npx`.

Otros comandos:

```bash
npm run build       # build de producción (en /dist)
npm run preview     # sirve el build
npm run typecheck   # revisa tipos
```

---

## Configuración inicial (una sola vez)

### Paso 1 · Clave pública de Supabase

1. Entra a **Project Settings → API**:
   https://supabase.com/dashboard/project/poujgtdtshuhlhgazsbd/settings/api
2. Copia la clave **anon / publishable** (empieza por `eyJ...` o `sb_publishable_...`).
3. Pégala en el archivo **`.env`** en la variable `VITE_SUPABASE_ANON_KEY`:

   ```
   VITE_SUPABASE_URL=https://poujgtdtshuhlhgazsbd.supabase.co
   VITE_SUPABASE_ANON_KEY=  <-- aquí
   VITE_WHATSAPP_PHONE=573001234567
   ```

4. Reinicia `npm run dev`.

### Paso 2 · Crear la base de datos

1. Abre el **SQL Editor**:
   https://supabase.com/dashboard/project/poujgtdtshuhlhgazsbd/sql/new
2. Abre el archivo [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
   copia **todo** su contenido y pégalo en el editor.
3. Pulsa **Run**. Debe terminar sin errores.

Esto crea las tablas (config, servicios, clientes, horarios, bloqueos, turnos,
mensajes_wpp), la seguridad (RLS), las funciones de reserva y los datos iniciales
(servicios y horario de ejemplo).

> El script es idempotente: se puede volver a ejecutar sin duplicar datos.

### Paso 3 · Crear el usuario del panel

El panel del dueño (`/panel`) se entra con correo y contraseña. Crea el usuario en:

1. **Authentication → Users**:
   https://supabase.com/dashboard/project/poujgtdtshuhlhgazsbd/auth/users
2. **Add user → Create new user**, con tu correo y una contraseña.
   (Marca "Auto Confirm User" para no requerir verificación por email.)

Con eso ya puedes entrar en `/panel` desde el pie de la web ("Acceso equipo").

---

## Estructura

```
src/
  components/      Componentes de UI (Logo, ...)
  lib/
    supabase.ts    Cliente de Supabase
    db.ts          Capa de datos (consultas y RPC)
  types.ts         Tipos del dominio
  App.tsx          Página principal (pública)
supabase/
  migrations/      Esquema SQL
```

---

## Estado del desarrollo

- [x] **Fase 1** — Base del proyecto + identidad visual
- [x] **Fase 2** — Esquema de base de datos
- [x] **Fase 3** — Reserva del cliente (calendario + flujo de agendar)
- [x] **Fase 4** — Panel del dueño (login, calendario, gestión)
- [ ] **Fase 5** — WhatsApp (confirmaciones y recordatorios automáticos)
- [ ] **Fase 6** — PWA instalable + despliegue
