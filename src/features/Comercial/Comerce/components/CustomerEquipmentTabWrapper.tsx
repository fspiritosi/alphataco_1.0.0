import { Card } from '@/components/ui/card';
import { cookies } from 'next/headers';
import { fechAllCustomers, fetchEquipmentsCustomers } from '../../../Empresa/Clientes/actions/create';
import CustomerEquipmentTab from '../../../Empresa/Clientes/components/equipos/customerEquipmentTab';

export default async function CustomerEquipmentTabWrapper() {
  const cookiesStore = await cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value;

  // Fetch data
  const customers = await fechAllCustomers();
  const contractorCompanies = customers?.filter((company) => company.company_id.toString() === actualCompany);
  const equipmentsCustomers = await fetchEquipmentsCustomers();

  return (
    <Card className="p-6">
      <CustomerEquipmentTab
        equipments={equipmentsCustomers || []}
        customers={contractorCompanies || []}
        key={actualCompany}
      />
    </Card>
  );
}
