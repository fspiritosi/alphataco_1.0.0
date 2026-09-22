'use client';

import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/features/Permissions';
import { useState } from 'react';
import type { CustomerRow } from '../../lib/serializers';
import { CustomerForm } from '../CustomerForm';

interface CustomerDetailTabProps {
  customer: CustomerRow;
}

/** Pestaña "Detalle": datos del cliente con edición habilitable. */
export function CustomerDetailTab({ customer }: CustomerDetailTabProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="p-6 rounded-lg border">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Información del Cliente</h3>
        <PermissionGuard module="comercial" tab="detalle-cliente" action="update">
          <Button variant="gh_orange" onClick={() => setIsEditing((prev) => !prev)}>
            {isEditing ? 'Deshabilitar edición' : 'Habilitar edición'}
          </Button>
        </PermissionGuard>
      </div>
      {/* Se remonta al cambiar de modo o cuando el servidor refresca los datos del cliente. */}
      <CustomerForm
        key={`${isEditing ? 'edit' : 'view'}-${JSON.stringify(customer)}`}
        customer={customer}
        readOnly={!isEditing}
        onSuccess={() => setIsEditing(false)}
      />
    </div>
  );
}
