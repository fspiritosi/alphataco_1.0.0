'use client';

import { DialogFooter } from '@/components/ui/dialog';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarCheck } from 'lucide-react';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  checkDailyReportExists,
  createDailyReport,
  createDailyReportCustomerEquipmentRelations,
  createDailyReportEmployeeRelations,
  createDailyReportEmployeeRelationsWithRoles,
  createDailyReportEquipmentRelations,
  createDailyReportRow,
} from '../actions/actions';
import { transformDailyReports } from './DayliReportDetailTable';

interface ClonarRegistrosButtonProps {
  formattedData: ReturnType<typeof transformDailyReports>;
  selectedRows: ReturnType<typeof transformDailyReports>;
  fetchAllFormattedData?: () => Promise<any[]>;
  onSuccess?: () => void;
}

export function ClonarRegistrosButton({
  formattedData,
  selectedRows,
  fetchAllFormattedData,
  onSuccess,
}: ClonarRegistrosButtonProps) {
  const [open, setOpen] = useState(false);
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);

  // Estado para los checkbox y su disponibilidad
  const [mensualesExist, setMensualesExist] = useState(false);
  const [adicionalesExist, setAdicionalesExist] = useState(false);
  const [adicionalesPermanentesExist, setAdicionalesPermanentesExist] = useState(false);

  const [incluirMensuales, setIncluirMensuales] = useState(false);
  const [incluirAdicionales, setIncluirAdicionales] = useState(false);
  const [incluirAdicionalesPermanentes, setIncluirAdicionalesPermanentes] = useState(false);
  const [soloSeleccionadas, setSoloSeleccionadas] = useState(selectedRows?.length > 0);

  // Estados para trasladar recursos
  const [trasladarPersonal, setTrasladarPersonal] = useState(false);
  const [trasladarEquipos, setTrasladarEquipos] = useState(false);

  const router = useRouter();

  // Inicializar irARegistros en true (navegar al registro clonado por defecto)
  const [irARegistros, setIrARegistros] = useState(true);

  // Controlar los estados de los checkboxes según el estado de las filas seleccionadas
  useEffect(() => {
    // Buscar registros por tipo
    const hasMensuales = formattedData?.some((row) => row.type_service === 'mensual');
    const hasAdicionales = formattedData?.some((row) => row.type_service === 'adicional');
    const hasAdicionalesPermanentes = formattedData?.some((row) => row.type_service === 'adicional_permanente');

    // Actualizar estado de existencia
    setMensualesExist(hasMensuales);
    setAdicionalesExist(hasAdicionales);
    setAdicionalesPermanentesExist(hasAdicionalesPermanentes);

    // Si hay filas seleccionadas, checkbox de seleccionadas en true y disabled, y los demás en false
    if (selectedRows?.length > 0) {
      setSoloSeleccionadas(true); // Seleccionado
      setIncluirMensuales(false);
      setIncluirAdicionales(false);
      setIncluirAdicionalesPermanentes(false);
    } else {
      // Si no hay filas seleccionadas, checkbox de seleccionadas en false y los demás según existencia
      setSoloSeleccionadas(false); // No seleccionado
      setIncluirMensuales(hasMensuales);
      setIncluirAdicionales(hasAdicionales);
      setIncluirAdicionalesPermanentes(hasAdicionalesPermanentes);
    }
  }, [formattedData, selectedRows]);

  // Deshabilitar "Ir a registros" cuando hay más de una fecha seleccionada
  useEffect(() => {
    if (fechasSeleccionadas.length > 1) {
      setIrARegistros(false);
    }
  }, [fechasSeleccionadas.length]);

  const handleClonar = async () => {
    toast.promise(
      async () => {
        if (fechasSeleccionadas.length === 0) {
          throw new Error('Debes seleccionar al menos una fecha para clonar los registros');
        }

        // Solo verificar tipos de registro si no hay filas seleccionadas
        if (selectedRows?.length === 0 && !incluirMensuales && !incluirAdicionales && !incluirAdicionalesPermanentes) {
          throw new Error('Debes seleccionar al menos un tipo de registro a clonar');
        }
        setLoading(true);

        const formattedDates = fechasSeleccionadas.map((date) => format(date, 'yyyy-MM-dd'));

        // Verificar qué reportes ya existen
        const existingReports = await checkDailyReportExists(formattedDates);
        const existingReportDates = new Set(existingReports?.map((report) => report.date) || []);

        // Separar fechas en nuevas y existentes
        const newDates = formattedDates.filter((date) => !existingReportDates.has(date));

        // Crear nuevos reportes para las fechas que no existen
        let createdReports: Awaited<ReturnType<typeof createDailyReport>> = [];
        if (newDates.length > 0) {
          createdReports = await createDailyReport(newDates);
        }

        // Combinar reportes existentes con los recién creados
        const allReports = [...(existingReports || []), ...(createdReports || [])];
        // Para cada reporte (nuevo o existente), clonar las filas
        for (const report of allReports) {
          let filteredRows = [];

          // Si hay filas seleccionadas, clonamos solo esas, independientemente de los checkboxes de tipo
          if (selectedRows?.length > 0) {
            filteredRows = selectedRows;
          } else {
            // Si existe fetchAllFormattedData, obtener TODOS los datos
            let allFormattedData = formattedData;
            if (fetchAllFormattedData) {
              allFormattedData = await fetchAllFormattedData();
            }

            // Si no hay filas seleccionadas, filtramos según los checkboxes de tipo
            filteredRows = allFormattedData.filter(
              (row) =>
                (row.type_service === 'mensual' && incluirMensuales) ||
                (row.type_service === 'adicional' && incluirAdicionales) ||
                (row.type_service === 'adicional_permanente' && incluirAdicionalesPermanentes)
            );
          }

          const formattedRows = filteredRows.map((row) => {
            // Determinar el estado según si se copiarán recursos
            const validEmployees = trasladarPersonal
              ? row.employees_references?.filter((emp) => emp.is_active !== false) || []
              : [];
            const validEquipment = trasladarEquipos ? row.equipment_references || [] : [];
            const hasEmployees = validEmployees.length > 0;
            const hasEquipment = validEquipment.length > 0;
            const newStatus = hasEmployees || hasEquipment ? 'pendiente' : 'sin_recursos_asignados';

            return {
              customer_id: row.data_to_clone.customer_id!,
              service_id: row.data_to_clone.service_id!,
              item_id: row.data_to_clone.item_id!,
              working_day: row.data_to_clone.working_day!,
              start_time: row.data_to_clone.start_time,
              end_time: row.data_to_clone.end_time,
              description: row.data_to_clone.description,
              daily_report_id: report.id,
              status: newStatus as any,
              areas_service_id: row.data_to_clone.areas_service_id,
              sector_service_id: row.data_to_clone.sector_service_id,
              type_service: row.data_to_clone.type_service!,
            };
          });

          const createdRows = await createDailyReportRow(formattedRows);

          // Copiar relaciones de empleados y equipos si está habilitado
          if (createdRows && createdRows.length > 0) {
            for (let i = 0; i < createdRows.length; i++) {
              const newRow = createdRows[i];
              const originalRow = filteredRows[i];

              // Copiar empleados si está habilitado y hay empleados en la fila original
              // PO-2: Filtrar empleados de baja (is_active = false)
              if (trasladarPersonal && originalRow.employees_references?.length > 0) {
                const activeEmployees = originalRow.employees_references.filter(
                  (emp) => emp.is_active !== false && !!emp.id
                );

                // Separar empleados con rol (jornadas 12/24 hrs) y sin rol
                const employeesWithRoles = activeEmployees
                  .filter((emp) => !!emp.role)
                  .map((emp) => ({
                    employeeId: emp.id as string,
                    role: emp.role as 'chofer_dia' | 'chofer_noche' | 'ayudante_dia' | 'ayudante_noche',
                  }));

                const employeesWithoutRoles = activeEmployees
                  .filter((emp) => !emp.role)
                  .map((emp) => emp.id)
                  .filter((id): id is string => !!id);

                if (employeesWithRoles.length > 0) {
                  await createDailyReportEmployeeRelationsWithRoles(newRow.id, employeesWithRoles);
                }
                if (employeesWithoutRoles.length > 0) {
                  await createDailyReportEmployeeRelations(newRow.id, employeesWithoutRoles);
                }
              }

              // Copiar equipos si está habilitado y hay equipos en la fila original
              if (trasladarEquipos && originalRow.equipment_references?.length > 0) {
                const equipmentIds = originalRow.equipment_references
                  .map((eq) => eq.id)
                  .filter((id): id is string => !!id);
                if (equipmentIds.length > 0) {
                  await createDailyReportEquipmentRelations(newRow.id, equipmentIds);
                }
              }

              // Copiar equipos del cliente siempre por defecto
              if (originalRow.customer_equipment?.length > 0) {
                const customerEquipmentIds = originalRow.customer_equipment
                  .map((eq) => eq.id)
                  .filter((id): id is string => !!id);
                if (customerEquipmentIds.length > 0) {
                  await createDailyReportCustomerEquipmentRelations(newRow.id, customerEquipmentIds);
                }
              }
            }
          }
        }

        // Guardar el ID del reporte para navegar después
        const navigateToReportId =
          irARegistros && fechasSeleccionadas.length === 1 && allReports.length > 0 ? allReports[0].id : null;

        setOpen(false);
        setFechasSeleccionadas([]);

        // Retornar el ID para usarlo en el success callback
        return navigateToReportId;
      },
      {
        loading: 'Clonando registros...',
        success: (navigateToReportId) => {
          setOpen(false);
          setFechasSeleccionadas([]);
          setLoading(false);

          // Invalidar datos de la tabla actual
          onSuccess?.();

          // Navegar al reporte clonado después de que el toast se muestre
          if (navigateToReportId) {
            setTimeout(() => {
              router.push(`/dashboard/operations/${navigateToReportId}`);
            }, 300);
          }

          return 'Registros clonados exitosamente!';
        },
        error: (error) => {
          setLoading(false);
          return error || 'Ocurrió un error al clonar los registros';
        },
      }
    );
  };

  const removeFecha = (fecha: Date) => {
    setFechasSeleccionadas((prev) => prev.filter((d) => d.toDateString() !== fecha.toDateString()));
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex items-center gap-2 ml-2">
        <CalendarCheck className="h-4 w-4" />
        Clonar Registros
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white text-black p-0 gap-0 overflow-auto max-h-[90vh]">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl">
              Clonar registros del {moment.utc(formattedData?.[0]?.date).format('DD/MM/YYYY')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Solo los registros mensuales se clonaran en la fecha seleccionada.
            </DialogDescription>
          </DialogHeader>

          <div className="px-8 py-4">
            {/* Aquí va el calendario y las fechas seleccionadas */}
            <div className="space-y-4">
              <div className="rounded-md  border-input bg-background p-4">
                {/* <div className="text-sm font-medium mb-2">Selecciona fechas para clonar:</div> */}
                <div className="w-full">
                  <Calendar
                    mode="multiple"
                    selected={fechasSeleccionadas}
                    onSelect={(dates: Date[] | undefined) => {
                      setFechasSeleccionadas(dates ?? []);
                    }}
                    captionLayout="dropdown"
                    locale={es}
                    className="rounded-lg border shadow-sm w-full"
                    disabled={(date) => moment(date).isBefore(moment().subtract(1, 'days'))}
                  />
                </div>
              </div>

              {fechasSeleccionadas.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Fechas seleccionadas:</h4>
                  <div className="flex flex-wrap gap-2">
                    {fechasSeleccionadas.map((fecha) => (
                      <Badge key={fecha.toISOString()} variant="secondary" className="flex items-center gap-1">
                        {format(fecha, 'dd/MM/yyyy', { locale: es })}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeFecha(fecha);
                          }}
                          className="ml-1 rounded-full text-xs hover:bg-muted"
                          aria-label="Eliminar fecha"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-2 mt-4">
              <div className="text-sm font-medium mb-1">Tipos de registros a clonar:</div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="incluir-mensuales"
                  checked={incluirMensuales}
                  disabled={!mensualesExist || selectedRows?.length > 0}
                  onCheckedChange={(checked) => {
                    const newValue = checked as boolean;
                    setIncluirMensuales(newValue);
                    // Si hay más de 2 registros después de este cambio, deshabilitar irARegistros
                    const updatedTooMany =
                      formattedData.filter(
                        (row) =>
                          (row.type_service === 'mensual' && newValue) ||
                          (row.type_service === 'adicional' && incluirAdicionales) ||
                          (row.type_service === 'adicional_permanente' && incluirAdicionalesPermanentes)
                      ).length > 2;

                    if (updatedTooMany) {
                      setIrARegistros(false);
                    }
                  }}
                />
                <Label
                  htmlFor="incluir-mensuales"
                  className={!mensualesExist || selectedRows?.length > 0 ? 'text-gray-400' : ''}
                >
                  Incluir registros Mensuales {!mensualesExist && '(No hay registros)'}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="incluir-adicionales"
                  checked={incluirAdicionales}
                  disabled={!adicionalesExist || selectedRows?.length > 0}
                  onCheckedChange={(checked) => {
                    const newValue = checked as boolean;
                    setIncluirAdicionales(newValue);
                    // Si hay más de 2 registros después de este cambio, deshabilitar irARegistros
                    const updatedTooMany =
                      formattedData.filter(
                        (row) =>
                          (row.type_service === 'mensual' && incluirMensuales) ||
                          (row.type_service === 'adicional' && newValue) ||
                          (row.type_service === 'adicional_permanente' && incluirAdicionalesPermanentes)
                      ).length > 2;

                    if (updatedTooMany) {
                      setIrARegistros(false);
                    }
                  }}
                />
                <Label htmlFor="incluir-adicionales" className={!adicionalesExist ? 'text-gray-400' : ''}>
                  Incluir registros Adicionales {!adicionalesExist && '(No hay registros)'}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="incluir-adicionales-permanentes"
                  checked={incluirAdicionalesPermanentes}
                  disabled={!adicionalesPermanentesExist || selectedRows?.length > 0}
                  onCheckedChange={(checked) => {
                    const newValue = checked as boolean;
                    setIncluirAdicionalesPermanentes(newValue);
                    // Si hay más de 2 registros después de este cambio, deshabilitar irARegistros
                    const updatedTooMany =
                      formattedData.filter(
                        (row) =>
                          (row.type_service === 'mensual' && incluirMensuales) ||
                          (row.type_service === 'adicional' && incluirAdicionales) ||
                          (row.type_service === 'adicional_permanente' && newValue)
                      ).length > 2;

                    if (updatedTooMany) {
                      setIrARegistros(false);
                    }
                  }}
                />
                <Label
                  htmlFor="incluir-adicionales-permanentes"
                  className={!adicionalesPermanentesExist ? 'text-gray-400' : ''}
                >
                  Incluir registros Adicionales Permanentes {!adicionalesPermanentesExist && '(No hay registros)'}
                </Label>
              </div>

              <div className="flex items-center space-x-2 mt-2">
                <Checkbox id="solo-seleccionadas" checked={soloSeleccionadas} disabled={true} />
                <Label htmlFor="solo-seleccionadas" className={selectedRows?.length === 0 ? 'text-gray-400' : ''}>
                  Solo clonar registros seleccionados {selectedRows?.length === 0 && '(No hay registros seleccionados)'}
                </Label>
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="text-sm font-medium mb-2">Trasladar recursos:</div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trasladar-personal"
                    checked={trasladarPersonal}
                    onCheckedChange={(checked) => setTrasladarPersonal(checked as boolean)}
                  />
                  <Label htmlFor="trasladar-personal">
                    Trasladar Personal (copiar empleados asignados a las nuevas filas)
                  </Label>
                </div>

                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id="trasladar-equipos"
                    checked={trasladarEquipos}
                    onCheckedChange={(checked) => setTrasladarEquipos(checked as boolean)}
                  />
                  <Label htmlFor="trasladar-equipos">
                    Trasladar Equipos (copiar vehículos asignados a las nuevas filas)
                  </Label>
                </div>
              </div>

              <div className="flex items-center space-x-2 mt-4">
                <Checkbox
                  id="ir-registros"
                  checked={irARegistros}
                  disabled={fechasSeleccionadas.length > 1}
                  onCheckedChange={(checked) => setIrARegistros(checked as boolean)}
                />
                <Label htmlFor="ir-registros" className={fechasSeleccionadas.length > 1 ? 'text-muted-foreground' : ''}>
                  Ir a los registros clonados al finalizar
                  {fechasSeleccionadas.length > 1 && ' (deshabilitado por tener más de 2 fechas seleccionadas)'}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className=" px-6 py-4">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setFechasSeleccionadas([]);
                setLoading(false);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleClonar} disabled={loading}>
              {loading ? 'Clonando...' : 'Clonar registros'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
