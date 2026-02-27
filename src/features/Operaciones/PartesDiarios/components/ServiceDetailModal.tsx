import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { IdCardIcon } from '@radix-ui/react-icons';
import Cookies from 'js-cookie';
import {
  Building2,
  Calendar,
  Clock,
  ExternalLinkIcon,
  EyeIcon,
  FileText,
  Mail,
  Phone,
  User,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { fetchDailyReportData } from '../actions/server-actions';

// Tipo inferido automáticamente del retorno de la función del servidor
type DailyReportServerData = Awaited<ReturnType<typeof fetchDailyReportData>>['rows'][0];

interface ServiceDetailModalProps {
  serviceData: DailyReportServerData;
  reportDate: string;
}

export function ServiceDetailModal({ serviceData, reportDate }: ServiceDetailModalProps) {
  if (!serviceData) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelado':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    // Manejar formato DD-MM-YYYY
    if (dateString.includes('-') && dateString.split('-')[0].length === 2) {
      const [day, month, year] = dateString.split('-');
      return new Date(`${year}-${month}-${day}`).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    // Formato estándar
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <EyeIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5" />
            Detalle del Servicio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(reportDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getStatusColor(serviceData.status) + ' capitalize'}>
                  {serviceData.status.replaceAll('_', ' ')}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {serviceData.type_service?.replaceAll('_', ' ')}
                </Badge>
              </div>
              {serviceData.preparte?.confirmed_by && (
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <span className="font-medium">Confirmado por:</span>
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                    {serviceData.preparte?.confirmed_by}
                  </Badge>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">
                  {serviceData.customers?.name || (serviceData as any).customer || 'No especificado'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{serviceData.working_day}</span>
              </div>
            </div>
          </div>

          {/* Preparte Info - Solo se muestra si existe */}
          {serviceData.preparte && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-900">Registro desde Preparte</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-amber-700">
                    <span className="font-medium">Número de Pedido:</span>
                    <Link
                      href="/dashboard/operations?tab=preparte"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        const numeroPedido = (serviceData.preparte as any).numero_pedido || 'Sin número';

                        // Setear localStorage
                        const tableFilters = {
                          columnFilters: [
                            {
                              id: 'numero_pedido',
                              value: [numeroPedido],
                              type: 'faceted',
                              title: 'numero_pedido',
                            },
                          ],
                          sorting: [],
                          pagination: {
                            pageIndex: 0,
                            pageSize: 10,
                          },
                          columnVisibility: {},
                        };
                        localStorage.setItem('table-filters-preparte-table', JSON.stringify(tableFilters));

                        // Setear cookie usando js-cookie
                        Cookies.set('preparte-table-filters', JSON.stringify(['numero_pedido']), { path: '/' });
                      }}
                    >
                      <Badge
                        variant="outline"
                        className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 cursor-pointer transition-colors"
                      >
                        {(serviceData.preparte as any).numero_pedido || 'Sin número'}
                        <ExternalLinkIcon className="h-3 w-3 ml-1 inline" />
                      </Badge>
                    </Link>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          <Separator />

          {/* Employees Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Empleados Asignados (
              {serviceData.dailyreportemployeerelations?.length ||
                (serviceData as any).employees_references?.length ||
                0}
              )
            </h3>
            <div className="grid gap-4">
              {(
                serviceData.dailyreportemployeerelations?.map((relation) => relation.employees) ||
                (serviceData as any).employees_references ||
                []
              ).map((employee: any) => {
                if (!employee) return null;
                return (
                  <div
                    key={employee.id}
                    className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-blue-900 dark:text-blue-100 text-lg mb-3">
                        <Link
                          href={`/dashboard/employee/action?action=view&employee_id=${employee.id}`}
                          className="w-fit flex items-center"
                          target="_blank"
                        >
                          {' '}
                          {employee.firstname && employee.lastname
                            ? `${employee.lastname} ${employee.firstname}`
                            : 'Nombre no disponible'}
                          <ExternalLinkIcon className="h-4 w-4 ml-2 inline " />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="space-y-1">
                            {employee.document_number && (
                              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                                <IdCardIcon className="h-4 w-4" />
                                <span>DNI: {employee.document_number}</span>
                              </div>
                            )}
                            {employee.email && (
                              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                                <Mail className="h-4 w-4" />
                                <span>{employee.email}</span>
                              </div>
                            )}
                            {/* {employee.phone && (
                            <div className="flex items-center gap-2 text-sm text-blue-700">
                              <Phone className="h-4 w-4" />
                              <span>{employee.phone}</span>
                            </div>
                          )} */}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {employee.company_positions?.name && (
                            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                              <span className="font-medium">Posición: {employee.company_positions.name}</span>
                            </div>
                          )}
                          {employee.phone && (
                            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                              <Phone className="h-4 w-4" />
                              <span>{employee.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }) || <div className="text-gray-500 text-sm">No hay empleados asignados</div>}
            </div>
          </div>

          <Separator />

          {/* Equipment Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-green-600" />
              Equipos Asignados (
              {serviceData.dailyreportequipmentrelations?.length ||
                (serviceData as any).equipment_references?.length ||
                0}
              )
            </h3>
            <div className="grid gap-4">
              {(
                serviceData.dailyreportequipmentrelations?.map((relation) => {
                  // Unificar vehículos y otros equipos en un solo objeto
                  const vehicle = relation.vehicles;
                  const otherEquip = relation.other_equipment;
                  if (vehicle) return { ...vehicle, _source: 'vehicle' as const };
                  if (otherEquip) return { ...otherEquip, _source: 'other_equipment' as const };
                  return null;
                }) ||
                (serviceData as any).equipment_references ||
                []
              ).map((equipment: any) => {
                if (!equipment) return null;
                const isOtherEquipment = equipment._source === 'other_equipment';
                return (
                  <div
                    key={equipment.id}
                    className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-green-900 dark:text-green-100 text-lg mb-3 flex items-center">
                        <Link
                          href={`/dashboard/equipment/action?action=view&id=${equipment.id}${isOtherEquipment ? '&type=other' : ''}`}
                          className="w-fit flex items-center"
                          target="_blank"
                        >
                          {' '}
                          {equipment.domain || equipment.intern_number || `Equipo ${equipment?.id?.slice(-6)}`}
                          <ExternalLinkIcon className="h-4 w-4 ml-2 inline " />
                        </Link>
                        {isOtherEquipment && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Otro Equipo
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="space-y-1">
                            {equipment.domain && (
                              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                <span className="font-medium">Dominio:</span>
                                <span className="font-mono bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded">
                                  {equipment.domain}
                                </span>
                              </div>
                            )}
                            {isOtherEquipment && equipment.serial_number && (
                              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                <span className="font-medium">N° Serie:</span>
                                <span className="font-mono bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded">
                                  {equipment.serial_number}
                                </span>
                              </div>
                            )}
                            {equipment.type?.name && (
                              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                <span className="font-medium">Tipo:</span>
                                <span>{equipment.type.name}</span>
                              </div>
                            )}
                            {equipment.year && (
                              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                <span className="font-medium">Año:</span>
                                <span>{equipment.year}</span>
                              </div>
                            )}
                            {isOtherEquipment && equipment.horometer != null && (
                              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                <span className="font-medium">Horómetro:</span>
                                <span>{equipment.horometer}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {equipment.brand_vehicles?.name && (
                            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                              <span className="font-medium">Marca:</span>
                              <Badge
                                variant={'outline'}
                                className="text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700"
                              >
                                {equipment.brand_vehicles.name}
                              </Badge>
                            </div>
                          )}
                          {equipment?.sub_type?.name && (
                            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                              <span className="font-medium">Sub-tipo:</span>
                              <span>{equipment.sub_type.name}</span>
                            </div>
                          )}
                          {equipment?.model_vehicles?.name && (
                            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                              <span className="font-medium">Modelo:</span>
                              <span>{equipment.model_vehicles.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }) || <div className="text-gray-500 text-sm">No hay equipos asignados</div>}
            </div>
          </div>

          <Separator />

          {/* Service Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Detalles del Servicio</h3>
            <div className="grid gap-3">
              <div className="bg-muted rounded-lg p-3">
                <div className="font-medium mb-1">Servicio</div>
                <div className="text-muted-foreground">
                  {serviceData.customer_services?.service_name || (serviceData as any).services || 'No especificado'}
                </div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="font-medium mb-1">Item</div>
                <div className="text-muted-foreground">
                  {serviceData.service_items?.item_name || (serviceData as any).item || 'No especificado'}
                </div>
              </div>
              {((serviceData.service_items as any)?.item_description || (serviceData as any).item_description) && (
                <div className="bg-muted rounded-lg p-3">
                  <div className="font-medium mb-1">Descripción del Item</div>
                  <div className="text-muted-foreground whitespace-pre-wrap">
                    {(serviceData.service_items as any)?.item_description || (serviceData as any).item_description}
                  </div>
                </div>
              )}
              {serviceData.description && (
                <div className="bg-muted rounded-lg p-3">
                  <div className="font-medium mb-1">Descripción</div>
                  <div className="text-muted-foreground whitespace-pre-wrap">{serviceData.description}</div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Location Info */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-muted rounded-lg p-3">
                <div className="font-medium mb-1">Sector</div>
                <div className="text-muted-foreground">
                  {serviceData.service_sectors?.sectors?.name || (serviceData as any).sector || 'No especificado'}
                </div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="font-medium mb-1">Área</div>
                <div className="text-muted-foreground">
                  {serviceData.service_areas?.areas_cliente?.descripcion_corta ||
                    (serviceData as any).area ||
                    'No especificado'}
                </div>
              </div>
            </div>
          </div>

          {/* Time Info */}
          {(serviceData.start_time || serviceData.end_time) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Horarios</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {serviceData.start_time && (
                    <div className="bg-muted rounded-lg p-3">
                      <div className="font-medium mb-1">Hora de Inicio</div>
                      <div className="text-muted-foreground">{serviceData.start_time}</div>
                    </div>
                  )}
                  {serviceData.end_time && (
                    <div className="bg-muted rounded-lg p-3">
                      <div className="font-medium mb-1">Hora de Fin</div>
                      <div className="text-muted-foreground">{serviceData.end_time}</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Additional Info */}
          {serviceData.remit_number && (
            <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
              <div className="font-mono">Número de Remito: {serviceData.remit_number}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
