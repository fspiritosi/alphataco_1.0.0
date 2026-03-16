-- AlterTable
ALTER TABLE "public"."other_equipment"
  ADD COLUMN "type_of_contract" "public"."contract_type_vehicles_enum",
  ADD COLUMN "contract_start_date" DATE,
  ADD COLUMN "contract_expiration_date" DATE,
  ADD COLUMN "contract_number" TEXT;
