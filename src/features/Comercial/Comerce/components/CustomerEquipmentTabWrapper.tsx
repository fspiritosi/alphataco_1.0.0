import { Card } from '@/components/ui/card';
import { getCustomerEquipments } from '@/features/Empresa/Clientes/actions/customer-equipment.server';
import { getCustomers } from '@/features/Empresa/Clientes/actions/customers.server';
import CustomerEquipmentTab from '@/features/Empresa/Clientes/components/equipos/customerEquipmentTab';

export default async function CustomerEquipmentTabWrapper() {
  // Ambas actions ya acotan a la empresa activa.
  const [customers, equipmentsCustomers] = await Promise.all([getCustomers(), getCustomerEquipments()]);

  return (
    <Card className="p-6">
      <CustomerEquipmentTab equipments={equipmentsCustomers} customers={customers} />
    </Card>
  );
}
