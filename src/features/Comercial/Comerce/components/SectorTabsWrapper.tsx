import { Card } from '@/components/ui/card';
import { getCustomers } from '@/features/Empresa/Clientes/actions/customers.server';
import { getSectorCustomers } from '@/features/Empresa/Clientes/actions/sectors.server';
import SectorTabs from '@/features/Empresa/Clientes/components/sector_clientes/sectorTabs';

export default async function SectorTabsWrapper() {
  const [customers, contractorSectors] = await Promise.all([getCustomers(), getSectorCustomers()]);

  return (
    <Card className="p-6">
      <SectorTabs customers={customers} contractorSectors={contractorSectors} />
    </Card>
  );
}
