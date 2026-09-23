import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { getIndustryTypes, hasAnyCompanyMembership } from '@/features/Empresa/General/actions/company.server';
import CompanyFormFields from '@/features/Empresa/General/components/CompanyFormFields';
import CreateCompanyButton from '@/features/Empresa/General/components/CreateCompanyButton';
import { cn } from '@/lib/utils';
import { getProvinces } from '@/shared/actions/countries.server';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { connection } from 'next/server';

/**
 * Alta de compañía. Todo lo que toca la base pasa por server actions de la feature: el cartel de
 * "todavía no tenés compañía" sale de `hasAnyCompanyMembership()` (profile de sesión, nunca un id
 * del cliente) y los catálogos de `getProvinces` / `getIndustryTypes`.
 *
 * `connection()` la marca como dinámica: con `cacheComponents` activo, el `Promise.all` arranca
 * los catálogos (consultas a Prisma) ANTES de que se resuelva la lectura de sesión, y el
 * prerender del build fallaba con "used `new Date()` before accessing Request data". La página
 * es de un usuario logueado: no tiene nada que prerenderizar.
 */
export default async function NewCompanySection() {
  await connection();

  const [hasCompany, provinces, industryTypes] = await Promise.all([
    hasAnyCompanyMembership(),
    getProvinces(),
    getIndustryTypes(),
  ]);

  return (
    <section className={cn('md:mx-7')}>
      {!hasCompany && (
        <Alert variant={'info'} className="w-fit">
          <AlertTitle className="flex justify-center items-center">
            <InfoCircledIcon className="inline size-5 mr-2 text-blue-500" />
            Parece que no tienes ninguna Compañía registrada.
          </AlertTitle>
          <AlertDescription>Para utilizar la aplicación debes registrar tu compañía</AlertDescription>
        </Alert>
      )}

      <Card className="mt-6 p-8">
        <CardTitle className="text-4xl mb-3">Registrar Compañía</CardTitle>
        <CardDescription>Completa este formulario con los datos de tu nueva compañia</CardDescription>
        <div className="mt-6 rounded-xl flex w-full">
          <form>
            <CompanyFormFields provinces={provinces} industryTypes={industryTypes} />
            <CreateCompanyButton />
          </form>
        </div>
      </Card>
    </section>
  );
}
