import 'server-only';

import type { Prisma } from '@/generated/prisma/client';

export interface SupplierRecipient {
  name: string;
  email: string;
  isPrimary: boolean;
}

/** Contactos del proveedor con mail, el principal primero: los destinatarios que ofrece el dialogo. */
export async function supplierRecipients(
  tx: Pick<Prisma.TransactionClient, 'supplier_contacts'>,
  supplierId: string
): Promise<SupplierRecipient[]> {
  const contacts = await tx.supplier_contacts.findMany({
    where: { supplier_id: supplierId, email: { not: null } },
    select: { name: true, email: true, is_primary: true },
    orderBy: [{ is_primary: 'desc' }, { name: 'asc' }],
  });
  return contacts.flatMap((contact) =>
    contact.email?.trim() ? [{ name: contact.name, email: contact.email.trim().toLowerCase(), isPrimary: contact.is_primary }] : []
  );
}

/** Texto del mensaje de error cuando el mail no salio: el documento queda como estaba. */
export function mailNotSentMessage(stays: string): string {
  return `No se pudo enviar el mail. Revisá los destinatarios o probá más tarde; ${stays}.`;
}
