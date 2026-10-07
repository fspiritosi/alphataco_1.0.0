import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, FilePlus2, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

const NEW_INVOICE_PATH = '/dashboard/comercial/facturacion/nueva';

/**
 * "Nueva factura": dos orígenes, cada uno un link real (abre en otra pestaña con Ctrl/clic medio).
 * Solo con permiso de crear (`comercial:facturacion:create`); sin él no se dibuja nada.
 */
export function NewInvoiceMenu({ canCreate }: { canCreate: boolean }) {
  if (!canCreate) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="brand" className="shrink-0">
          Nueva factura
          <ChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`${NEW_INVOICE_PATH}?origen=certificaciones`} className="flex items-start gap-2">
              <FileSpreadsheet className="mt-0.5" aria-hidden />
              <span className="flex flex-col">
                <span>Desde certificaciones</span>
                <span className="text-muted-foreground text-xs">Certificaciones confirmadas de un cliente</span>
              </span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${NEW_INVOICE_PATH}?origen=manual`} className="flex items-start gap-2">
              <FilePlus2 className="mt-0.5" aria-hidden />
              <span className="flex flex-col">
                <span>Factura manual</span>
                <span className="text-muted-foreground text-xs">Líneas cargadas a mano</span>
              </span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
