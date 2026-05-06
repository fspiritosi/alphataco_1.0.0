-- Add cloned_from_row_id self-reference to dailyreportrows for clone traceability (COD-581)

ALTER TABLE "dailyreportrows"
  ADD COLUMN "cloned_from_row_id" UUID;

ALTER TABLE "dailyreportrows"
  ADD CONSTRAINT "dailyreportrows_cloned_from_row_id_fkey"
  FOREIGN KEY ("cloned_from_row_id")
  REFERENCES "dailyreportrows"("id")
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

CREATE INDEX "idx_dailyreportrows_cloned_from_row_id"
  ON "dailyreportrows" ("cloned_from_row_id")
  WHERE "cloned_from_row_id" IS NOT NULL;
