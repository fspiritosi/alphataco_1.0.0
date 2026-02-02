-- Fix for branch creation: Create pgsodium roles if they don't exist
-- These roles are referenced in RLS policies but may not exist in new branch databases
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pgsodium_keyiduser') THEN
    CREATE ROLE pgsodium_keyiduser;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pgsodium_keyholder') THEN
    CREATE ROLE pgsodium_keyholder;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pgsodium_keymaker') THEN
    CREATE ROLE pgsodium_keymaker;
  END IF;
END
$$;
