-- Facturación ARCA: el número de un punto de venta con comprobantes no se puede cambiar
-- (copia de prisma/sql/invoicing.sql).

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
