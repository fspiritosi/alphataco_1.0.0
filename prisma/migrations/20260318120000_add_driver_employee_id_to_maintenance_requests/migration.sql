ALTER TABLE "public"."maintenance_requests" ADD COLUMN "driver_employee_id" UUID;

ALTER TABLE "public"."maintenance_requests"
  ADD CONSTRAINT "maintenance_requests_driver_employee_id_fkey"
  FOREIGN KEY ("driver_employee_id") REFERENCES "public"."employees"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
