'use client';
import { Button } from '@/components/ui/button';
import { createCompany } from '@/features/Empresa/General/actions/company.server';
import { getStoreCompanies } from '@/shared/actions/session.server';
import { useLoggedUserStore } from '@/shared/store/loggedUser';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { parseCompanyForm } from '../lib/company-form';
import { CompanyLogoInput } from './CompanyLogoInput';
import { showCompanyFieldErrors } from './company-field-errors';

/**
 * Botón de alta de empresa: valida el `FormData` del formulario de la página (lógica pura
 * `parseCompanyForm`), lo manda a `createCompany` (que sube el logo y asigna owner/rol en el
 * servidor) y deja la empresa nueva como activa en el store.
 */
export default function CreateCompanyButton() {
  const router = useRouter();
  const [logo, setLogo] = useState<File | null>(null);
  // Bloquea el boton mientras la peticion esta en curso para evitar registros duplicados
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientAction = async (formData: FormData) => {
    if (isSubmitting) return;
    const parsed = parseCompanyForm(formData);
    showCompanyFieldErrors(formData, parsed.ok ? {} : parsed.errors);
    if (!parsed.ok) return;

    if (logo) formData.set('logo', logo);
    setIsSubmitting(true);
    await toast
      .promise(
        async () => {
          const result = await createCompany(formData);
          if (!result.ok) {
            if (result.fieldErrors) showCompanyFieldErrors(formData, result.fieldErrors);
            throw new Error(result.error);
          }

          const { allCompanies, sharedCompanies } = await getStoreCompanies();
          useLoggedUserStore.setState({ allCompanies, sharedCompanies });
          const created = allCompanies.find((company) => company.id === result.data.id);
          if (created) useLoggedUserStore.getState().setActualCompany(created);
          router.push('/dashboard');
        },
        {
          loading: 'Registrando Compañía',
          success: 'Compañía Registrada',
          error: (error) => (error instanceof Error ? error.message : 'No se pudo registrar la compañía'),
        }
      )
      .unwrap()
      .catch(() => {
        // el error ya se informa en el toast
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <>
      <CompanyLogoInput onFileChange={setLogo} />
      <Button type="submit" formAction={clientAction} className="mt-5" disabled={isSubmitting}>
        {isSubmitting ? 'Registrando...' : 'Registrar Compañía'}
      </Button>
    </>
  );
}
