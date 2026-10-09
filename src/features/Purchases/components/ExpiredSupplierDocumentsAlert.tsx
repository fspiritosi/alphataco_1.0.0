import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import moment from 'moment';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';

/** Aviso (no bloquea) de documentos del proveedor vencidos: al armar, aprobar y enviar una OC. */
export function ExpiredSupplierDocumentsAlert({
  supplierId,
  documents,
}: {
  supplierId: string;
  documents: readonly { id: string; name: string; expiresAt: string }[];
}) {
  if (documents.length === 0) return null;
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>El proveedor tiene documentos vencidos</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4">
          {documents.map((doc) => (
            <li key={doc.id}>
              {doc.name}: venció el {moment(doc.expiresAt, 'YYYY-MM-DD').format('DD/MM/YYYY')}
            </li>
          ))}
        </ul>
        <Link href={`/dashboard/purchases/suppliers/${supplierId}`} className="underline">
          Ver la ficha del proveedor
        </Link>
      </AlertDescription>
    </Alert>
  );
}
