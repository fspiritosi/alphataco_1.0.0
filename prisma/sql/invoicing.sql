-- Facturación electrónica ARCA: integridad de los comprobantes.
--
-- Un comprobante autorizado por ARCA (con CAE) tiene validez fiscal: no se modifica ni se borra
-- por ningún camino (solo se contrarresta con una nota de crédito). Estas guardas lo garantizan
-- en la base, más allá del código. Ningún trigger escribe en otras tablas: no hay cascadas.

-- ─── Funciones ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.invoices_guard_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status NOT IN ('borrador', 'rechazada') THEN
      RAISE EXCEPTION 'Un comprobante en estado % no se puede borrar', OLD.status
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE de una autorizada: solo el PDF y la marca de revisión.
  IF (to_jsonb(NEW) - ARRAY['pdf_path', 'pdf_generated_at', 'needs_review', 'review_note', 'updated_at'])
     IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['pdf_path', 'pdf_generated_at', 'needs_review', 'review_note', 'updated_at']) THEN
    RAISE EXCEPTION 'El comprobante está autorizado en ARCA y no se puede modificar'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.invoice_children_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_invoice_id uuid;
  v_status invoice_status;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  -- Si el comprobante ya no existe (borrado en cascada de un borrador), se deja pasar.
  SELECT status INTO v_status FROM invoices WHERE id = v_invoice_id;
  IF v_status IS NOT NULL AND v_status NOT IN ('borrador', 'rechazada') THEN
    RAISE EXCEPTION 'Las líneas de un comprobante en estado % no se pueden modificar', v_status
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

-- ─── Triggers ────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS invoices_guard_update ON public.invoices;
CREATE TRIGGER invoices_guard_update
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  WHEN (OLD.status = 'autorizada')
  EXECUTE FUNCTION public.invoices_guard_immutable();

DROP TRIGGER IF EXISTS invoices_guard_delete ON public.invoices;
CREATE TRIGGER invoices_guard_delete
  BEFORE DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.invoices_guard_immutable();

DROP TRIGGER IF EXISTS invoice_lines_guard ON public.invoice_lines;
CREATE TRIGGER invoice_lines_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.invoice_children_guard();

DROP TRIGGER IF EXISTS invoice_vat_guard ON public.invoice_vat;
CREATE TRIGGER invoice_vat_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.invoice_vat
  FOR EACH ROW
  EXECUTE FUNCTION public.invoice_children_guard();

-- ─── Puntos de venta ─────────────────────────────────────────────────────────

-- El número de un punto de venta es parte de la identidad fiscal de cada comprobante emitido
-- (PDF, QR, comprobantes asociados de NC/ND, consultas a ARCA). Con comprobantes numerados no se
-- cambia: si cambió en ARCA, es otro punto de venta.
CREATE OR REPLACE FUNCTION public.sales_points_guard_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM invoices WHERE sales_point_id = NEW.id AND number IS NOT NULL) THEN
    RAISE EXCEPTION 'El punto de venta % ya tiene comprobantes emitidos: su número no se puede cambiar', OLD.number
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sales_points_guard_number ON public.sales_points;
CREATE TRIGGER sales_points_guard_number
  BEFORE UPDATE OF number ON public.sales_points
  FOR EACH ROW
  WHEN (OLD.number IS DISTINCT FROM NEW.number)
  EXECUTE FUNCTION public.sales_points_guard_number();
