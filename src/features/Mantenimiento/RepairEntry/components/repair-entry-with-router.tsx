/**
 * @deprecated Este componente ya no se usa.
 * Fue reemplazado por NuevoPedidoForm que crea maintenance_orders directamente
 * sin pasar por el flujo de repair_solicitudes.
 *
 * Ver: src/features/Mantenimiento/NuevoPedido/components/NuevoPedidoForm.tsx
 */

// 'use client';

// import type { fetchAllEquipmentBasicData } from '@/app/server/GET/actions';
// import RepairNewEntry from '@/features/Mantenimiento/TiposReparaciones/RepairEntry';
// import type { fetchMaintenanceGroupsActionType } from '@/features/Mantenimiento/TiposReparaciones/actions/maintenanceGroupActions';
// import type { TypeOfRepair } from '@/types/types';
// import type { VisibilityState } from '@tanstack/react-table';
// import { useRouter } from 'next/navigation';

// interface RepairEntryWithRouterProps {
//   equipmentId: string;
//   user_id?: string;
//   equipment: Awaited<ReturnType<typeof fetchAllEquipmentBasicData>>;
//   tipo_de_mantenimiento: TypeOfRepair;
//   maintenance_groups: NonNullable<fetchMaintenanceGroupsActionType['groups']>;
//   default_equipment_id?: string;
//   employee_id?: string;
//   savedVisibility: VisibilityState;
//   savedFilters: string[];
//   vehicle?: Awaited<ReturnType<typeof fetchAllEquipmentBasicData>>[0];
// }

// export default function RepairEntryWithRouter({ equipmentId, vehicle, ...props }: RepairEntryWithRouterProps) {
//   const router = useRouter();

//   const handleReturn = () => {
//     router.push(`/maintenance/equipment/${equipmentId}`);
//   };

//   return <RepairNewEntry {...props} limittedEquipment={true} onReturn={props.employee_id ? handleReturn : undefined} />;
// }

export {};
