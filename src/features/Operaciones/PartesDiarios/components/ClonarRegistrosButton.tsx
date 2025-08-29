'use client';

import { DialogFooter } from '@/components/ui/dialog';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { checkDailyReportExists, createDailyReport, createDailyReportRow } from '../actions/actions';
import { transformDailyReports } from './DayliReportDetailTable';

interface ClonarRegistrosButtonProps {
  formattedData: ReturnType<typeof transformDailyReports>;
  selectedRows: ReturnType<typeof transformDailyReports>;
}

export function ClonarRegistrosButton({ formattedData, selectedRows }: ClonarRegistrosButtonProps) {
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

  const router = useRouter();

  // Inicializar irARegistros basado en la cantidad de registros
  const [irARegistros, setIrARegistros] = useState(fechasSeleccionadas.length > 1);

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
            // Si no hay filas seleccionadas, filtramos según los checkboxes de tipo
            filteredRows = formattedData.filter(
              (row) =>
                (row.type_service === 'mensual' && incluirMensuales) ||
                (row.type_service === 'adicional' && incluirAdicionales) ||
                (row.type_service === 'adicional_permanente' && incluirAdicionalesPermanentes)
            );
          }

          const formattedRows = filteredRows.map((row) => ({
            customer_id: row.data_to_clone.customer_id!,
            service_id: row.data_to_clone.service_id!,
            item_id: row.data_to_clone.item_id!,
            working_day: row.data_to_clone.working_day!,
            start_time: row.data_to_clone.start_time,
            end_time: row.data_to_clone.end_time,
            description: row.data_to_clone.description,
            daily_report_id: report.id,
            status: 'sin_recursos_asignados' as any,
            areas_service_id: row.data_to_clone.areas_service_id,
            sector_service_id: row.data_to_clone.sector_service_id,
            type_service: row.data_to_clone.type_service!,
          }));

          await createDailyReportRow(formattedRows);
        }

        // Si solo hay un reporte y se debe navegar, ir al primer reporte creado
        if (irARegistros && allReports.length > 0) {
          router.push(`/dashboard/operations/${allReports[0].id}`);
          router.refresh();
        }

        setOpen(false);
        setFechasSeleccionadas([]);
      },
      {
        loading: 'Clonando registros...',
        success: () => {
          setOpen(false);
          setFechasSeleccionadas([]);
          setLoading(false);
          return 'Registros clonados exitosamente!';
        },
        error: (error) => {
          setLoading(false);
          return error || 'Ocurrió un error al clonar los registros';
        },
      }
    );
    router.refresh();
  };

  const removeFecha = (fecha: Date) => {
    setFechasSeleccionadas((prev) => prev.filter((d) => d.toDateString() !== fecha.toDateString()));
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex items-center gap-2 ml-2">
        <Calendar className="h-4 w-4" />
        Clonar Registros
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white text-black p-0 gap-0 overflow-auto max-h-[90vh]">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl">
              Clonar registros del {moment(formattedData?.[0]?.date).format('DD/MM/YYYY')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Solo los registros mensuales se clonaran en la fecha seleccionada.
            </DialogDescription>
          </DialogHeader>

          <div className="px-8 py-4">
            {/* Aquí va el calendario y las fechas seleccionadas */}
            <div className="space-y-4">
              <div className="rounded-md border border-input bg-background p-4">
                {/* <div className="text-sm font-medium mb-2">Selecciona fechas para clonar:</div> */}
                <div className="w-full">
                  <CalendarComponent
                    mode="multiple"
                    selected={fechasSeleccionadas}
                    disabled={(date) => moment(date).isBefore(moment().subtract(1, 'days'))}
                    onSelect={(dates: Date[] | undefined) => {
                      if (!dates) return;
                      // Actualizamos todas las fechas seleccionadas
                      setFechasSeleccionadas(dates);
                    }}
                    locale={es}
                    className="w-full"
                    classNames={{
                      months: 'w-full',
                      month: 'w-full',
                      caption: 'mb-4     text-center',
                      caption_label: 'text-sm font-medium',
                      nav: 'flex gap-1',
                      nav_button: 'h-7 w-7 p-0',
                      table: 'w-full',
                      head_row: 'flex w-full justify-between',
                      head_cell: 'text-muted-foreground rounded-md w-10 font-normal text-[0.8rem] text-center',
                      row: 'flex w-full mt-2 justify-between',
                      cell: 'text-center text-sm p-0',
                      day: 'h-9 w-9 p-0 font-normal hover:bg-accent rounded-md',
                      day_selected: 'bg-primary text-primary-foreground hover:bg-primary/90',
                      day_today: 'bg-accent text-accent-foreground',
                      day_outside: 'text-muted-foreground opacity-50',
                      day_disabled: 'text-muted-foreground opacity-50',
                      day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
                      day_hidden: 'invisible',
                    }}
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

              <div className="flex items-center space-x-2 mt-2">
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
            <Button onClick={handleClonar} disabled={loading} className="">
              {loading ? 'Clonando...' : 'Clonar registros'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
