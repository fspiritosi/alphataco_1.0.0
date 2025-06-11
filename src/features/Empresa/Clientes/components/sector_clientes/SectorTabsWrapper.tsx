import { cookies } from 'next/headers';
import { fechAllCustomers, fetchAllContractorSectorBySectorIds, fetchAllSectors } from '../../actions/create';
import SectorTabs from './sectorTabs';

export default async function SectorTabsWrapper() {
  const cookiesStore = cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value;

  // Fetch data
  const customers = await fechAllCustomers();
  const contractorCompanies = customers?.filter((company) => company.company_id.toString() === actualCompany);
  const sectors = await fetchAllSectors();
  const contractorSectors = await fetchAllContractorSectorBySectorIds(sectors?.map((sector) => sector.id) || []);

  return <SectorTabs customers={contractorCompanies || []} sectors={sectors} contractorSectors={contractorSectors} />;
}
