import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { IdCardIcon } from '@radix-ui/react-icons';
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
              <div className="flex items-center gap-2 text-sm text-gray-600">
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
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">{serviceData.customers?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
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
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                      {(serviceData.preparte as any).numero_pedido || 'Sin número'}
                    </Badge>
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
              Empleados Asignados ({serviceData.dailyreportemployeerelations?.length || 0})
            </h3>
            <div className="grid gap-4">
              {serviceData.dailyreportemployeerelations?.map((relation) => {
                const employee = relation.employees;
                if (!employee) return null;
                return (
                  <div
                    key={employee.id}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-blue-900 text-lg mb-3">
                        <Link href={`/empleados/${employee.id}`} className="w-fit flex items-center" target="_blank">
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
                              <div className="flex items-center gap-2 text-sm text-blue-700">
                                <IdCardIcon className="h-4 w-4" />
                                <span>DNI: {employee.document_number}</span>
                              </div>
                            )}
                            {employee.email && (
                              <div className="flex items-center gap-2 text-sm text-blue-700">
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
                            <div className="flex items-center gap-2 text-sm text-blue-700">
                              <span className="font-medium">Posición: {employee.company_positions.name}</span>
                            </div>
                          )}
                          {employee.phone && (
                            <div className="flex items-center gap-2 text-sm text-blue-700">
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
              Equipos Asignados ({serviceData.dailyreportequipmentrelations?.length || 0})
            </h3>
            <div className="grid gap-4">
              {serviceData.dailyreportequipmentrelations?.map((relation) => {
                const equipment = relation.vehicles;
                if (!equipment) return null;
                return (
                  <div
                    key={relation.id}
                    className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-green-900 text-lg mb-3 flex items-center">
                        <Link href={`/equipos/${equipment.id}`} className="w-fit flex items-center" target="_blank">
                          {' '}
                          {equipment.domain || equipment.intern_number || `Equipo ${equipment?.id?.slice(-6)}`}
                          <ExternalLinkIcon className="h-4 w-4 ml-2 inline " />
                        </Link>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="space-y-1">
                            {equipment.domain && (
                              <div className="flex items-center gap-2 text-sm text-green-700">
                                <span className="font-medium">Dominio:</span>
                                <span className="font-mono bg-green-100 px-2 py-1 rounded">{equipment.domain}</span>
                              </div>
                            )}
                            {equipment.type?.name && (
                              <div className="flex items-center gap-2 text-sm text-green-700">
                                <span className="font-medium">Tipo:</span>
                                <span>{equipment.type.name}</span>
                              </div>
                            )}
                            {equipment.year && (
                              <div className="flex items-center gap-2 text-sm text-green-700">
                                <span className="font-medium">Año:</span>
                                <span>{equipment.year}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {equipment.brand_vehicles?.name && (
                            <div className="flex items-center gap-2 text-sm text-green-700">
                              <span className="font-medium">Marca:</span>
                              <Badge variant={'outline'} className="text-xs bg-green-100 text-green-800">
                                {equipment.brand_vehicles.name}
                              </Badge>
                            </div>
                          )}
                          {/* {equipment.contractor_equipment && equipment.contractor_equipment.length > 0 && (
                          <div className="space-y-1 space-x-1">
                            <div className="text-xs text-green-600 font-medium">Clientes asignados:</div>
                            {equipment.contractor_equipment.map((contract, index) => (
                              <Badge key={index} variant="outline" className="text-xs bg-green-100 text-green-800">
                                {contract.customers?.name || 'N/A'}
                              </Badge>
                            ))}
                          </div>
                        )} */}
                          <div className="flex items-center gap-2 text-sm text-green-700">
                            <span className="font-medium">Sub-tipo:</span>
                            <span>{equipment?.sub_type?.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-green-700">
                            <span className="font-medium">Modelo:</span>
                            <span>{equipment?.model_vehicles?.name}</span>
                          </div>
                          {/* {equipment?.sub_type?.name && (
                          <div className="space-y-1 space-x-1">
                            <span className="text-xs text-green-600 font-medium">Sub-Tipo:</span>
                            <Badge variant={'outline'} className="text-xs bg-green-100 text-green-800">
                              {equipment?.sub_type?.name}
                            </Badge>
                          </div>
                        )} */}
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
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-900 mb-1">Servicio</div>
                <div className="text-gray-700">{serviceData.customer_services?.service_name}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-900 mb-1">Item</div>
                <div className="text-gray-700">{serviceData.service_items?.item_name}</div>
              </div>
              {serviceData.description && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-900 mb-1">Descripción</div>
                  <div className="text-gray-700">{serviceData.description}</div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Location Info */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="font-medium text-purple-900 mb-1">Sector</div>
                <div className="text-purple-700">{serviceData.service_sectors?.sectors?.name}</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="font-medium text-purple-900 mb-1">Área</div>
                <div className="text-purple-700">{serviceData.service_areas?.areas_cliente?.descripcion_corta}</div>
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
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="font-medium text-gray-900 mb-1">Hora de Inicio</div>
                      <div className="text-gray-700">{serviceData.start_time}</div>
                    </div>
                  )}
                  {serviceData.end_time && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="font-medium text-gray-900 mb-1">Hora de Fin</div>
                      <div className="text-gray-700">{serviceData.end_time}</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Additional Info */}
          {serviceData.remit_number && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <div className="font-mono">Número de Remito: {serviceData.remit_number}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
