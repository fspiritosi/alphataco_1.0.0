-- Alinear dev con prod (faltan en dev) y cubrir documents_equipment(applies) (falta en ambos)
CREATE INDEX IF NOT EXISTS documents_employees_applies_idx
  ON public.documents_employees USING btree (applies);
CREATE INDEX IF NOT EXISTS documents_employees_id_document_types_idx
  ON public.documents_employees USING btree (id_document_types);
CREATE INDEX IF NOT EXISTS documents_equipment_applies_idx
  ON public.documents_equipment USING btree (applies);
