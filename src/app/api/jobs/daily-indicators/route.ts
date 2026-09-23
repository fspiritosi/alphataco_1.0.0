import { runDailyIndicatorsJob } from '@/features/Jobs/jobs/daily-indicators';
import { createJobHandler } from '@/features/Jobs/lib/handler';

/**
 * Cierre de partes, vencimiento de prepartes y snapshot diario de indicadores por empresa.
 * No manda correos.
 *
 * NO convertir a Server Action: es una excepción legítima a la regla "Server Actions, no API
 * routes" del repo, como `/api/files` y `/api/taskapp/events`. Lo dispara el contenedor
 * `cron` del compose por HTTP (`docker/cron/crontab`, todos los días 00:30 AR).
 *
 * Es `GET` porque el crontab llama con `curl` sin `-X POST` ni body, y esos paths están
 * congelados desde P1. Se expone también como `POST` para dispararlo a mano.
 *
 * La lógica vive en `features/Jobs/jobs/daily-indicators.ts` (`runDailyIndicatorsJob`), que
 * es testeable sin HTTP.
 *
 * No lleva configuración de cache: con `cacheComponents` activado los route handlers ya son
 * dinámicos por defecto, y declarar `dynamic` es un error de compilación.
 */
const handler = createJobHandler('daily-indicators', () => runDailyIndicatorsJob());

export { handler as GET, handler as POST };
