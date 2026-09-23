import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import {
  getCompanyForEdit,
  getIndustryTypes,
  hasAnyCompanyMembership,
} from '@/features/Empresa/General/actions/company.server';
import CompanyFormFields from '@/features/Empresa/General/components/CompanyFormFields';
import EditCompanyButton from '@/features/Empresa/General/components/EditCompanyButton';
import { cn } from '@/lib/utils';
import { getProvinces } from '@/shared/actions/countries.server';
import { InfoCircledIcon } from '@radix-ui/react-icons';

interface EditCompanySectionProps {
  /** Empresa a editar: llega por la ruta, o sea del caller. `getCompanyForEdit` valida el acceso. */
  companyId: string;
}

/**
 * Edición de compañía.
 *
 * El `companyId` viene de la URL (`/dashboard/company/[id]`): sin RLS, la validación de perímetro
 * es responsabilidad de `getCompanyForEdit`, que exige pertenencia + owner o permiso
 * `empresa.general.update` — el mismo criterio que `updateCompany`. Si no hay acceso no se
 * renderiza el formulario (antes la página traía la empresa filtrando por `owner_id` y, cuando no
 * coincidía, mostraba igual un formulario vacío contra ese id).
 */
export default async function EditCompanySection({ companyId }: EditCompanySectionProps) {
  const [company, hasCompany, provinces, industryTypes] = await Promise.all([
    getCompanyForEdit(companyId),
    hasAnyCompanyMembership(),
    getProvinces(),
    getIndustryTypes(),
  ]);

  if (!company) {
    return (
      <section className={cn('md:mx-7')}>
        <Card className="mt-6 p-8">
          <CardTitle className="text-2xl mb-3">Sin acceso</CardTitle>
          <CardDescription>No tenés permisos para editar esta compañía.</CardDescription>
        </Card>
      </section>
    );
  }

  return (
    <section className={cn('md:mx-7')}>
      {!hasCompany && (
        <Alert variant={'info'} className="w-fit">
          <AlertTitle className="flex justify-center items-center">
            <InfoCircledIcon className="inline size-5 mr-2 text-blue-500" />
            Editar Compañía registrada.
          </AlertTitle>
          <AlertDescription>Aquí podras editar tu compañía</AlertDescription>
        </Alert>
      )}

      <Card className="mt-6 p-8">
        <CardTitle className="text-4xl mb-3">Editar Compañía</CardTitle>
        <CardDescription>Edita este formulario con los datos que desees modificar</CardDescription>
        <div className="mt-6 rounded-xl flex w-full">
          <form>
            <CompanyFormFields provinces={provinces} industryTypes={industryTypes} company={company} />
            <EditCompanyButton companyId={company.id} />
          </form>
        </div>
      </Card>
    </section>
  );
}
