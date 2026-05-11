-- Add UNIQUE constraint on (date, company_id) for dailyreport
-- Prevents creating duplicate dailyreport headers for the same date + company.
-- COD-580/581 hardening: previously a race / timezone bug allowed duplicates.

ALTER TABLE "dailyreport"
  ADD CONSTRAINT "dailyreport_date_company_id_key" UNIQUE ("date", "company_id");
