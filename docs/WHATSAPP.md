# Fase 5 · WhatsApp automático (Meta Cloud API)

Mensajes automáticos de **confirmación** (al reservar) y **recordatorio** (antes del turno),
enviados por la API oficial de WhatsApp (Meta), sin abrir WhatsApp manualmente.

El código ya está en el repo:
- Edge Function: `supabase/functions/whatsapp/index.ts`
- Migración: `supabase/migrations/0002_whatsapp.sql`
- La app llama a la confirmación automáticamente al crear un turno.

Faltan 4 pasos (los haces una vez). **El Paso 1 es el más lento (aprobación de Meta), empiézalo ya.**

---

## Paso 1 · Credenciales y plantillas en Meta

1. Crea una cuenta en **Meta for Developers**: https://developers.facebook.com → "Mis apps" → **Crear app** → tipo **Business**.
2. Agrega el producto **WhatsApp** a la app.
3. En **WhatsApp > Configuración de la API** obtendrás:
   - Un **número de teléfono** de WhatsApp Business (puedes usar el de pruebas para empezar, o registrar el tuyo).
   - El **Identificador del número de teléfono** (Phone number ID) → lo llamaremos `WHATSAPP_PHONE_ID`.
4. Genera un **token permanente**:
   - En **Configuración de la empresa > Usuarios > Usuarios del sistema**, crea un usuario del sistema, asígnale la app de WhatsApp y **genera un token** con permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
   - Ese token → `WHATSAPP_TOKEN`.
5. Crea **2 plantillas** en **WhatsApp > Plantillas de mensajes** (categoría **Utility/Utilidad**, idioma **Español**) y envíalas a aprobación:

   **Plantilla 1 — nombre exacto: `confirmacion_turno`**
   ```
   Hola {{1}} 👋 Tu turno en BARBER THE FAMILY quedó confirmado: {{2}} el {{3}}. ¡Te esperamos! 💈
   ```

   **Plantilla 2 — nombre exacto: `recordatorio_turno`**
   ```
   Hola {{1}} ⏰ Te recordamos tu turno en BARBER THE FAMILY: {{2}} el {{3}}. ¡Nos vemos pronto! 💈
   ```

   > `{{1}}` = nombre del cliente · `{{2}}` = servicio · `{{3}}` = fecha y hora.
   > La aprobación de Meta suele tardar de minutos a 1–2 días.

---

## Paso 2 · Crear la base para recordatorios

En el **SQL Editor** de Supabase, corre el contenido de
`supabase/migrations/0002_whatsapp.sql` (añade la marca `recordatorio_enviado`).

---

## Paso 3 · Desplegar la Edge Function y sus secrets

**Opción A — desde el Dashboard (sin instalar nada):**
1. Supabase → **Edge Functions** → **Deploy a new function** → nombre exacto: **`whatsapp`**.
2. Pega el contenido de `supabase/functions/whatsapp/index.ts` y despliega.
3. En **Edge Functions → Secrets** (o Project Settings → Edge Functions), agrega:
   - `WHATSAPP_TOKEN` = (tu token permanente)
   - `WHATSAPP_PHONE_ID` = (tu Phone number ID)
   - `WHATSAPP_TPL_LANG` = `es`
   - `RECORDATORIO_HORAS` = `3`  (horas antes del turno para recordar)
   - `CRON_SECRET` = (inventa una clave larga, p. ej. 32 caracteres)

**Opción B — con Supabase CLI** (si la instalas):
```bash
supabase login
supabase link --project-ref poujgtdtshuhlhgazsbd
supabase functions deploy whatsapp
supabase secrets set WHATSAPP_TOKEN=... WHATSAPP_PHONE_ID=... WHATSAPP_TPL_LANG=es RECORDATORIO_HORAS=3 CRON_SECRET=...
```

Con esto, las **confirmaciones** ya se envían solas al reservar. 🎉

---

## Paso 4 · Programar los recordatorios (cron)

Para que los recordatorios se envíen solos, algo debe "llamar" a la función cada cierto tiempo.
La forma más simple (gratis) es un cron externo:

1. Crea una cuenta en **https://cron-job.org** (gratis).
2. Nuevo cronjob con estos datos:
   - **URL:** `https://poujgtdtshuhlhgazsbd.supabase.co/functions/v1/whatsapp`
   - **Método:** POST
   - **Intervalo:** cada 30 minutos
   - **Cabeceras (headers):**
     - `Content-Type: application/json`
     - `apikey: <tu clave anon publishable>`
     - `Authorization: Bearer <tu clave anon publishable>`
     - `x-cron-secret: <el CRON_SECRET del Paso 3>`
   - **Body:** `{"action":"recordatorios"}`

La función buscará los turnos que empiezan dentro de las próximas `RECORDATORIO_HORAS` y enviará
el recordatorio una sola vez por turno.

---

## Probar

- **Confirmación:** haz una reserva de prueba con tu propio número → debe llegarte el WhatsApp.
- **Recordatorio:** crea un turno que empiece dentro de ~1 hora y dispara el cron (o espera) →
  debe llegar el recordatorio.
- Todos los envíos quedan registrados en la tabla `mensajes_wpp` (puedes verlos en el dashboard).

> Nota: Meta solo permite enviar mensajes de plantilla aprobada a números que hayan aceptado recibir
> mensajes de tu negocio; en pruebas, agrega tu número a la lista de destinatarios de prueba de la app.
