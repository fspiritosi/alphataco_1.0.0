-- Add preventive_type field to maintenance_requests and maintenance_orders
ALTER TABLE "maintenance_requests" ADD COLUMN "preventive_type" TEXT;
ALTER TABLE "maintenance_orders" ADD COLUMN "preventive_type" TEXT;
