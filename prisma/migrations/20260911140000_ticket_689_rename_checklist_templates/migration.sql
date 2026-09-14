-- Ticket 689: nomenclar los checklists con el nombre oficial del formulario en papel.
-- Textos del Word del ticket; solo se corrigió formato y caracteres ("-Vactor" -> "- Vactor",
-- "CHECK LIST TTe" -> "Check list Tte"). El código RO, la fecha de emisión y la revisión
-- van en el encabezado del PDF (NormalizedChecklistPDFLayout).
-- Vuelta 360 no cambia: el documento ya la llama así.
UPDATE checklist_templates AS t
SET name = v.name
FROM (VALUES
  ('hidrogrua',       'Check list Hidro grúa'),
  ('pick_up',         'Check list Pickup'),
  ('carreton_petrol', 'Check list carretón petrolero'),
  ('porta_acopl',     'Check list porta contenedor'),
  ('camilla',         'Check list Camilla'),
  ('retro',           'Check list - Retroexcavadora'),
  ('vactor',          'Check list - Vactor'),
  ('eq_vacio_c_semi', 'Check list equipo de vacío con semi'),
  ('tte_personal',    'Check list Tte Personal'),
  ('eq_lavado',       'Check list equipo de lavado'),
  ('testeo',          'Check list equipo de Testeo')
) AS v(code, name)
WHERE t.code = v.code
  AND t.company_id = 'be4119b0-12ca-4a8f-87ed-209239194dab';
