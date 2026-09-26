-- Tres secciones de configuracion que vivian mezcladas con el trabajo del dia a dia se mudan
-- al modulo Configuracion. Ninguna cambia de `id`, asi que `role_permissions.tab_id` y
-- `user_permissions.tab_id` siguen apuntando a la misma fila: nadie pierde un permiso.
--
-- Ojo con el UNIQUE (module_id, slug): se verifico que ninguno de los slugs que entran colisione
-- con los que ya tenia Configuracion (general, rrhh, vehicles y sus subtabs).
--
-- Idempotente: los UPDATE son por `id` y asignan valores fijos.

-- ── 1. Mantenimiento > Configuracion  ->  Configuracion > Taller ────────────────────────────
UPDATE tabs
SET module_id = 'e0478383-1287-4b5e-a727-985baf867173',
    slug = 'taller',
    name = 'Taller',
    order_index = 4
WHERE id = '60000000-0000-0000-0000-000000000050';

-- Sus subtabs (Tipos de Reparacion, Grupos) acompanan al padre. `parent_tab_id` no cambia.
-- Son las copias del modulo Mantenimiento; Equipos conserva las suyas (30000000-...42/44).
UPDATE tabs
SET module_id = 'e0478383-1287-4b5e-a727-985baf867173'
WHERE id IN (
  '60000000-0000-0000-0000-000000000012',  -- type_of_repair
  '60000000-0000-0000-0000-000000000014'   -- maintenance_groups
);

-- ── 2. Documentacion > Tipos de Documentos  ->  Configuracion > Documentos ───────────────────
-- Esta tab la montan tambien Equipos y Empleados, que no tienen una propia: heredan esta.
-- Por eso mover la fila alcanza para los tres lugares.
UPDATE tabs
SET module_id = 'e0478383-1287-4b5e-a727-985baf867173',
    slug = 'documentos',
    name = 'Documentos',
    order_index = 5
WHERE id = '50000000-0000-0000-0000-000000000004';

UPDATE tabs
SET module_id = 'e0478383-1287-4b5e-a727-985baf867173'
WHERE id IN (
  '60000000-0000-0000-0000-000000000006',  -- tipos-docs-personas
  '60000000-0000-0000-0000-000000000007',  -- tipos-docs-equipos
  '60000000-0000-0000-0000-000000000018'   -- tipos-docs-empresa
);

-- ── 3. Configuracion > General > Mantenimiento  ->  Configuracion > Mantenimiento ────────────
-- No cambia de modulo: sube de subtab a tab de primer nivel. Talleres y Sectores siguen
-- colgando de ella.
UPDATE tabs
SET parent_tab_id = NULL,
    slug = 'mantenimiento',
    name = 'Mantenimiento',
    order_index = 3
WHERE id = '10000000-0000-0000-0000-000000000016';
