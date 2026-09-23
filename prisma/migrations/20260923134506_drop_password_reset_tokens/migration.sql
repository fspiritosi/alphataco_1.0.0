-- Elimina la tabla del flujo propio de recuperacion de contrasena.
-- El flujo vigente es el nativo del proveedor de auth (resetPasswordForEmail); las rutas API y
-- las funciones que escribian/leian esta tabla ya no existen, asi que no quedan lectores ni
-- escritores. La tabla va vacia por decision de producto: no hay backfill ni migracion de datos.

-- DropForeignKey
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_profile_id_fkey";

-- DropTable
DROP TABLE "password_reset_tokens";
