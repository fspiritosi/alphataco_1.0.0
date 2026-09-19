# Variables de entorno y configuración por ambiente

## Variables de entorno

| Variable                       | Pública / Servidor | Para qué                                                                 |
| ------------------------------- | ------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Pública              | URL del proyecto Supabase.                                                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública              | Anon key de Supabase (pública por diseño, respeta RLS).                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | Servidor             | Bypassea RLS. Solo la usa `adminSupabaseServer()` (`src/lib/supabase/server.ts`). Nunca exponer como `NEXT_PUBLIC_*`. |
| `DATABASE_URL`                  | Servidor             | Connection string de Prisma (pooler).                                     |
| `DIRECT_URL`                    | Servidor             | Connection string directa de Prisma (migraciones).                        |
| `NEXT_PUBLIC_PROJECT_URL`       | Pública              | URL pública del proyecto/app.                                             |
| `NEXT_PUBLIC_BASE_URL`          | Pública              | Base URL usada en links/redirects del front.                              |
| `NEXT_PUBLIC_PREPARTE_BUCKET`   | Pública              | Nombre del bucket de Storage para preparte.                               |
| `NEXT_PUBLIC_SHOW_LOGS`         | Pública              | `'true'`/`'false'` — activa el logger custom (`src/lib/logger.ts`).       |
| `NEXT_PUBLIC_POSTHOG_KEY`       | Pública              | Project API key de PostHog (pública por diseño).                          |
| `NEXT_PUBLIC_POSTHOG_HOST`      | Pública              | Host de PostHog.                                                          |
| `SMTP_HOST`                     | Servidor             | Servidor SMTP para envío de emails (`sendEmail.ts`, `api/send/route.ts`). |
| `SMTP_PORT`                     | Servidor             | Puerto SMTP.                                                              |
| `SMTP_USER`                     | Servidor             | Usuario SMTP.                                                             |
| `SMTP_PASS`                     | Servidor             | Password SMTP.                                                            |
| `SMTP_SECURE`                   | Servidor             | `'true'`/`'false'` — TLS en la conexión SMTP.                             |
| `EMAIL_FROM_NAME`               | Servidor             | Nombre del remitente en `api/send/route.ts`.                              |
| `RESEND_SUPABASE_API_KEY`       | Servidor             | Reservada para envío de emails vía Resend (no usada actualmente en `src/`). |
| `TASKAPP_BASE_URL`              | Servidor             | Base URL del backend de tickets (Centro de Ayuda).                        |
| `TASKAPP_PROJECT_API_KEY`       | Servidor             | API key del proyecto en TaskApp.                                          |

Ninguna variable `NEXT_PUBLIC_*` contiene un secreto: la anon key de Supabase y la key de PostHog son públicas por diseño (respetan RLS / son claves de proyecto, no credenciales privilegiadas).

## Verificar que la anon key no es la service key

Antes de cargar el `.env` de un entorno, decodificar el JWT de `NEXT_PUBLIC_SUPABASE_ANON_KEY` y confirmar el claim `role`:

```bash
node -e "console.log(JSON.parse(Buffer.from(process.argv[1].split('.')[1],'base64').toString()).role)" "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

Esperado: `anon`. Si devuelve `service_role`, esa key es en realidad la service role key: **rotarla en Supabase inmediatamente** (Project Settings → API → Reset) y actualizar el `.env` con la nueva anon key en `NEXT_PUBLIC_SUPABASE_ANON_KEY` y la service key en `SUPABASE_SERVICE_ROLE_KEY`.

## Secrets de Edge Functions

Las edge functions `send-documents-expiry-email` y `send-deviations-email` (`supabase/functions/`) NO leen el `.env` de Next.js — usan `Deno.env.get(...)` con secrets configurados aparte en cada proyecto Supabase (`npx supabase secrets set NOMBRE=valor` o desde el dashboard).

Secrets requeridos:

| Secret                       | Función                        | Formato                                                        |
| ----------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| `DOCUMENTS_EXPIRY_RECIPIENTS` | `send-documents-expiry-email`   | Emails separados por coma. Se usa solo si el body no trae `to`/`emails`/`recipient_email`. |
| `DEVIATIONS_RECIPIENTS`       | `send-deviations-email`         | Emails separados por coma. Misma regla.                          |

Si el body no trae destinatarios y el secret correspondiente está vacío o sin configurar, la función responde `400 { "error": "missing recipients" }` en vez de enviar el email.

SMTP y otros secrets que ya usan ambas funciones (obtenidos con `grep -n "Deno.env.get" supabase/functions/*/index.ts`):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — cliente admin de Supabase dentro de la función.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` — envío del email vía `nodemailer`.
- `APP_URL` (solo `send-documents-expiry-email`) — URL usada en los links del email, default `https://gh-gestion.com`.

## Cron jobs por entorno

El job semanal de vencimientos de documentos (`weekly-documents-expiry-email`) NO se versiona con URL/anon key/destinatarios embebidos (la migración `20260512162500_schedule_documents_expiry_cron` que hacía eso pertenece a la BD de Grupo Horizonte y no se puede editar ni borrar; alphataco la neutraliza en runtime con `20260919140000_unschedule_documents_expiry_cron`).

Para cada entorno nuevo, crear el job a mano vía SQL (Supabase SQL editor o `psql`):

```sql
SELECT cron.schedule('weekly-documents-expiry-email', '0 11 * * 1', $$
  select net.http_post(
    url := '<SUPABASE_URL>/functions/v1/send-documents-expiry-email',
    headers := '{"Authorization":"Bearer <ANON_KEY>","Content-Type":"application/json"}'::jsonb,
    body := '{"days_ahead":7,"detail_limit":20}',
    timeout_milliseconds := 5000
  );
$$);
```

El body **no lleva `to`**: los destinatarios salen del secret `DOCUMENTS_EXPIRY_RECIPIENTS` de la edge function (ver sección anterior). Reemplazar `<SUPABASE_URL>` y `<ANON_KEY>` por los del proyecto Supabase de ese entorno.

Para cancelar el job: `SELECT cron.unschedule('weekly-documents-expiry-email');`
