import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import type { DocumentVehicle } from '@/features/Documentacion/DetalleDocumento/actions/document-detail.server';
import { equipmentDisplayName, shortDate } from '@/features/Documentacion/DetalleDocumento/lib/document-detail';

/** Tab "Equipo" del detalle de documento. */
export function EquipmentInfoCard({ vehicle }: { vehicle: DocumentVehicle }) {
  return (
    <Card>
      <div className="p-3">
        <div className="space-y-3">
          <CardDescription>Datos del equipo al que se le solicita el documento</CardDescription>
          <div className="flex items-center gap-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="size-24">
                      <AvatarImage
                        src={vehicle.picture ?? undefined}
                        className="rounded-full object-cover"
                        alt="Imagen del recurso"
                      />
                      <AvatarFallback>recurso</AvatarFallback>
                    </Avatar>
                    <CardTitle className="font-bold text-lg">{equipmentDisplayName(vehicle)}</CardTitle>
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">Dominio:</span> {vehicle.domain}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">Numero interno:</span> {vehicle.intern_number}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">Marca:</span> {vehicle.brand?.name}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">Modelo:</span> {vehicle.model?.name}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">Fecha de alta:</span> {shortDate(vehicle.created_at)}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">Motor:</span> {vehicle.engine}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">Chasis:</span> {vehicle.chassis}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">Tipo de vehiculo:</span> {vehicle.type_of_vehicle?.name}
                    </CardDescription>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </Card>
  );
}
