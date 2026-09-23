import { runDailyReportDeviationsJob } from '@/features/Jobs/jobs/daily-report-deviations';
import { createJobHandler } from '@/features/Jobs/lib/handler';

/**
 * Desvíos del parte diario del día, una empresa por correo.
 *
 * NO convertir a Server Action: es una excepción legítima a la regla "Server Actions, no API
 * routes" del repo, como `/api/files` y `/api/taskapp/events`. Lo dispara el contenedor
 * `cron` del compose por HTTP (`docker/cron/crontab`, todos los días 07:00 AR).
 *
 * Es `GET` porque el crontab llama con `curl` sin `-X POST` ni body, y esos paths están
 * congelados desde P1. Se expone también como `POST` para dispararlo a mano.
 *
 * La lógica vive en `features/Jobs/jobs/daily-report-deviations.ts`
 * (`runDailyReportDeviationsJob`), que es testeable sin HTTP.
 *
 * No lleva configuración de cache: con `cacheComponents` activado los route handlers ya son
 * dinámicos por defecto, y declarar `dynamic` es un error de compilación.
 */
const handler = createJobHandler('daily-report-deviations', () => runDailyReportDeviationsJob());

export { handler as GET, handler as POST };
