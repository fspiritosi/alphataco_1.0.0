'use client';

import { CriticalityBadge } from '@/components/maintenance/criticality-badge';
import { EmptyState } from '@/components/maintenance/empty-state';
import { MaintenanceHeader } from '@/components/maintenance/maintenance-header';
import { StatusBadge } from '@/components/maintenance/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Car, ChevronRight, ClipboardList, Clock } from 'lucide-react';
import moment from 'moment';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Status =
  | 'Pendiente'
  | 'Esperando repuestos'
  | 'En reparación'
  | 'Finalizado'
  | 'Rechazado'
  | 'Cancelado'
  | 'Programado';

type Request = {
  id: string;
  created_at: string;
  state:
    | 'Pendiente'
    | 'Esperando repuestos'
    | 'En reparación'
    | 'Finalizado'
    | 'Rechazado'
    | 'Cancelado'
    | 'Programado';
  user_description: string | null;
  mechanic_description: string | null;
  user_images: string[] | null;
  mechanic_images: string[] | null;
  kilometer: string | null;
  reparation_type: {
    id: string;
    name: string;
    criticity: 'Alta' | 'Media' | 'Baja' | null;
    type_of_maintenance: string;
  };
  equipment_id: {
    id: string;
    domain: string | null;
    serie: string | null;
    intern_number: string | null;
    year: string;
    kilometer: string;
    condition: string;
    brand: { name: string } | null;
    model: { name: string } | null;
  };
};

interface RequestsListClientProps {
  equipmentId: string;
  allRequests: Request[];
}

// Función para determinar si una solicitud está completada
const isCompleted = (state: Status): boolean => {
  return state === 'Finalizado';
};

// Función para determinar si una solicitud está pendiente
const isPending = (state: Status): boolean => {
  return ['Pendiente', 'Esperando repuestos', 'En reparación', 'Programado'].includes(state);
};

export default function RequestsListClient({ equipmentId, allRequests }: RequestsListClientProps) {
  const router = useRouter();
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDetails = (request: Request) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return moment(dateStr).format('DD/MM/YYYY');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MaintenanceHeader
        title="Solicitudes de Mantenimiento"
        showBack
        backHref={`/maintenance/equipment/${equipmentId}`}
      />

      <main className="flex-1 p-4 pb-24">
        {allRequests.length > 0 ? (
          <div className="space-y-3">
            {allRequests.map((request) => {
              const completed = isCompleted(request.state);
              const pending = isPending(request.state);

              return (
                <Card
                  key={request.id}
                  className={`cursor-pointer transition-all active:scale-[0.99] ${
                    completed
                      ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20 hover:bg-green-100/70 dark:hover:bg-green-950/30'
                      : pending
                        ? 'border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20 hover:bg-orange-100/70 dark:hover:bg-orange-950/30'
                        : 'hover:bg-accent/50'
                  }`}
                  onClick={() => handleOpenDetails(request)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className={`font-semibold ${completed ? 'text-green-700 dark:text-green-400' : pending ? 'text-orange-700 dark:text-orange-400' : 'text-foreground'}`}
                          >
                            {request.reparation_type.name}
                          </h3>
                          {request.reparation_type.criticity && (
                            <CriticalityBadge
                              criticality={request.reparation_type.criticity as 'Alta' | 'Media' | 'Baja'}
                              size="sm"
                            />
                          )}
                          <StatusBadge status={request.state as Status} />
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Car className="h-3.5 w-3.5" />
                            <span>{request.equipment_id.domain || request.equipment_id.serie}</span>
                          </div>
                          <div className="text-muted-foreground">
                            {request.equipment_id.brand?.name} {request.equipment_id.model?.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(request.created_at)}</span>
                          </div>
                          {request.kilometer && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <span>{request.kilometer} km</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Clock}
            title="No hay solicitudes"
            description="Las solicitudes de mantenimiento aparecerán aquí"
          />
        )}
      </main>

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
            <DialogTitle className="text-base sm:text-lg">{selectedRequest?.reparation_type.name}</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <Tabs defaultValue="vehicle" className="w-full">
              <TabsList className="w-full rounded-none border-b bg-transparent h-auto p-0">
                <TabsTrigger
                  value="vehicle"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
                >
                  Vehículo
                </TabsTrigger>
                <TabsTrigger
                  value="repair"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
                >
                  Reparación
                </TabsTrigger>
              </TabsList>

              <TabsContent value="vehicle" className="p-4 mt-0 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Marca</p>
                    <p className="font-medium">{selectedRequest.equipment_id.brand?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Modelo</p>
                    <p className="font-medium">{selectedRequest.equipment_id.model?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Año</p>
                    <p className="font-medium">{selectedRequest.equipment_id.year}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Dominio</p>
                    <p className="font-medium">
                      {selectedRequest.equipment_id.domain || selectedRequest.equipment_id.serie || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kilometraje</p>
                    <p className="font-medium">{selectedRequest.equipment_id.kilometer} km</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Condición</p>
                    <p className="font-medium capitalize">{selectedRequest.equipment_id.condition}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="repair" className="p-4 mt-0 space-y-4 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selectedRequest.state as Status} />
                  {selectedRequest.reparation_type.criticity && (
                    <CriticalityBadge
                      criticality={selectedRequest.reparation_type.criticity as 'Alta' | 'Media' | 'Baja'}
                    />
                  )}
                </div>

                {selectedRequest.user_description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Descripción del usuario</p>
                    <p className="text-sm bg-accent/50 p-3 rounded-lg">{selectedRequest.user_description}</p>
                  </div>
                )}

                {selectedRequest.mechanic_description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Nota del mecánico</p>
                    <p className="text-sm bg-primary/10 p-3 rounded-lg">{selectedRequest.mechanic_description}</p>
                  </div>
                )}

                {selectedRequest.user_images &&
                  selectedRequest.user_images.length > 0 &&
                  selectedRequest.user_images.some((img) => img && img.trim() !== '') && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Imágenes del usuario</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {selectedRequest.user_images
                          .filter((img) => img && img.trim() !== '')
                          .map((img, i) => (
                            <div
                              key={i}
                              className="aspect-square relative rounded-lg overflow-hidden border border-border bg-muted"
                            >
                              <Image
                                src={img}
                                alt={`Imagen del usuario ${i + 1}`}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  // Si la imagen falla al cargar, ocultarla
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Imágenes del mecánico</p>
                  {selectedRequest.mechanic_images &&
                  selectedRequest.mechanic_images.length > 0 &&
                  selectedRequest.mechanic_images.some((img) => img && img.trim() !== '') ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedRequest.mechanic_images
                        .filter((img) => img && img.trim() !== '')
                        .map((img, i) => (
                          <div
                            key={i}
                            className="aspect-square relative rounded-lg overflow-hidden border border-border bg-muted"
                          >
                            <Image
                              src={img}
                              alt={`Imagen del mecánico ${i + 1}`}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                // Si la imagen falla al cargar, ocultarla
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-8 border border-dashed border-border rounded-lg bg-muted/30">
                      <div className="text-center space-y-2">
                        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <ClipboardList className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">No hay imágenes del mecánico</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          <div className="p-4 pt-0 sm:p-6 sm:pt-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
