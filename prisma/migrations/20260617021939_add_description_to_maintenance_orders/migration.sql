-- Add nullable description column to maintenance_orders (Ticket 274 - Req A)
-- Replica la descripcion del Nuevo Pedido a las solapas de Operaciones y Taller
ALTER TABLE "maintenance_orders" ADD COLUMN "description" TEXT;
