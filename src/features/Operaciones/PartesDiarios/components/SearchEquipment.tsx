import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Cookies from 'js-cookie';
import { Truck } from 'lucide-react';
import { useState } from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { getActiveEquipmentsForDailyReport } from '../actions/actions';
import { EquipmentDiagramTable } from './data-equipment-diagrams';
import { getEquipmentDiagramColumns } from './equipment-diagram-colum';

export function SearchEquipment({
  equipment,
  field,
}: {
  equipment: Awaited<ReturnType<typeof getActiveEquipmentsForDailyReport>>;
  field: ControllerRenderProps<
    {
      customer: string;
      services: string;
      item: string;
      status: string;
      working_day: string;
      employees?: string[] | undefined;
      equipment?: string[] | undefined;
      equipos_cliente?: string[] | undefined;
      type_service?: 'mensual' | 'adicional' | 'adicional_permanente' | undefined;
      start_time?: string | undefined;
      end_time?: string | undefined;
      description?: string | undefined;
      document_path?: string | undefined;
      sector_service_id?: string | undefined;
      areas_service_id?: string | undefined;
      remit_number?: string | undefined;
      cancel_reason?: string | undefined;
      reprogram_date?: Date | undefined;
      reasigment_reason?: string | undefined;
    },
    'equipment'
  >;
}) {
  const equipmentTableEquipment = Cookies.get(`equipment-table-equipment`);
  const equipmentTableEquipmentFilters = Cookies.get(`equipment-table-equipment-filters`);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(field?.value || []);

  const handleSelectedEmployees = () => {
    // Obtener los valores actuales del field
    const currentSelected = field?.value || [];
    // Crear un nuevo array combinando los actuales y los nuevos seleccionados
    const updatedSelected = [...currentSelected, ...selectedEquipment];

    // Actualizar el field con la nueva selección
    field.onChange(updatedSelected);
    //Cerrar el modal
    document.getElementById('close-dialog-equipment')?.click();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant={'outline'}>
          <Truck className="mr-2 size-4 w-fit" />
          Seleccionar por caracteristica
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Seleccionar Equipos</DialogTitle>

          <DialogDescription>
            Seleccione los equipos que desea asignar al parte diario. Haga clic en guardar cuando haya terminado.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <EquipmentDiagramTable
            savedFilters={equipmentTableEquipmentFilters ? JSON.parse(equipmentTableEquipmentFilters) : []}
            savedVisibility={equipmentTableEquipment ? JSON.parse(equipmentTableEquipment) : {}}
            columns={getEquipmentDiagramColumns(field)}
            data={equipment}
            setSelectedEquipment={setSelectedEquipment}
          />
        </div>
        <DialogFooter>
          <DialogClose id="close-dialog-equipment" asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleSelectedEmployees} type="button">
            Guardar Seleccion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
