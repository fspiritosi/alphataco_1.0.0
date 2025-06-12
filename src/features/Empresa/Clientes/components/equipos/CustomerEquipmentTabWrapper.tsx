import { cookies } from 'next/headers';
import { fechAllCustomers, fetchEquipmentsCustomers } from '../../actions/create';
import CustomerEquipmentTab from './customerEquipmentTab';

export default async function CustomerEquipmentTabWrapper() {
  const cookiesStore = cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value;

  // Fetch data
  const customers = await fechAllCustomers();
  const contractorCompanies = customers?.filter((company) => company.company_id.toString() === actualCompany);
  const equipmentsCustomers = await fetchEquipmentsCustomers();

  return (
    <CustomerEquipmentTab
      equipments={equipmentsCustomers || []}
      customers={contractorCompanies || []}
      key={actualCompany}
    />
  );
}
