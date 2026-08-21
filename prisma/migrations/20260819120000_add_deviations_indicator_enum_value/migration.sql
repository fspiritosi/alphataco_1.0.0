-- Agrega el valor de enum para el snapshot diario de desvios del parte diario.
--
-- Va en una migracion PROPIA y aislada a proposito: Postgres no permite usar un
-- valor de enum recien agregado dentro de la misma transaccion que lo agrego
-- ("unsafe use of new value of enum type"). Como `prisma db execute` corre cada
-- archivo en una sola sesion, el ALTER TYPE debe commitear antes de que la
-- migracion siguiente lo referencie.
ALTER TYPE public.indicator_function ADD VALUE IF NOT EXISTS 'get_daily_report_deviations_indicator';
