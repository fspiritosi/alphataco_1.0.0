import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import type { DocumentTypeInfo } from '@/features/Documentacion/DetalleDocumento/actions/document-detail.server';
import { expiryLabel, uploadedAtLabel } from '@/features/Documentacion/DetalleDocumento/lib/document-detail';

interface DocumentTypeCardProps {
  documentType: DocumentTypeInfo | null;
  /** Los documentos de empresa no tienen recurso, por eso no muestran "multirecurso". */
  isCompanyDocument: boolean;
  validity: Date | string | null;
  createdAt: Date | string | null;
  period: string | null;
}

/** Tab "Documento" del detalle: datos del tipo de documento y del archivo cargado. */
export function DocumentTypeCard({
  documentType,
  isCompanyDocument,
  validity,
  createdAt,
  period,
}: DocumentTypeCardProps) {
  return (
    <Card>
      <div className="p-3">
        <CardTitle className="pb-3">
          {isCompanyDocument ? 'Datos del documento de empresa' : 'Datos del documento que se le solicita al empleado'}
        </CardTitle>

        <Table>
          <TableHeader>
            <TableRow>
              <TableCell>
                <CardTitle className="pb-3">{documentType?.name}</CardTitle>
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <CardDescription>{documentType?.mandatory ? 'Es mandatorio' : 'No es mandatorio'}</CardDescription>
              </TableCell>
            </TableRow>
            {!isCompanyDocument && (
              <TableRow>
                <TableCell>
                  <CardDescription>
                    {documentType?.multiresource ? 'Es multirecurso' : 'No es multirecurso'}
                  </CardDescription>
                </TableCell>
              </TableRow>
            )}
            <TableRow>
              <TableCell>
                <CardDescription>{expiryLabel(documentType?.explired, validity)}</CardDescription>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <CardDescription>Documento aplica a {documentType?.applies}</CardDescription>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <CardDescription>{uploadedAtLabel(createdAt)}</CardDescription>
              </TableCell>
            </TableRow>
            {period && (
              <TableRow>
                <TableCell>
                  <CardDescription>
                    <span className="font-bold">Período:</span> {period}
                  </CardDescription>
                </TableCell>
              </TableRow>
            )}
            {documentType?.special && (
              <TableRow>
                <TableCell>
                  <CardDescription>
                    Este documento tiene consideraciones especiales a tener en cuenta ({documentType.description})
                  </CardDescription>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
