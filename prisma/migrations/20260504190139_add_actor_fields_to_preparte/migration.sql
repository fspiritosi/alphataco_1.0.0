-- COD-452: registrar quién rechaza/cancela/reprograma un preparte
-- FK a profile(credential_id), mismo patrón que preparte_change_logs.changed_by
ALTER TABLE "preparte"
  ADD COLUMN "rejected_by" UUID,
  ADD COLUMN "cancelled_by" UUID,
  ADD COLUMN "reprogrammed_by" UUID;

ALTER TABLE "preparte"
  ADD CONSTRAINT "preparte_rejected_by_fkey"
    FOREIGN KEY ("rejected_by") REFERENCES "profile"("credential_id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "preparte_cancelled_by_fkey"
    FOREIGN KEY ("cancelled_by") REFERENCES "profile"("credential_id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "preparte_reprogrammed_by_fkey"
    FOREIGN KEY ("reprogrammed_by") REFERENCES "profile"("credential_id")
    ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "idx_preparte_rejected_by" ON "preparte"("rejected_by");
CREATE INDEX "idx_preparte_cancelled_by" ON "preparte"("cancelled_by");
CREATE INDEX "idx_preparte_reprogrammed_by" ON "preparte"("reprogrammed_by");
