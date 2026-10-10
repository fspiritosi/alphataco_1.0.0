import { checkPermissionServer } from '@/features/Permissions';
import { NewSupplierPage } from '@/features/Purchases/Suppliers/SupplierPages';
import { notFound } from 'next/navigation';

export const metadata = { title: 'Nuevo proveedor | Compras' };

export default async function NewSupplierRoute() {
  if (!(await checkPermissionServer('compras', 'proveedores', 'create'))) notFound();
  return <NewSupplierPage />;
}
