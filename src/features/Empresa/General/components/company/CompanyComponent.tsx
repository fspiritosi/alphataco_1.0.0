import { ItemCompany } from '@/app/dashboard/company/actualCompany/components/itemCompany';
import { getCompany } from '../../actions/actions';

interface Company {
  id: string;
  company_name: string;
  description: string;
  website?: string | null;
  contact_email: string;
  contact_phone: string;
  address: string;
  city: number;
  country: string;
  industry: string;
  company_logo: string | null;
  is_active: boolean;
  company_cuit: string;
  province_id: number | null;
  owner_id: string | null;
  by_defect: boolean | null;
  cities: { name: string };
}
[];

export default async function CompanyComponent() {
  const company = await getCompany();

  return (
    <div>
      <div>
        <ItemCompany name="Razón Social" info={company?.company_name || ''} />
        <ItemCompany name="CUIT" info={company?.company_cuit || ''} />
        <ItemCompany name="Dirección" info={company?.address || ''} />
        <ItemCompany name="Pais" info={company?.country || ''} />
        <ItemCompany name="Ciudad" info={company?.cities?.name || ''} />
        <ItemCompany name="Industria" info={company?.industry || ''} />
        <ItemCompany name="Teléfono de contacto" info={company?.contact_phone || ''} />
        <ItemCompany name="Email de contacto" info={company?.contact_email || ''} />
      </div>
    </div>
  );
}
