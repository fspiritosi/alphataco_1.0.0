import { runDocumentsExpiryJob } from '@/features/Jobs/jobs/documents-expiry';
import { createJobHandler } from '@/features/Jobs/lib/handler';

/**
 * Resumen semanal de vencimientos de documentos, una empresa por correo.
 *
 * NO convertir a Server Action: es una excepción legítima a la regla "Server Actions, no API
 * routes" del repo, como `/api/files` y `/api/taskapp/events`. Lo dispara el contenedor
 * `cron` del compose por HTTP (`docker/cron/crontab`, lunes 08:00 AR), y una Server Action no
 * es invocable con `curl` desde otro contenedor.
 *
 * Es `GET` porque el crontab llama con `curl` sin `-X POST` ni body, y esos paths están
 * congelados desde P1. Se expone también como `POST` para poder dispararlo a mano de la
 * forma semánticamente correcta; el handler es el mismo.
 *
 * La lógica vive en `features/Jobs/jobs/documents-expiry.ts` (`runDocumentsExpiryJob`), que
 * es testeable sin HTTP. Acá sólo va la autenticación por token y la traducción a HTTP.
 *
 * No lleva configuración de cache: con `cacheComponents` activado los route handlers ya son
 * dinámicos por defecto, y declarar `dynamic` es un error de compilación.
 */
const handler = createJobHandler('documents-expiry', () => runDocumentsExpiryJob());

export { handler as GET, handler as POST };
