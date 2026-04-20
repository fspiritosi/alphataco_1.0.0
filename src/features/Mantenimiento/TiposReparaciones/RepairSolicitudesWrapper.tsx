import { RepairSolicitudesList } from '@/features/Mantenimiento/RepairSolicitudes';

/**
 * Wrapper que adapta los props de RepairTypes → RepairSolicitudesList.
 * Reemplaza al anterior wrapper que usaba el sistema viejo (BaseDataTable + Supabase).
 *
 * Contextos de uso:
 *  1. Módulo mantenimiento (mechanic=true) — usuario mecánico ve acciones de edición
 *  2. Detalle del equipo (equipment_id + canEdit) — filtro fijo por equipo + edición según permiso
 */
async function RepairSolicitudesWrapper({
  mechanic,
  equipment_id,
  canEdit,
}: {
  mechanic?: boolean;
  equipment_id?: string;
  canEdit?: boolean;
}) {
  return <RepairSolicitudesList searchParams={{}} mechanic={mechanic} equipment_id={equipment_id} canEdit={canEdit} />;
}

export default RepairSolicitudesWrapper;
