'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/features/Permissions';
import { Suspense, useState } from 'react';
import EquipmentByOwnerTableWrapper from './EquipmentByOwnerTableWrapper';
import EquipmentOwnerForm from './EquipmentOwnerForm';
import EquipmentOwnerTable from './EquipmentOwnerTable';
import { FetchEquipmentByOwnerIdType, FetchEquipmentOwnersType, fetchEquipmentByOwnerId } from './actions/actions';

interface TitularesProps {
  equipmentOwners: FetchEquipmentOwnersType;
}
function EquipmentTitulares({ equipmentOwners }: TitularesProps) {
  // Estado para el titular que se está editando
  const [editingOwner, setEditingOwner] = useState<FetchEquipmentOwnersType[0] | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<FetchEquipmentByOwnerIdType | null>(null);

  const handleViewEquipment = async (owner: FetchEquipmentOwnersType[0]) => {
    const data = await fetchEquipmentByOwnerId(owner.id);
    setSelectedOwner(data);
  };

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('empresa', 'titulares', 'create');
  const canUpdate = hasPermission('empresa', 'titulares', 'update');
  const showForm = canCreate || canUpdate;

  return (
    <div>
      {selectedOwner ? (
        <Card>
          {selectedOwner.length > 0 ? (
            <>
              <CardHeader className="flex justify-between">
                <div>
                  <CardTitle>Equipos por Titular</CardTitle>
                  <CardDescription>
                    {selectedOwner
                      ? `Mostrando equipos de: ${selectedOwner?.[0].equipment_owners?.name}`
                      : 'Selecciona un titular para ver sus equipos'}
                  </CardDescription>
                </div>
                <div>
                  <Button
                    className="w-fit"
                    onClick={() => {
                      setSelectedOwner(null);
                    }}
                  >
                    Cerrar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedOwner ? (
                  <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
                    <EquipmentByOwnerTableWrapper selectedOwner={selectedOwner} />
                  </Suspense>
                ) : (
                  <div className="text-center text-muted-foreground p-8">
                    <p>Selecciona un titular de la tabla superior para ver sus equipos asociados.</p>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>No hay vehículos</CardTitle>
                <CardDescription>Este titular no tiene vehículos asociados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                  <p>No se encontraron vehículos registrados para este titular.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setSelectedOwner(null)}>
                    Volver
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      ) : showForm ? (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={35}>
            <EquipmentOwnerForm
              initialData={editingOwner}
              onReset={() => setEditingOwner(null)}
              isEditing={!!editingOwner}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={65} className="ml-4">
            <EquipmentOwnerTable
              onViewEquipment={handleViewEquipment}
              equipmentOwners={equipmentOwners}
              onEdit={setEditingOwner}
              canEdit={canUpdate}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <EquipmentOwnerTable
          onViewEquipment={handleViewEquipment}
          equipmentOwners={equipmentOwners}
          onEdit={setEditingOwner}
          canEdit={canUpdate}
        />
      )}
    </div>
  );
}

export default EquipmentTitulares;
