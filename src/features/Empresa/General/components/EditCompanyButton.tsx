'use client';
import { Button } from '@/components/ui/button';
import { updateCompany } from '@/features/Empresa/General/actions/company.server';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { parseCompanyForm } from '../lib/company-form';
import { CompanyLogoInput } from './CompanyLogoInput';
import { showCompanyFieldErrors } from './company-field-errors';

interface EditCompanyButtonProps {
  /** Empresa que se edita (la página la resuelve por ruta; el servidor valida la pertenencia). */
  companyId: string;
}

/**
 * Botón de edición de empresa: valida el `FormData` de la página y lo manda a `updateCompany`.
 * Si se eligió un logo nuevo viaja como `logo` y el servidor lo reemplaza junto con los datos
 * (antes, elegir un logo hacía que el resto del formulario NO se guardara).
 */
export default function EditCompanyButton({ companyId }: EditCompanyButtonProps) {
  const router = useRouter();
  const [logo, setLogo] = useState<File | null>(null);
  // Bloquea el boton mientras la peticion esta en curso para evitar ediciones duplicadas
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
          const result = await updateCompany(companyId, formData);
          if (!result.ok) {
            if (result.fieldErrors) showCompanyFieldErrors(formData, result.fieldErrors);
            throw new Error(result.error);
          }
          router.refresh();
        },
        {
          loading: 'Actualizando Compañía',
          success: 'Actualización exitosa, algunos cambios pueden tardar unos minutos en reflejarse',
          error: (error) => (error instanceof Error ? error.message : 'No se pudo actualizar la compañía'),
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
        {isSubmitting ? 'Guardando...' : 'Editar Compañía'}
      </Button>
    </>
  );
}
