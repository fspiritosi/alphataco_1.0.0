-- =====================================================================
-- CRONJOB: weekly-documents-expiry-email
-- -------
-- Programa el envio del correo semanal de documentos para los lunes a las
-- 08:00 hs Argentina (= 11:00 UTC, UTC-3 todo el ano).
--
-- IMPORTANTE:
--   * Esta migracion ASUME que la edge function 'send-documents-expiry-email'
--     ya esta deployada en el proyecto Supabase indicado.
--   * El token Bearer es el ANON KEY del proyecto (mismo patron que el cron
--     existente 'Reporte diario DailyReport' / jobid 10). El anon key es
--     publico y seguro de versionar.
--   * Si necesita reprogramar o cancelar, usar:
--       SELECT cron.unschedule('weekly-documents-expiry-email');
--   * Para ejecutar manualmente (testing) sin esperar el lunes:
--       SELECT net.http_post(... mismo body ...);
-- =====================================================================

SELECT cron.schedule(
  'weekly-documents-expiry-email',
  '0 11 * * 1',
  $cron$
  select net.http_post(
    url := 'https://vvrckjjyrwqzpbaatemz.supabase.co/functions/v1/send-documents-expiry-email',
    headers := '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2cmNramp5cndxenBiYWF0ZW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1NTc4NzYsImV4cCI6MjA1NTEzMzg3Nn0.x7WRLg3j4rZ5vf7x8twVfTxv1Tzh5WFx-YSuoVS8DO0","Content-Type":"application/json"}'::jsonb,
    body := '{
      "to": [
        "controldocumental@grupohorizonte.com.ar",
        "julia.moreira@grupohorizonte.com.ar",
        "ailen.chaves@grupohorizonte.com.ar",
        "araceli.granado@grupohorizonte.com.ar"
      ],
      "days_ahead": 7,
      "detail_limit": 20
    }',
    timeout_milliseconds := 5000
  );
  $cron$
);
