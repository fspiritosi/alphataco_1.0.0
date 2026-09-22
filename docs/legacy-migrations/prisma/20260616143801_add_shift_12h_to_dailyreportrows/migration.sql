-- Turno (dia/noche) para filas de jornada 12 horas.
-- Permite recordar el turno seleccionado aunque la fila no tenga personal asignado.
CREATE TYPE "daily_report_shift" AS ENUM ('dia', 'noche');

ALTER TABLE "dailyreportrows" ADD COLUMN "shift_12h" "daily_report_shift";
