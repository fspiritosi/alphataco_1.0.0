import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import type { DocumentEmployee } from '@/features/Documentacion/DetalleDocumento/actions/document-detail.server';
import {
  employeeAddress,
  employeeDisplayName,
  formatCuit,
  shortDate,
} from '@/features/Documentacion/DetalleDocumento/lib/document-detail';

/** Tab "Empleado" del detalle de documento. */
export function EmployeeInfoCard({ employee }: { employee: DocumentEmployee }) {
  const affectations = employee.contractor_employee
    .map((link) => link.customers?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <Card>
      <div className="p-3">
        <div className="space-y-3">
          <CardDescription>Datos del empleado al que se le solicita el documento</CardDescription>
          <div className="flex items-center gap-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="size-24">
                      <AvatarImage
                        src={employee.picture ?? undefined}
                        className="rounded-full object-cover"
                        alt="Imagen del recurso"
                      />
                      <AvatarFallback>recurso</AvatarFallback>
                    </Avatar>
                    <CardTitle className="font-bold text-lg">{employeeDisplayName(employee)}</CardTitle>
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">DNI:</span> {employee.document_number}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">CUIL:</span> {formatCuit(employee.cuil)}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">Dirección:</span> {employeeAddress(employee)}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">Provincia:</span> {employee.province?.name}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">Teléfono de contacto:</span> {employee.phone}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">Email de contacto:</span> {employee.email}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">Fecha de alta:</span> {shortDate(employee.created_at)}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div>
                      <CardDescription>
                        <span className="font-bold">Afectaciones:</span>
                      </CardDescription>
                      <ul>
                        <CardDescription>
                          {affectations.map((name) => (
                            <li key={name}>{name}</li>
                          ))}
                        </CardDescription>
                      </ul>
                    </div>
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
