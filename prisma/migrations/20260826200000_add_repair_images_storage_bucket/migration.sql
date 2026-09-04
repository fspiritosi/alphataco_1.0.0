-- Ticket 592: fotos de los items de reparacion cargados manualmente.
--
-- El bucket `repair-images` y sus politicas ya existen en produccion (creados
-- desde el panel de Supabase, de ahi los nombres autogenerados `36p7lk_*`), pero
-- NO en dev: el script `sync-prod-to-dev.sh` clona el schema `public` y no copia
-- los buckets de storage. Resultado: en dev la subida de fotos fallaba.
--
-- Esta migracion deja el bucket declarado en el repositorio para que converja en
-- cualquier entorno. Es idempotente por diseño:
--   - En produccion es un no-op completo (bucket y politicas ya presentes).
--   - En dev crea unicamente el bucket (las politicas ya estaban).
--   - En un entorno limpio (local, un dev reseteado) crea las dos cosas.
--
-- Se conservan los nombres de politica existentes: crear otras con nombre nuevo
-- dejaria dos politicas permisivas equivalentes conviviendo sobre el mismo bucket.

-- ── Bucket ────────────────────────────────────────────────────────────────────
-- `public = true` replica produccion. El limite de tamaño (10 MB) se valida en
-- la capa de aplicacion, igual que en el resto de los buckets del proyecto.
INSERT INTO storage.buckets (id, name, public)
VALUES ('repair-images', 'repair-images', true)
ON CONFLICT (id) DO NOTHING;

-- ── Politicas RLS sobre storage.objects ───────────────────────────────────────
-- Postgres no admite `CREATE POLICY IF NOT EXISTS`, asi que la guarda es explicita.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Permitir todo 36p7lk_0'
  ) THEN
    CREATE POLICY "Permitir todo 36p7lk_0" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'repair-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Permitir todo 36p7lk_1'
  ) THEN
    CREATE POLICY "Permitir todo 36p7lk_1" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'repair-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Permitir todo 36p7lk_2'
  ) THEN
    CREATE POLICY "Permitir todo 36p7lk_2" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'repair-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Permitir todo 36p7lk_3'
  ) THEN
    CREATE POLICY "Permitir todo 36p7lk_3" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'repair-images');
  END IF;
END $$;
