'use client';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { employeeWorkDataSchema, type EmployeeWorkDataValues } from '../../EmpleadoID/components/forms/employee-form';
import { EmployeeWorkDataForm } from '../../EmpleadoID/components/forms/employee-work-data-form';
import { approvePreEmployee } from '../actions/approve-pre-employee.server';

const logger = new Logger('PreLegajos/ApproveSheet');

interface ApprovePreEmployeeSheetProps {
  preEmployeeId: string;
  /** Sector y puesto propuestos: se precargan pero gerencia puede cambiarlos. */
  proposedHierarchicalPosition: string | null;
  proposedCompanyPosition: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved?: (employeeId: string) => void;
}

/**
 * Aprobación de un pre legajo: se completan los datos laborales que faltan
 * (legajo definitivo, diagrama, convenio, afectaciones...) y se crea el empleado.
 * Reutiliza el mismo formulario de datos laborales del legajo.
 */
export function ApprovePreEmployeeSheet({
  preEmployeeId,
  proposedHierarchicalPosition,
  proposedCompanyPosition,
  open,
  onOpenChange,
  onApproved,
}: ApprovePreEmployeeSheetProps) {
  const form = useForm<EmployeeWorkDataValues>({
    resolver: zodResolver(employeeWorkDataSchema),
    defaultValues: {
      file: '',
      hierarchical_position: proposedHierarchicalPosition ?? '',
      company_position: proposedCompanyPosition ?? '',
      workflow_diagram: '',
      aptitudes: [],
      allocated_to: [],
      workshop_sector_ids: [],
    },
  });

  const onSubmit = async (values: EmployeeWorkDataValues) => {
    try {
      const result = await approvePreEmployee(preEmployeeId, values);

      const documentsMessage =
        result.skippedDocuments > 0
          ? `${result.transferredDocuments} de ${result.transferredDocuments + result.skippedDocuments} documentos se incorporaron al legajo. ${result.skippedDocuments} no aplican a la función asignada y quedaron en el historial del pre legajo.`
          : `${result.transferredDocuments} documentos se incorporaron al legajo.`;

      toast.success('Legajo creado', { description: documentsMessage });
      onOpenChange(false);
      onApproved?.(result.employeeId);
    } catch (error) {
      logger.error('Error al aprobar el pre legajo', { data: { error, preEmployeeId } });
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el legajo');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Aprobar y crear legajo</SheetTitle>
          <SheetDescription>
            Completá los datos laborales que faltan. Los datos personales y de contacto se toman del pre legajo, y los
            documentos ya cargados se incorporan al legajo cuando correspondan a la función asignada.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-4 pb-6">
            <EmployeeWorkDataForm />

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creando legajo...' : 'Confirmar y crear legajo'}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
