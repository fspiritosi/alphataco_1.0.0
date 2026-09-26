-- 1) Modulo Seleccion: era la tab "Pre Legajos" de Empleados.
--
-- No es otra vista del legajo sino el circuito de incorporacion, con maquina de estados propia,
-- checklist de documentacion y aprobacion de gerencia que recien al final crea el legajo.
--
-- `price` y `description` son NOT NULL sin default: se completan igual que el seed (0 y el
-- nombre del modulo).
INSERT INTO modules (id, slug, name, price, description, order_index, is_active)
VALUES ('cbe0ae38-37ab-48cd-bfeb-f39582d8043b', 'seleccion', 'Selección', 0, 'Selección', 0, true)
ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name;

-- La tab se muda con su `id` intacto: los permisos ya asignados cuelgan de el.
UPDATE tabs
SET module_id = 'cbe0ae38-37ab-48cd-bfeb-f39582d8043b',
    slug = 'candidatos',
    name = 'Candidatos',
    order_index = 0
WHERE id = '20000000-0000-0000-0000-000000000007';

-- 2) Tres pantallas de Empleados que eran la MISMA que ya vive en otro modulo.
--
-- Se verifico antes de borrar que ningun rol tuviera la copia de Empleados sin tener tambien
-- el equivalente que sobrevive, asi que nadie pierde acceso:
--   * CCT (`covenant`) monta el mismo CovenantTreeFileWrapper que Configuracion > RRHH > Convenios.
--   * `documentos-de-empleados` existe igual, con las mismas dos subtabs, en Documentacion.
--   * `tipos-de-documentos` nunca tuvo fila propia aca: heredaba la de Documentacion, que hoy
--     vive en Configuracion > Documentos. Por eso no hay nada que borrar para esa.
--
-- El DELETE arrastra por CASCADE las subtabs de `documentos-de-empleados` y los
-- `role_permissions` de las filas borradas. Dejarlas habria sido peor que borrarlas: seguirian
-- apareciendo en el editor de permisos como algo asignable que no habilita ninguna pantalla.
DELETE FROM tabs WHERE id IN (
  '20000000-0000-0000-0000-000000000005',  -- empleados > covenant
  '20000000-0000-0000-0000-000000000002'   -- empleados > documentos-de-empleados (+2 subtabs)
);

-- 3) De paso: la descripcion del modulo Configuracion quedo con el nombre viejo ("Empresa")
-- porque el seed solo actualiza `name` y `slug`.
UPDATE modules SET description = 'Configuración' WHERE id = 'e0478383-1287-4b5e-a727-985baf867173';
