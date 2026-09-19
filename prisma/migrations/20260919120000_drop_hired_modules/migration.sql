-- Ticket deuda-fase-1: hired_modules no tiene ningún consumidor en el código
-- (el gating de módulos se hace por role_permissions/tabs). Se elimina la tabla
-- y la única función que la referenciaba, delete_expired_subscriptions(), que
-- tampoco es invocada por ningún cron ni código.
DROP FUNCTION IF EXISTS public.delete_expired_subscriptions();
DROP TABLE IF EXISTS public.hired_modules;
