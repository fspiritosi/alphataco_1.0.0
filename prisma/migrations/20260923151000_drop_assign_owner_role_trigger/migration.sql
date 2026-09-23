-- Baja del trigger `assign_owner_role_trigger` y de su función.
--
-- Nunca hizo nada: salía por el `RAISE WARNING` porque no existe ningún rol con
-- `slug = 'owner'` en el seed. Y si el rol existiera, tampoco habría funcionado: insertaba
-- `company.owner_id` (un `profile.id`) en `user_roles.user_id`, que es FK a
-- `profile.credential_id`.
--
-- El alta del owner —la pertenencia en `share_company_users` y el rol inicial de la
-- empresa— la resuelve `createCompany` en la aplicación.
DROP TRIGGER IF EXISTS assign_owner_role_trigger ON public.company;
DROP FUNCTION IF EXISTS public.assign_owner_role_on_company_creation();
