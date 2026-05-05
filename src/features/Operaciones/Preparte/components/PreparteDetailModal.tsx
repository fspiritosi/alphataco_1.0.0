'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Calendar, Clock, EyeIcon, FileText, History, User, Wrench } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';
import Link from 'next/link';
import { useState } from 'react';
import { usePreparteChangeLogs } from '../hooks';
import { Cliente, Contrato, PreparteItem } from './PreparteManager';

interface PreparteDetailModalProps {
  preparteData: PreparteItem;
  Customers: Cliente[];
  contratos: Contrato[];
}

export function PreparteDetailModal({ preparteData, Customers, contratos }: PreparteDetailModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Solo fetchea cuando el modal está abierto
  const { data: changeLogs = [], isLoading: isLoadingChangeLogs } = usePreparteChangeLogs(preparteData?.id, isOpen);

  if (!preparteData) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pendiente':
        return 'bg-black text-white border-gray-700';
      case 'confirmado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'reprogramado':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelado':
      case 'rechazado':
      case 'vencido':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'No disponible';
    return moment.utc(dateString).locale('es').format('D [de] MMMM [de] YYYY');
  };

  // Buscar cliente por ID
  const cliente = Customers.find((c) => c.id === preparteData.cliente_id);

  // Buscar contrato por ID
  const contrato = contratos.find((c) => c.id === preparteData.contrato_id);

  // Obtener nombre del item del JOIN (service_items viene resuelto de la query)
  const getItemName = () => {
    const serviceItem = (preparteData as Record<string, unknown>).service_items as { item_name?: string } | null;
    return serviceItem?.item_name || preparteData.item || 'No especificado';
  };

  // Obtener sector
  const getSectorName = () => {
    const sectorServiceId = preparteData.sector_service_id;
    if (!sectorServiceId) return 'No especificado';

    const service = cliente?.customer_services?.find((s) => s.id === preparteData.contrato_id);
    const sectorLink = service?.service_sectors?.find(
      (ss) => ss.id === sectorServiceId || ss?.sectors?.id === sectorServiceId
    );

    if (!sectorLink?.sectors?.name) {
      const sc = cliente?.sector_customer?.find(
        (x: any) => x.id === sectorServiceId || x.sector_id === sectorServiceId
      );
      return sc?.sectors?.name || 'No especificado';
    }

    return sectorLink?.sectors?.name || 'No especificado';
  };

  // Obtener área
  const getAreaName = () => {
    const areaServiceId = preparteData.areas_service_id;
    if (!areaServiceId) return 'No especificado';

    const service = cliente?.customer_services?.find((s) => s.id === preparteData.contrato_id);
    const areaLink = service?.service_areas?.find(
      (sa) => sa.id === areaServiceId || sa?.areas_cliente?.id === areaServiceId
    );

    return areaLink?.areas_cliente?.nombre || 'No especificado';
  };

  // Obtener equipos del cliente
  const getEquiposCliente = () => {
    const value = preparteData.equipos_cliente;
    if (!value) return [];

    const equiposCatalog: Array<{ id: string; name: string; type?: string }> = cliente?.equipos_clientes || [];

    const toEquipo = (id: string) => {
      const equipo = equiposCatalog.find((e) => e.id === id);
      return equipo
        ? { name: equipo.name, type: equipo.type || 'No especificado', id }
        : { name: id, type: 'No especificado', id };
    };

    if (Array.isArray(value)) {
      return value.length ? value.map((id) => toEquipo(id)) : [];
    }

    return typeof value === 'string' ? [toEquipo(value)] : [];
  };

  // Determinar si hay motivo de cancelación, rechazo o reprogramación
  // Siempre se renderiza el banner cuando el estado lo requiere — si el motivo
  // no está cargado, se muestra "Sin motivo registrado"
  const getReason = () => {
    const data = preparteData as typeof preparteData & {
      rejected_by_profile?: { fullname?: string | null } | null;
      cancelled_by_profile?: { fullname?: string | null } | null;
      reprogrammed_by_profile?: { fullname?: string | null } | null;
    };
    const { status, cancel_reason, rejected_reason, reprogram_reason } = data;
    const fallback = 'Sin motivo registrado';

    if (status === 'cancelado') {
      return {
        title: 'Motivo de cancelación',
        content: cancel_reason?.trim() || fallback,
        actorLabel: 'Cancelado por',
        actor: data.cancelled_by_profile?.fullname?.trim() || null,
      };
    } else if (status === 'rechazado') {
      return {
        title: 'Motivo de rechazo',
        content: rejected_reason?.trim() || fallback,
        actorLabel: 'Rechazado por',
        actor: data.rejected_by_profile?.fullname?.trim() || null,
      };
    } else if (status === 'reprogramado') {
      return {
        title: 'Motivo de reprogramación',
        content: reprogram_reason?.trim() || fallback,
        actorLabel: 'Reprogramado por',
        actor: data.reprogrammed_by_profile?.fullname?.trim() || null,
      };
    } else if (status === 'vencido') {
      return {
        title: 'Vencimiento',
        content: 'Este preparte ha vencido sin ser confirmado a tiempo.',
        actorLabel: null,
        actor: null,
      };
    }

    return null;
  };

  const reason = getReason();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <EyeIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5" />
            Detalle del Preparte
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Solicitud: {preparteData.requestDate ? formatDate(preparteData.requestDate) : '-'}</span>
              </div>
              {preparteData.executionDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Ejecución: {formatDate((preparteData as any).executionDate)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getStatusColor(preparteData.status || 'pendiente')}>
                  {preparteData.status
                    ? preparteData.status.charAt(0).toUpperCase() + preparteData.status.slice(1)
                    : 'Pendiente'}
                </Badge>
                {preparteData.tipo && <Badge variant="secondary">{preparteData.tipo}</Badge>}
              </div>
              {preparteData.confirmed_by && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <span className="flex items-center gap-1">
                      <span className="text-green-600">✓</span>
                      Confirmado por: {preparteData.confirmed_by}
                    </span>
                  </Badge>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">{cliente?.name || 'Cliente no especificado'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{preparteData.jornada || 'Jornada no especificada'}</span>
              </div>
              {preparteData.numero_pedido && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>Pedido: {preparteData.numero_pedido}</span>
                </div>
              )}
            </div>
          </div>

          {/* Reason Info - Solo se muestra si existe */}
          {reason && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-900">{reason.title}</h3>
                </div>
                <div className="text-amber-700 text-sm">{reason.content}</div>
                {reason.actor && reason.actorLabel && (
                  <div className="mt-3 pt-3 border-t border-amber-200 text-amber-800 text-sm flex items-center gap-1.5">
                    <span className="font-medium">{reason.actorLabel}:</span>
                    <Link
                      href={`/dashboard/company/actualCompany?subtab=users&company-users__search=${encodeURIComponent(
                        reason.actor
                      )}`}
                      className="inline-flex items-center gap-1 text-amber-900 hover:text-amber-700 hover:underline"
                      title="Ver usuario en la tabla de usuarios"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>{reason.actor}</span>
                    </Link>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Equipos Cliente Section */}
          {getEquiposCliente().length > 0 && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  Equipos del Cliente ({getEquiposCliente().length})
                </h3>
                <div className="grid gap-4">
                  {getEquiposCliente().map((equipo, index) => (
                    <div
                      key={index}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors"
                    >
                      <div className="font-semibold text-blue-900 text-lg mb-3">
                        {equipo.name || 'Equipo sin nombre'}
                      </div>
                      <div className="text-sm text-blue-700">
                        <span className="font-medium">Tipo: </span>
                        <span>{equipo.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Service Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Detalles del Servicio</h3>
            <div className="grid gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-900 mb-1">Contrato</div>
                <div className="text-gray-700">{contrato?.service_name || 'No especificado'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-900 mb-1">Item</div>
                <div className="text-gray-700">{getItemName()}</div>
              </div>
              {preparteData.quantity && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-900 mb-1">Cantidad</div>
                  <div className="text-gray-700">{preparteData.quantity}</div>
                </div>
              )}
              {preparteData.observaciones && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-900 mb-1">Observaciones</div>
                  <div className="text-gray-700">{preparteData.observaciones}</div>
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
                <div className="text-purple-700">{getSectorName()}</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="font-medium text-purple-900 mb-1">Área</div>
                <div className="text-purple-700">{getAreaName()}</div>
              </div>
            </div>
          </div>

          {/* Time Info */}
          {(preparteData.start_time || preparteData.end_time) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Horarios</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {preparteData.start_time && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="font-medium text-gray-900 mb-1">Hora de Inicio</div>
                      <div className="text-gray-700">{preparteData.start_time}</div>
                    </div>
                  )}
                  {preparteData.end_time && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="font-medium text-gray-900 mb-1">Hora de Fin</div>
                      <div className="text-gray-700">{preparteData.end_time}</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Solicitante Info */}
          {preparteData.solicitante && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Información del Solicitante</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-900 mb-1">Nombre</div>
                  <div className="text-gray-700">{preparteData.solicitante}</div>
                </div>
              </div>
            </>
          )}

          {/* Image Preview */}
          {preparteData.preparteImage && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Imagen/Documento Adjunto</h3>
                <div className="bg-gray-50 rounded-lg p-3 flex justify-center">
                  {preparteData.preparteImage.toLowerCase().includes('.pdf') ? (
                    <iframe src={preparteData.preparteImage} className="w-full h-[300px]" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preparteData.preparteImage}
                      alt="preparte"
                      className="max-w-full max-h-[300px] object-contain"
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {/* Historial de Cambios */}
          {(isLoadingChangeLogs || changeLogs.length > 0) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-gray-600" />
                  Historial de Cambios
                </h3>
                <div className="space-y-2">
                  {isLoadingChangeLogs ? (
                    <div className="space-y-3">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    changeLogs.map((log, index) => {
                      const metadata = log.metadata as Record<string, string | number | boolean | null> | null;
                      const oldItemName = metadata?.old_item_name || log.old_value;
                      const newItemName = metadata?.new_item_name || log.new_value;
                      const changedAt = log.changed_at
                        ? moment(log.changed_at).locale('es').format('D MMM YYYY, HH:mm')
                        : 'Fecha no disponible';

                      return (
                        <div
                          key={log.id || index}
                          className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                              Cambio de {log.field_name}
                            </Badge>
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-xs text-gray-500">{changedAt}</span>
                              {log.changed_by_name && (
                                <span className="text-xs text-gray-400">por {log.changed_by_name}</span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1 text-gray-700">
                            <div>
                              <span className="font-medium">De:</span>{' '}
                              <span className="text-red-600 line-through">{String(oldItemName)}</span>
                            </div>
                            <div>
                              <span className="font-medium">A:</span>{' '}
                              <span className="text-green-600">{String(newItemName)}</span>
                            </div>
                            {log.reason && (
                              <div className="mt-2 pt-2 border-t border-amber-200">
                                <span className="font-medium">Motivo:</span> {log.reason}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
