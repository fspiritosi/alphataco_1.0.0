import { Card } from '@/components/ui/card';
import { cookies } from 'next/headers';
import {
  fechAllCustomers,
  fetchAllContractorSectorBySectorIds,
  fetchAllSectors,
} from '../../../Empresa/Clientes/actions/create';
import SectorTabs from '../../../Empresa/Clientes/components/sector_clientes/sectorTabs';

export default async function SectorTabsWrapper() {
  const cookiesStore = cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value;

  // Fetch data
  const customers = await fechAllCustomers();
  const contractorCompanies = customers?.filter((company) => company.company_id.toString() === actualCompany);
  const sectors = await fetchAllSectors();
  const contractorSectors = await fetchAllContractorSectorBySectorIds(sectors?.map((sector) => sector.id) || []);

  return (
    <Card className="p-6">
      <SectorTabs customers={contractorCompanies || []} sectors={sectors} contractorSectors={contractorSectors} />
    </Card>
  );
}
