-- Smoke test de schema: confirma que el baseline + migraciones dejan la BD
-- en el estado esperado (funciones, vista, columnas, y sin rastro de Supabase).
BEGIN;

SELECT plan(10);

-- Funciones de permisos y del dominio (existencia, sin importar firma)
SELECT has_function('public', 'user_has_permission', 'existe user_has_permission');
SELECT has_function(
  'public',
  'controlar_alertas_documentos_single_employee',
  'existe controlar_alertas_documentos_single_employee'
);
SELECT has_function('public', 'app_current_user_id', 'existe app_current_user_id');
SELECT has_function('public', 'marcar_prepartes_vencidos', 'existe marcar_prepartes_vencidos');
SELECT has_function(
  'public',
  'run_daily_indicators_for_all_companies',
  'existe run_daily_indicators_for_all_companies'
);

-- Vista de dominio
SELECT has_view(
  'public',
  'equipments_with_pending_deviations',
  'existe la vista equipments_with_pending_deviations'
);

-- Columna company_id en maintenance_orders (multi-empresa)
SELECT has_column('maintenance_orders', 'company_id', 'maintenance_orders tiene company_id');
SELECT col_not_null('maintenance_orders', 'company_id', 'maintenance_orders.company_id es NOT NULL');

-- Sin rastro de Supabase: no hay schema auth ni storage
SELECT hasnt_schema('auth', 'no existe el schema auth (Supabase)');
SELECT hasnt_schema('storage', 'no existe el schema storage (Supabase)');

SELECT * FROM finish();

ROLLBACK;
