import { CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CompanyForEdit } from '@/features/Empresa/General/actions/company.server';
import CityInput from '@/features/Empresa/General/components/CityInput';

interface CatalogOption {
  id: number;
  name: string;
}

interface CompanyFormFieldsProps {
  provinces: CatalogOption[];
  industryTypes: CatalogOption[];
  /** Empresa a editar; ausente en el alta. */
  company?: CompanyForEdit | null;
}

/**
 * Campos del formulario de empresa, compartidos por el alta (`/dashboard/configuration/companies/new`) y la
 * edición (`/dashboard/configuration/companies/[id]`). Sólo pinta los inputs con sus `name`: el submit lo hace
 * el botón de cada pantalla (`CreateCompanyButton` / `EditCompanyButton`), que arma el `FormData`
 * y lo valida con `parseCompanyForm`.
 */
export default function CompanyFormFields({ provinces, industryTypes, company }: CompanyFormFieldsProps) {
  return (
    <div className=" flex flex-wrap gap-8 items-center w-full">
      <div>
        <Label htmlFor="company_name">Nombre de la compañía</Label>
        <Input
          defaultValue={company?.company_name}
          id="company_name"
          name="company_name"
          className="max-w-[350px] w-[300px]"
          placeholder="nombre de la compañía"
        />
        <CardDescription id="company_name_error" className="max-w-[300px]" />
      </div>
      <div>
        <Label htmlFor="company_cuit">CUIT de la compañía</Label>
        <Input
          defaultValue={company?.company_cuit}
          name="company_cuit"
          id="company_cuit"
          className="max-w-[350px] w-[300px]"
          placeholder="CUIT de la compañía"
        />
        <CardDescription id="company_cuit_error" className="max-w-[300px]" />
      </div>
      <div>
        <Label htmlFor="website">Sitio Web</Label>
        <Input
          defaultValue={company?.website ?? ''}
          id="website"
          name="website"
          className="max-w-[350px] w-[300px]"
          placeholder="sitio web de la compañía"
        />
        <CardDescription id="website_error" className="max-w-[300px]" />
      </div>
      <div>
        <Label htmlFor="contact_email">Email</Label>
        <Input
          defaultValue={company?.contact_email}
          id="contact_email"
          name="contact_email"
          className="max-w-[350px] w-[300px]"
          placeholder="email de contacto"
        />
        <CardDescription id="contact_email_error" className="max-w-[300px]" />
      </div>
      <div>
        <Label htmlFor="contact_phone">Número de teléfono</Label>
        <Input
          defaultValue={company?.contact_phone}
          id="contact_phone"
          name="contact_phone"
          className="max-w-[350px] w-[300px]"
          placeholder="teléfono de contacto"
        />
        <CardDescription id="contact_phone_error" className="max-w-[300px]" />
      </div>
      <div>
        <Label htmlFor="address">Dirección</Label>
        <Input
          defaultValue={company?.address}
          id="address"
          name="address"
          className="max-w-[350px] w-[300px]"
          placeholder="dirección de la compañía"
        />
        <CardDescription id="address_error" className="max-w-[300px]" />
      </div>
      <div>
        <Label htmlFor="country">Seleccione un país</Label>
        <Select defaultValue={company?.country} name="country">
          <SelectTrigger id="country" name="country" className="max-w-[350px]  w-[300px]">
            <SelectValue placeholder="Seleccionar país" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="argentina">Argentina</SelectItem>
          </SelectContent>
        </Select>
        <CardDescription id="country_error" className="max-w-[300px]" />
      </div>
      <CityInput provinces={provinces} defaultProvince={company?.province} defaultCity={company?.city} />
      <div>
        <Label htmlFor="industry">Seleccione una Industria</Label>
        <Select defaultValue={company?.industry} name="industry">
          <SelectTrigger id="industry" name="industry" className="max-w-[350px] w-[300px]">
            <SelectValue id="industry" placeholder="Seleccionar Industria" />
          </SelectTrigger>
          <SelectContent>
            {industryTypes.map((ind) => (
              <SelectItem key={ind.id} value={ind.name}>
                {ind.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CardDescription id="industry_error" className="max-w-[300px]" />
      </div>
      <div>
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          defaultValue={company?.description}
          id="description"
          name="description"
          className="max-w-[350px] w-[300px]"
          placeholder="Descripción de la compañía"
        />
        <CardDescription id="description_error" className="max-w-[300px]" />
      </div>
      <div className="flex flex-row-reverse gap-2 justify-center items-center max-w-[300px] w-[300px]">
        <Label htmlFor="by_defect max-w-[300px] w-[300px]">Marcar para seleccionar Compañia por defecto</Label>
        <Checkbox id="by_defect" name="by_defect" />
      </div>
    </div>
  );
}
