-- Ticket 554 — [Equipos] Incorporar check de hidrogrua
--
-- Carga el checklist "Hidrogrua" a partir del formulario papel RO 06-1 rev. 02
-- y lo asocia a los subtipos de equipo que llevan hidrogrua montada.
--
-- Alcance decidido con el usuario: el checklist cubre UNICAMENTE la hidrogrua
-- (el implemento), tal como el formulario papel. No incluye las 4 secciones
-- comunes de revision del vehiculo que si llevan los otros 11 checklists.
--
-- Sobre los enunciados: 22 de los 28 items van con el texto literal del papel.
-- Los 6 restantes estaban redactados como pregunta de defecto ("¿Presenta
-- rajaduras?"), donde responder que SI significa que el equipo esta MAL. Como
-- el sistema interpreta "M" = malo y genera el desvio a Mantenimiento con ese
-- mismo texto, se pasaron a la forma "Ausencia de ..." — que es la que el propio
-- formulario ya usa en ESTABILIZADORES, NEUMATICOS y CHASIS. El texto original
-- del papel queda guardado en la columna `description` de cada item.

-- ── 1. Plantilla ────────────────────────────────────────────────────────────
INSERT INTO checklist_templates (id, company_id, name, description, code, is_active)
VALUES (
  '0464e98f-5cf5-4a44-8e2b-b56803605ea4',
  'be4119b0-12ca-4a8f-87ed-209239194dab',
  'Hidrogrua',
  'Check list de hidrogruas — formulario RO 06-1, revision 02 (01/10/2016)',
  'hidrogrua',
  true
)
ON CONFLICT (company_id, code) DO NOTHING;

-- ── 2. Secciones ────────────────────────────────────────────────────────────
-- Todas son propias de este checklist (section_id NULL, is_specific true): no
-- se agregan al catalogo reutilizable porque ningun otro checklist las comparte.
INSERT INTO checklist_template_sections (template_id, section_id, code, name, order_index, is_required, is_specific)
SELECT t.id, NULL, v.code, v.name, v.ord, true, true
FROM checklist_templates t
CROSS JOIN (VALUES
  ('datos_operador_equipo',      'DATOS DEL OPERADOR Y DEL EQUIPO',  1),
  ('pluma',                      'PLUMA',                            2),
  ('gancho',                     'GANCHO',                           3),
  ('cilindros_hidraulicos',      'CILINDROS HIDRAULICOS',            4),
  ('superestructura_giratoria',  'SUPERESTRUCTURA GIRATORIA',        5),
  ('estabilizadores_hidro',      'ESTABILIZADORES',                  6),
  ('neumaticos_hidro',           'NEUMATICOS',                       7),
  ('circuito_hidraulico',        'CIRCUITO HIDRAULICO',              8),
  ('chasis_hidro',               'CHASIS',                           9),
  ('comandos_hidro',             'COMANDOS',                        10),
  ('complementos_hidro',         'COMPLEMENTOS',                    11),
  ('tablas_carteles',            'TABLAS / CARTELES',               12)
) AS v(code, name, ord)
WHERE t.code = 'hidrogrua'
  AND t.company_id = 'be4119b0-12ca-4a8f-87ed-209239194dab'
ON CONFLICT (template_id, code) DO NOTHING;

-- ── 3. Items ────────────────────────────────────────────────────────────────
-- `label`       = enunciado que ve el operario y que se copia al desvio.
-- `description` = texto literal del formulario papel, para trazabilidad.
INSERT INTO checklist_template_items (
  template_id, section_id, item_id, code, label, description,
  input_type, options, is_critical, requires_certification,
  requires_side_validation, order_index
)
SELECT
  s.template_id, s.id, NULL, v.code, v.label, v.descr,
  v.input_type, v.options::jsonb, false, v.cert, false, v.ord
FROM checklist_template_sections s
JOIN checklist_templates t ON t.id = s.template_id
JOIN (VALUES
  -- DATOS DEL OPERADOR Y DEL EQUIPO
  ('datos_operador_equipo', 'vencimiento_cert_operador', 'Vencimiento de la certificacion del operador', 'Datos del operador — Vencimiento Certificacion', 'date', NULL, true, 1),
  ('datos_operador_equipo', 'capacidad_equipo', 'Capacidad del equipo', 'Datos del equipo — Capacidad', 'text', NULL, false, 2),
  ('datos_operador_equipo', 'vencimiento_cert_equipo', 'Vencimiento de la certificacion del equipo', 'Datos del equipo — Vencimiento Certificacion', 'date', NULL, true, 3),

  -- PLUMA
  ('pluma', 'pluma_golpes_rajaduras', 'Ausencia de golpes severos o rajaduras', '¿Presenta golpes severos o rajaduras?', 'select', '["B","M"]', false, 1),
  ('pluma', 'pluma_suavidad_despliegue', 'Al desplegar la pluma se verifica suavidad del accionamiento hidraulico de todos sus tramos', NULL, 'select', '["B","M"]', false, 2),

  -- GANCHO
  ('gancho', 'gancho_rajaduras_deformaciones', 'Ausencia de rajaduras, deformaciones significativas y/o desgastes excesivos', '¿Presenta rajaduras, deformaciones significativas y/o desgastes excesivos?', 'select', '["B","M"]', false, 1),
  ('gancho', 'gancho_seguro_resorte', '¿Posee seguro el resorte del gancho?', NULL, 'select', '["B","M"]', false, 2),

  -- CILINDROS HIDRAULICOS
  ('cilindros_hidraulicos', 'cilindros_perdidas_aceite', 'Ausencia de perdidas de aceite hidraulico', '¿Hay perdidas de aceite hidraulico?', 'select', '["B","M"]', false, 1),
  ('cilindros_hidraulicos', 'cilindros_estado_pernos', '¿Los pernos se encuentran en buen estado?', NULL, 'select', '["B","M"]', false, 2),
  ('cilindros_hidraulicos', 'cilindros_horquilla_rajaduras', 'Ausencia de rajaduras en la horquilla', '¿La horquilla presenta rajaduras?', 'select', '["B","M"]', false, 3),

  -- SUPERESTRUCTURA GIRATORIA
  ('superestructura_giratoria', 'superestructura_suavidad', '¿Se verifica suavidad en el movimiento?', NULL, 'select', '["B","M"]', false, 1),
  ('superestructura_giratoria', 'superestructura_bloqueo', '¿Los sistemas de bloqueo funcionan correctamente?', NULL, 'select', '["B","M"]', false, 2),
  ('superestructura_giratoria', 'superestructura_frenos', '¿Los frenos funcionan correctamente?', NULL, 'select', '["B","M"]', false, 3),

  -- ESTABILIZADORES
  ('estabilizadores_hidro', 'estabilizadores_funcionamiento', '¿Funcionan correctamente los estabilizadores?', NULL, 'select', '["B","M"]', false, 1),
  ('estabilizadores_hidro', 'estabilizadores_fugas_aceite', 'Ausencia de fugas de aceite', '¿Hay presencia de fugas de aceite?', 'select', '["B","M"]', false, 2),
  ('estabilizadores_hidro', 'estabilizadores_golpes_rajaduras', 'Ausencia de golpes/rajaduras', NULL, 'select', '["B","M"]', false, 3),
  ('estabilizadores_hidro', 'estabilizadores_placas_apoyo', '¿Poseen placas de apoyo?', NULL, 'select', '["B","M"]', false, 4),

  -- NEUMATICOS
  ('neumaticos_hidro', 'neumaticos_cortaduras_desgastes', 'Ausencia de cortaduras/desgastes excesivos', NULL, 'select', '["B","M"]', false, 1),

  -- CIRCUITO HIDRAULICO
  ('circuito_hidraulico', 'circuito_mangueras_acoples', '¿Las mangueras y acoples se encuentran en buen estado?', NULL, 'select', '["B","M"]', false, 1),
  ('circuito_hidraulico', 'circuito_fugas_sistema', 'Ausencia de fugas en el sistema hidraulico', '¿Hay fugas en el sistema hidraulico?', 'select', '["B","M"]', false, 2),
  ('circuito_hidraulico', 'circuito_nivel_aceite', '¿Es optimo el nivel de aceite?', NULL, 'select', '["B","M"]', false, 3),

  -- CHASIS
  ('chasis_hidro', 'chasis_estado_general', '¿El estado general del chasis es bueno?', NULL, 'select', '["B","M"]', false, 1),
  ('chasis_hidro', 'chasis_golpes_rajaduras', 'Ausencia de golpes severos o rajaduras', NULL, 'select', '["B","M"]', false, 2),

  -- COMANDOS
  ('comandos_hidro', 'comandos_frenos_direccion_embragues', 'Verificacion de frenos, direccion, embragues', NULL, 'select', '["B","M"]', false, 1),
  ('comandos_hidro', 'comandos_suavidad_accionamiento', 'Suavidad de accionamiento', NULL, 'select', '["B","M"]', false, 2),

  -- COMPLEMENTOS
  ('complementos_hidro', 'complementos_alarmas', 'Alarmas e indicacion de accionamiento', NULL, 'select', '["B","M"]', false, 1),
  ('complementos_hidro', 'complementos_extintor', 'Extintor portatil', NULL, 'select', '["B","M"]', false, 2),
  ('complementos_hidro', 'complementos_luces_bocina', 'Luces, bocina, limpiaparabrisas', NULL, 'select', '["B","M"]', false, 3),
  ('complementos_hidro', 'complementos_espejos', 'Espejos retrovisores', NULL, 'select', '["B","M"]', false, 4),

  -- TABLAS / CARTELES
  ('tablas_carteles', 'tablas_diagrama_cargas', '¿El equipo posee diagramas de cargas en un lugar visible?', NULL, 'select', '["B","M"]', false, 1),
  ('tablas_carteles', 'tablas_carteles_advertencia', '¿Posee los carteles de advertencia?', NULL, 'select', '["B","M"]', false, 2)
) AS v(section_code, code, label, descr, input_type, options, cert, ord)
  ON v.section_code = s.code
WHERE t.code = 'hidrogrua'
  AND t.company_id = 'be4119b0-12ca-4a8f-87ed-209239194dab'
ON CONFLICT (template_id, section_id, code) DO NOTHING;

-- ── 4. Equipos a los que aplica ─────────────────────────────────────────────
-- Chasis "Caja playa c/hidro" (1 equipo) y Tractor "Tractor c/Hidrogrua" (2).
INSERT INTO checklist_template_sub_types (template_id, sub_type_id)
SELECT t.id, v.sub_type_id::uuid
FROM checklist_templates t
CROSS JOIN (VALUES
  ('20d43144-2138-44ba-9e11-237c7bb9da1d'),  -- Chasis  · Caja playa c/hidro
  ('44d2d7c9-0e5c-495b-a455-89f2915fe761')   -- Tractor · Tractor c/Hidrogrua
) AS v(sub_type_id)
WHERE t.code = 'hidrogrua'
  AND t.company_id = 'be4119b0-12ca-4a8f-87ed-209239194dab'
ON CONFLICT (template_id, sub_type_id) DO NOTHING;
