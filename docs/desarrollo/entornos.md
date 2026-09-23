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

## Secrets de Edge Functions (mecanismo Supabase, vigente sólo hasta P5)

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

## Cron jobs por entorno (mecanismo Supabase, vigente sólo hasta P5)

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

## Levantar con Docker

El compose de la raíz (`docker-compose.yml`) levanta la infraestructura local: `postgres` (16 + pgTAP), `minio` (S3 compatible) + `minio-init` (crea los buckets), `migrate` (aplica las migraciones de Prisma y termina), `app` (Next.js standalone), `cron` (jobs periódicos) y `caddy` (reverse proxy). Servicios, puertos, volúmenes y red están documentados en el propio `docker-compose.yml`.

Orden de arranque (por `depends_on`): `postgres` y `minio` healthy → `migrate` corre `npx prisma migrate deploy` y sale con `Exited (0)` → `app` arranca y pasa a `healthy` cuando `GET /login` responde `< 500` → `cron` y `caddy`. Si `migrate` falla, `app` no se levanta (`service_completed_successfully`). `postgres`, `minio`, `app`, `cron` y `caddy` tienen `restart: unless-stopped`.

`migrate` se construye con la stage `build` del `Dockerfile` (node_modules completo + `prisma.config.ts`): el CLI de Prisma 7 no puede correr desde el output standalone de Next, que sólo trae el runtime (`@prisma/client`, `@prisma/adapter-pg`, `pg`). La imagen de `app` no lleva el CLI de Prisma ni corre migraciones al arrancar.

### Setup inicial

```bash
cp .env.docker.example .env.docker
# completar POSTGRES_PASSWORD, S3_SECRET_KEY, JOBS_TOKEN y demás variables marcadas "cambiar"
bash scripts/dev-up.sh   # levanta postgres, minio y minio-init (crea los buckets)
```

`.env.docker` es local y está en `.gitignore` — nunca se versiona.

### Auth: todavía en Supabase

Este compose reemplaza la **base de datos** (Postgres vía Prisma) y el **storage** (MinIO, P3). **Auth sigue en Supabase** hasta que se complete la task P4. Mientras tanto `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` siguen apuntando al proyecto Supabase correspondiente.

### Storage (MinIO): variables

| Variable               | Para qué sirve                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `S3_ACCESS_KEY`        | Usuario de MinIO. Es también el `MINIO_ROOT_USER` del servicio `minio` y lo usa `minio-init` para crear los buckets.        |
| `S3_SECRET_KEY`        | Contraseña de MinIO (`MINIO_ROOT_PASSWORD`). Mínimo 8 caracteres.                                                            |
| `S3_REGION`            | Región que firma el SDK. MinIO la ignora, pero el SDK la exige. Default `us-east-1`.                                         |
| `S3_FORCE_PATH_STYLE`  | `true` (default): el bucket va en el path. MinIO no resuelve buckets por subdominio.                                         |
| `S3_ENDPOINT`          | Dónde está MinIO. **Sólo lo usa el servidor.** El servicio `app` lo fija a `http://minio:9000`; para `npm run dev` fuera de Docker, apuntarlo al puerto publicado (`MINIO_PORT`). |

**MinIO no se publica en internet ni se proxea por caddy**: el navegador nunca le habla. Todos
los archivos —imágenes embebidas y descargas— salen por `GET /api/files/<bucket>/<key>` de la
app, que resuelve a qué empresa (o perfil) pertenece el archivo, valida la sesión contra ese
dueño y hace stream desde MinIO. No hay URLs firmadas, así que no hay endpoint público que
publicar ni variables de host que mantener sincronizadas.

### Levantar la app completa

```bash
docker compose --env-file .env.docker build migrate app   # ~4 min la primera vez
docker compose --env-file .env.docker up -d app            # levanta postgres, minio, migrate y app
docker compose --env-file .env.docker ps                   # migrate Exited (0), app healthy
docker compose --env-file .env.docker logs migrate         # "No pending migrations" o las aplicadas
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:${APP_PORT:-3000}/login   # 200
```

`up -d cron caddy` los suma cuando `app` ya está healthy. Para volver a aplicar migraciones sin reiniciar la app: `docker compose --env-file .env.docker run --rm migrate` (mismo comando que corre al arrancar).

### Migrar, resetear y sembrar datos (desde el host)

