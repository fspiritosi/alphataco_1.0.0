-- El job 'weekly-documents-expiry-email' fue creado por la migración
-- 20260512162500 con la URL del proyecto de Grupo Horizonte, su anon key y
-- destinatarios hardcodeados. Para alphataco el job se crea a mano por entorno
-- (ver docs/desarrollo/entornos.md) y los destinatarios salen del secret
-- DOCUMENTS_EXPIRY_RECIPIENTS de la edge function. Idempotente: no falla si
-- el job no existe (BD nueva) ni si pg_cron no está instalado.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-documents-expiry-email') THEN
      PERFORM cron.unschedule('weekly-documents-expiry-email');
    END IF;
  END IF;
END $$;
