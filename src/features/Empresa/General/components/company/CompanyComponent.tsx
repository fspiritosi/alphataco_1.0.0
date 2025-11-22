import { Building2, Globe, Hash, Mail, MapPin, Phone, Tag } from 'lucide-react';
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

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
      <div className="mt-0.5 text-primary">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-base font-semibold text-foreground break-words">{value || '-'}</p>
      </div>
    </div>
  );
}

export default async function CompanyComponent() {
  const company = await getCompany();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InfoItem icon={<Building2 className="h-5 w-5" />} label="Razón Social" value={company?.company_name || ''} />
      <InfoItem icon={<Hash className="h-5 w-5" />} label="CUIT" value={company?.company_cuit || ''} />
      <InfoItem icon={<MapPin className="h-5 w-5" />} label="Dirección" value={company?.address || ''} />
      <InfoItem icon={<Globe className="h-5 w-5" />} label="País" value={company?.country || ''} />
      <InfoItem icon={<MapPin className="h-5 w-5" />} label="Ciudad" value={company?.cities?.name || ''} />
      <InfoItem icon={<Tag className="h-5 w-5" />} label="Industria" value={company?.industry || ''} />
      <InfoItem
        icon={<Phone className="h-5 w-5" />}
        label="Teléfono de contacto"
        value={company?.contact_phone || ''}
      />
      <InfoItem icon={<Mail className="h-5 w-5" />} label="Email de contacto" value={company?.contact_email || ''} />
    </div>
  );
}
