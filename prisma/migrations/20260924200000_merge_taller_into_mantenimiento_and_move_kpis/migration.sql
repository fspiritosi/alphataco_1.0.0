-- 1) Las secciones "Mantenimiento" y "Taller" de Configuracion eran la misma cosa partida en
--    dos: una configuraba los talleres y sus sectores, la otra los tipos de reparacion que esos
--    talleres hacen. Se fusionan en "Mantenimiento", con las 4 pantallas en una sola vista.
--
-- Las dos subtabs de "Taller" pasan a colgar de "Mantenimiento". Conservan su `id`, asi que los
-- 9 permisos de cada una siguen en pie.
UPDATE tabs
SET parent_tab_id = '10000000-0000-0000-0000-000000000016',
    order_index = CASE id
      WHEN '60000000-0000-0000-0000-000000000012'::uuid THEN 2  -- Tipos de Reparacion
      ELSE 3                                                    -- Grupos
    END
WHERE id IN (
  '60000000-0000-0000-0000-000000000012',
  '60000000-0000-0000-0000-000000000014'
);

-- La tab contenedora "Taller" se queda sin contenido y sin lugar en el menu. Se borra.
-- Arrastra por CASCADE sus 3 `role_permissions` de 'view', que es correcto: son el permiso de
-- ver un contenedor que dejo de existir. Los permisos de las pantallas reales son los de las
-- subtabs, que acaban de reubicarse intactas.
DELETE FROM tabs WHERE id = '60000000-0000-0000-0000-000000000050';

-- 2) Dashboard > Estadisticas > KPIs  ->  Configuracion > General > KPIs
-- Definir que se mide es configuracion; el Dashboard solo lo muestra. El `tabId` ya tenia el
-- prefijo del modulo Configuracion (10000000-...), senal de que nacio ahi.
UPDATE tabs
SET module_id = 'e0478383-1287-4b5e-a727-985baf867173',
    parent_tab_id = '10000000-0000-0000-0000-000000000001',  -- general
    order_index = 4
WHERE id = '10000000-0000-0000-0000-000000000004';

-- Sus sub-subtabs (Indicadores, Graficos) acompanan al padre; `parent_tab_id` no cambia.
UPDATE tabs
SET module_id = 'e0478383-1287-4b5e-a727-985baf867173'
WHERE id IN (
  '10000000-0000-0000-0000-000000000041',
  '10000000-0000-0000-0000-000000000042'
);
