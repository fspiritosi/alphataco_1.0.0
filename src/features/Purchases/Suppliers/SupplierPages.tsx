import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getUserPermissionsMapServer } from '@/features/Permissions';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  getSupplierDocumentNameSuggestions,
  getSupplierFormLookups,
  type SupplierDetail,
} from '../actions/suppliers.server';
import { formatCuit } from '../lib/supplier-ids';
import { emptySupplierContact, type SupplierFormValues } from '../schemas/suppliers';
import { SupplierDocuments } from './components/SupplierDocuments';
import { SupplierForm } from './components/SupplierForm';
import { SupplierStatusActions } from './components/SupplierStatusActions';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/dashboard/purchases?tab=proveedores">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Proveedores
        </Link>
      </Button>
      {children}
    </div>
  );
}

const EMPTY: SupplierFormValues = {
  name: '',
  tradeName: '',
  cuit: '',
  vatConditionId: '',
  street: '',
  city: '',
  province: '',
  postalCode: '',
  paymentTermDays: '',
  bankCbu: '',
  bankAlias: '',
  notes: '',
  contacts: [emptySupplierContact(true)],
  categoryIds: [],
};

export async function NewSupplierPage() {
  const { categories } = await getSupplierFormLookups();
  return (
    <Shell>
      <h1 className="text-2xl font-semibold">Nuevo proveedor</h1>
      <SupplierForm supplierId={null} defaultValues={EMPTY} categories={categories} />
    </Shell>
  );
}

export async function SupplierDetailPage({ supplier }: { supplier: SupplierDetail }) {
  const [{ categories }, nameSuggestions, permissions] = await Promise.all([
    getSupplierFormLookups(),
    getSupplierDocumentNameSuggestions(),
    getUserPermissionsMapServer(),
  ]);
  const canUpdate = permissions['compras:proveedores:update'] === true;
  const canDelete = permissions['compras:proveedores:delete'] === true;
  const nullable = (v: string | number | null) => (v === null ? '' : String(v));

  const defaultValues: SupplierFormValues = {
    name: supplier.name,
    tradeName: nullable(supplier.trade_name),
    cuit: formatCuit(supplier.cuit),
    vatConditionId: String(supplier.vat_condition_id),
    street: nullable(supplier.street),
    city: nullable(supplier.city),
    province: nullable(supplier.province),
    postalCode: nullable(supplier.postal_code),
    paymentTermDays: nullable(supplier.payment_term_days),
    bankCbu: nullable(supplier.bank_cbu),
    bankAlias: nullable(supplier.bank_alias),
    notes: nullable(supplier.notes),
    contacts: supplier.contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email ?? '',
      phone: c.phone ?? '',
      role: c.role ?? '',
      isPrimary: c.is_primary,
    })),
    categoryIds: supplier.categories.map((c) => c.id),
  };
  // Los rubros inactivos que el proveedor ya tiene se siguen mostrando (no se ofrecen a otros).
  const categoryOptions = [
    ...categories,
    ...supplier.categories.filter((c) => !categories.some((active) => active.id === c.id)),
  ];

  return (
    <Shell>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{supplier.name}</h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            CUIT {formatCuit(supplier.cuit)}
            {supplier.trade_name ? ` · ${supplier.trade_name}` : ''}
          </p>
        </div>
        {!supplier.is_active && <Badge variant="outline">Inactivo</Badge>}
        <div className="ml-auto">
          <SupplierStatusActions
            supplierId={supplier.id}
            name={supplier.name}
            isActive={supplier.is_active}
            canDelete={canDelete}
            canUpdate={canUpdate}
          />
        </div>
      </div>
      {/* `key`: tras guardar, el form se remonta con los datos frescos (ids de contactos nuevos). */}
      <SupplierForm
        key={supplier.updatedAt}
        supplierId={supplier.id}
        defaultValues={defaultValues}
        categories={categoryOptions}
        readOnly={!canUpdate}
      />
      <SupplierDocuments
        supplierId={supplier.id}
        documents={supplier.documents}
        nameSuggestions={nameSuggestions}
        canUpdate={canUpdate}
      />
    </Shell>
  );
}
