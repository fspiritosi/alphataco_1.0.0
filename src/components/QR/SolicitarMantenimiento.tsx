import { fetchAllEquipmentBasicData } from '@/app/server/GET/actions';
import { NuevoPedidoForm } from '@/features/Mantenimiento/NuevoPedido/components/NuevoPedidoForm';
import { TypeOfRepair } from '@/types/types';
import { User } from '@supabase/supabase-js';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';
import { fetchMaintenanceGroupsActionType } from '../Tipos_de_reparaciones/actions/maintenanceGroupActions';
import { Button } from '../ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';

function SolicitarMantenimiento({
  onReturn,
  tipo_de_mantenimiento,
  equipment,
  default_equipment_id,
  employee_id,
  user,
  maintenance_groups,
}: {
  onReturn: () => void;
  tipo_de_mantenimiento: TypeOfRepair;
  equipment: Awaited<ReturnType<typeof fetchAllEquipmentBasicData>>;
  maintenance_groups: NonNullable<fetchMaintenanceGroupsActionType['groups']>;
  default_equipment_id?: string;
  employee_id: string | undefined;
  user: User | null;
  // Props legacy que ya no se usan pero mantenemos para compatibilidad
  savedVisibility?: unknown;
  savedFilters?: unknown;
}) {
  const router = useRouter();
  if (!employee_id && !user?.id) {
    router.push('/maintenance');
  }
  return (
    <Card className="p-4 m-4 bg-white">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <Image src="/gh_logo.png" alt="Logo de Grupo Horizonte" width={240} height={60} className="h-15" />
        </div>
        <CardDescription className="text-center text-gray-600">
          Sistema de Checklist y Mantenimiento de Equipos
        </CardDescription>
      </CardHeader>
      <div className="flex justify-between items-center mb-4">
        <CardTitle>Crear Pedido de Mantenimiento</CardTitle>
        <Button onClick={onReturn} variant={'ghost'}>
          <FiArrowLeft className="mr-2 h-6 w-6" />
          Regresar
        </Button>
      </div>
      <NuevoPedidoForm
        equipment={equipment}
        types_of_repairs={tipo_de_mantenimiento}
        maintenance_groups={maintenance_groups}
        default_equipment_id={default_equipment_id}
        onSuccess={onReturn}
      />
    </Card>
  );
}

export default SolicitarMantenimiento;
