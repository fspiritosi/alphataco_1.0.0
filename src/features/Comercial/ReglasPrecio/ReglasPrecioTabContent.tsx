import { Card } from '@/components/ui/card';
import {
  getContractOptionsForRules,
  getPriceUpdateRules,
} from '@/features/Empresa/Clientes/actions/price-rules.server';
import { ReglasPrecioPanel } from './components/ReglasPrecioPanel';

export default async function ReglasPrecioTabContent() {
  const [rules, contracts] = await Promise.all([getPriceUpdateRules(), getContractOptionsForRules()]);

  return (
    <Card className="p-6">
      <ReglasPrecioPanel rules={rules} contracts={contracts} />
    </Card>
  );
}
