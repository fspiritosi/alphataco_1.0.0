import { cookies } from 'next/headers';
import { getCompany } from '../../actions/actions';
import CompanyComponent from './CompanyComponent';

export default async function CompanyComponentWrapper() {
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  const companyData = await getCompany();

  return <CompanyComponent company={companyData[0] as any} />;
}
