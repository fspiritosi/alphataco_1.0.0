'use client';
import { Button } from '@/components/ui/button';
import { createCompany } from '@/features/Empresa/General/actions/company.server';
import { COMPANIES_QUERY_KEY } from '@/features/Empresa/General/hooks/useCompanyData';
import { getStoreCompanies } from '@/shared/actions/session.server';
import { useLoggedUserStore } from '@/shared/store/loggedUser';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { parseCompanyForm } from '../lib/company-form';
import { CompanyLogoInput } from './CompanyLogoInput';
import { showCompanyFieldErrors } from './company-field-errors';

/**
 * Botón de alta de empresa: valida el `FormData` del formulario de la página (lógica pura
 * `parseCompanyForm`) y lo manda a `createCompany`, que en el servidor resuelve el `owner_id` desde
 * la sesión, crea la pertenencia, sube el logo y —sólo si es la primera empresa del usuario— otorga
 * el rol admin de bootstrap. Al volver, deja la empresa nueva como activa en el store.
 */
export default function CreateCompanyButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
          // El listado de compañías ya no escucha realtime: se invalida su query.
          queryClient.setQueryData(COMPANIES_QUERY_KEY, { allCompanies, sharedCompanies });
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
