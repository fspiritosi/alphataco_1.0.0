-- Facturación electrónica ARCA (fase 5): comprobantes, líneas, IVA por alícuota y vínculo con
-- certificaciones. Se toma SOLO lo nuevo del `migrate diff`.

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('borrador', 'emitiendo', 'pendiente', 'rechazada', 'autorizada');

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "environment" "arca_environment" NOT NULL,
    "status" "invoice_status" NOT NULL DEFAULT 'borrador',
    "sales_point_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "cbte_type" INTEGER NOT NULL,
    "number" INTEGER,
    "concept" INTEGER NOT NULL DEFAULT 2,
    "issue_date" DATE NOT NULL,
    "service_from" DATE,
    "service_to" DATE,
    "payment_due_date" DATE,
    "currency" CHAR(3) NOT NULL,
    "arca_currency_id" VARCHAR(3) NOT NULL,
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "exchange_rate_date" DATE,
    "net_taxed" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_untaxed" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "exempt_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "vat_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "other_taxes" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "receiver_doc_type" INTEGER NOT NULL DEFAULT 80,
    "receiver_doc_number" BIGINT NOT NULL,
    "receiver_vat_condition_id" INTEGER NOT NULL,
    "issuer_snapshot" JSONB,
    "receiver_snapshot" JSONB,
    "associated_invoice_id" UUID,
    "cae" VARCHAR(14),
    "cae_due_date" DATE,
    "authorized_at" TIMESTAMPTZ(6),
    "arca_result" CHAR(1),
    "arca_observations" JSONB,
    "arca_errors" JSONB,
    "request_payload" JSONB,
    "claimed_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "review_note" TEXT,
    "pdf_path" TEXT,
    "pdf_generated_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_by" UUID,
    "emitted_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unit_price" DECIMAL(15,4) NOT NULL,
    "net_amount" DECIMAL(15,2) NOT NULL,
    "vat_rate_id" INTEGER,
    "service_item_id" UUID,
    "certification_id" UUID,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_vat" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "vat_rate_id" INTEGER NOT NULL,
    "base_amount" DECIMAL(15,2) NOT NULL,
    "vat_amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "invoice_vat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_certifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "certification_id" UUID NOT NULL,
    "environment" "arca_environment" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "released_at" TIMESTAMPTZ(6),

    CONSTRAINT "invoice_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_invoices_company_status" ON "invoices"("company_id", "status");

-- CreateIndex
CREATE INDEX "idx_invoices_company_issue_date" ON "invoices"("company_id", "issue_date" DESC);

-- CreateIndex
CREATE INDEX "idx_invoices_customer" ON "invoices"("customer_id");

-- CreateIndex
CREATE INDEX "idx_invoices_associated" ON "invoices"("associated_invoice_id") WHERE (associated_invoice_id IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "uq_invoices_number" ON "invoices"("sales_point_id", "environment", "cbte_type", "number");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_lines_invoice_id_position_key" ON "invoice_lines"("invoice_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_vat_invoice_id_vat_rate_id_key" ON "invoice_vat"("invoice_id", "vat_rate_id");

-- CreateIndex
CREATE INDEX "idx_invoice_certifications_certification" ON "invoice_certifications"("certification_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_certifications_invoice_id_certification_id_key" ON "invoice_certifications"("invoice_id", "certification_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_invoice_certifications_live_prod" ON "invoice_certifications"("certification_id") WHERE ((environment = 'produccion'::arca_environment) AND (released_at IS NULL));

-- AddForeignKey
ALTER TABLE "arca_call_logs" ADD CONSTRAINT "arca_call_logs_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sales_point_id_fkey" FOREIGN KEY ("sales_point_id") REFERENCES "sales_points"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_associated_invoice_id_fkey" FOREIGN KEY ("associated_invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_service_item_id_fkey" FOREIGN KEY ("service_item_id") REFERENCES "service_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_vat" ADD CONSTRAINT "invoice_vat_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_certifications" ADD CONSTRAINT "invoice_certifications_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_certifications" ADD CONSTRAINT "invoice_certifications_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- ─── Checks que Prisma no expresa ────────────────────────────────────────────

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_cbte_type_check" CHECK ("cbte_type" IN (1, 2, 3, 6, 7, 8, 11, 12, 13)),
  ADD CONSTRAINT "invoices_concept_check" CHECK ("concept" IN (1, 2, 3)),
  ADD CONSTRAINT "invoices_number_check" CHECK ("number" IS NULL OR "number" > 0),
  ADD CONSTRAINT "invoices_receiver_vat_condition_check" CHECK ("receiver_vat_condition_id" IN (1, 4, 5, 6, 7, 10, 13, 15, 16)),
  ADD CONSTRAINT "invoices_amounts_check" CHECK (
    "net_taxed" >= 0 AND "net_untaxed" >= 0 AND "exempt_amount" >= 0 AND "vat_total" >= 0
    AND "other_taxes" >= 0 AND "exchange_rate" > 0
  ),
  ADD CONSTRAINT "invoices_total_check" CHECK (
    "total" = "net_taxed" + "net_untaxed" + "exempt_amount" + "vat_total" + "other_taxes"
  ),
  -- NC y ND siempre ajustan otro comprobante; una factura nunca.
  ADD CONSTRAINT "invoices_associated_check" CHECK (
    ("cbte_type" IN (2, 3, 7, 8, 12, 13)) = ("associated_invoice_id" IS NOT NULL)
  ),
  ADD CONSTRAINT "invoices_authorized_check" CHECK (
    "status" <> 'autorizada'
    OR ("cae" IS NOT NULL AND "cae_due_date" IS NOT NULL AND "number" IS NOT NULL AND "authorized_at" IS NOT NULL)
  ),
  -- Un pendiente siempre tiene número: es lo que se consulta en ARCA para reconciliar.
  ADD CONSTRAINT "invoices_pending_has_number_check" CHECK ("status" <> 'pendiente' OR "number" IS NOT NULL),
  ADD CONSTRAINT "invoices_service_dates_check" CHECK (
    "service_from" IS NULL OR "service_to" IS NULL OR "service_to" >= "service_from"
  );

ALTER TABLE "invoice_lines"
  ADD CONSTRAINT "invoice_lines_amounts_check" CHECK ("quantity" >= 0 AND "unit_price" >= 0 AND "net_amount" >= 0),
  ADD CONSTRAINT "invoice_lines_vat_rate_check" CHECK ("vat_rate_id" IS NULL OR "vat_rate_id" IN (3, 4, 5, 6, 8, 9));

ALTER TABLE "invoice_vat"
  ADD CONSTRAINT "invoice_vat_rate_check" CHECK ("vat_rate_id" IN (3, 4, 5, 6, 8, 9)),
  ADD CONSTRAINT "invoice_vat_amounts_check" CHECK ("base_amount" >= 0 AND "vat_amount" >= 0);

ALTER TABLE "invoice_certifications"
  ADD CONSTRAINT "invoice_certifications_amount_check" CHECK ("amount" >= 0);

-- ─── Integridad (copia de prisma/sql/invoicing.sql) ──────────────────────────

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