```bash
set -a; source .env.docker; set +a   # POSTGRES_PASSWORD y POSTGRES_PORT (default 5432)
export DATABASE_URL=postgresql://alphataco:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT:-5432}/alphataco
npm run db:deploy   # prisma migrate deploy — aplica 0_init + migraciones pendientes
npm run db:seed     # seed idempotente de empresa/módulos/tabs/acciones/roles
npm run db:reset    # borra y recrea SOLO el contenedor y el volumen de postgres (no toca minio)
```

Flujo completo para crear o modificar una migración (diff → carpeta → SQL → deploy → verificación): `.claude/rules/migrations.md`.

### Variables obligatorias para el build de `app`

`docker compose build app` pasa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` como build args (Next.js las embebe en el bundle del cliente durante `next build`). Si quedan vacías, completar con los valores reales del Supabase local/dev, o con un placeholder (`http://localhost:54321` + una key ficticia) si el objetivo es solo validar que el build compila.

### Tests de base de datos (pgTAP)

`npm run test:db` levanta `postgres` (imagen propia con pgTAP), resetea la base `alphataco_test`, aplica migraciones + seed, y corre los tests `prisma/tests/*.sql` con `pg_prove` — nunca toca la base de trabajo `alphataco`.

### Puertos: resolver conflictos sin tocar el compose

El compose mapea los puertos de host vía variables de entorno con default (`POSTGRES_PORT`, `MINIO_PORT`, `MINIO_CONSOLE_PORT`, `APP_PORT`, `CADDY_HTTP_PORT`, `CADDY_HTTPS_PORT`). Si alguno está ocupado en tu máquina por otro proyecto, cambiar el valor en `.env.docker` — nunca hardcodear un puerto distinto en `docker-compose.yml`.

`.env.docker.example` trae los puertos default (`POSTGRES_PORT=5432`, `MINIO_PORT=9000`, `MINIO_CONSOLE_PORT=9001`, `APP_PORT=3000`, `CADDY_HTTP_PORT=80`, `CADDY_HTTPS_PORT=443`). Ejemplo de remapeo en un host donde 5432, 9000/9001 y 80 ya están tomados por otros proyectos:

| Servicio        | Puerto por default | Ejemplo de remapeo en `.env.docker` |
| ---------------- | ------------------- | ------------------------------------ |
| postgres          | 5432                 | `POSTGRES_PORT=55432`                |
| minio (API)       | 9000                 | `MINIO_PORT=29000`                   |
| minio (consola)   | 9001                 | `MINIO_CONSOLE_PORT=29001`           |
| caddy (HTTP)      | 80                   | `CADDY_HTTP_PORT=8080`               |

Todo lo que se conecta desde el host (`npm run db:deploy`, `npm run test:db`, `psql`, la consola de MinIO) lee el puerto de `.env.docker`; nunca asumir 5432/9000 hardcodeado.

### Servicios que corren solo con `postgres` + `minio`

Para desarrollar con `npm run dev` alcanza con `bash scripts/dev-up.sh` (postgres + minio + minio-init); `migrate`, `app`, `cron` y `caddy` sólo hacen falta para probar la imagen de producción. Para verificar que las imágenes de `cron` y `caddy` compilan sin levantar nada: `docker compose --env-file .env.docker build cron caddy`.

### Verificar los buckets de MinIO

`minio-init` recibe `S3_ACCESS_KEY`/`S3_SECRET_KEY` de `.env.docker` como variables de entorno, así que se pueden reutilizar dentro del contenedor:

```bash
docker compose --env-file .env.docker run --rm --entrypoint sh minio-init -c \
  'mc alias set local http://minio:9000 "$S3_ACCESS_KEY" "$S3_SECRET_KEY" >/dev/null && mc ls local/'
```

Debe listar los 10 buckets de `STORAGE_BUCKETS` (`src/shared/lib/storage-buckets.ts`): `document-files`,
`document-files-expired`, `contract-documents`, `daily-reports`, `logo`, `avatar`, `clothing-signatures`,
`repair-images`, `tire-discards`, `preparte-img`. Todos privados (`mc anonymous set none`): se leen por la
ruta `/api/files/...` de la app o por URL firmada.

### Ver los archivos de MinIO (consola web)

`http://localhost:${MINIO_CONSOLE_PORT:-9001}` — login con `S3_ACCESS_KEY`/`S3_SECRET_KEY` de `.env.docker`. Desde ahí se navegan los buckets y objetos igual que en el dashboard de Storage de Supabase.
