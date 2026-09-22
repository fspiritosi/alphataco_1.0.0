import { fetchCustomFormsWithAnswerCount } from '@/features/Formularios/actions/form-actions';
import FormCardContainer from './FormCardContainer';

/**
 * Listado de formularios personalizados de la empresa activa.
 * Server Component: la empresa sale de la sesión (`getActiveCompanyId`), no de la cookie.
 */
export async function FormCustomContainer({
  employees,
  documents,
  equipment,
  company,
  showAnswers,
}: {
  employees?: boolean;
  documents?: boolean;
  equipment?: boolean;
  company?: boolean;
  showAnswers?: boolean;
}) {
  const forms = await fetchCustomFormsWithAnswerCount();

  return (
    <FormCardContainer
      form={forms}
      employees={employees}
      documents={documents}
      equipment={equipment}
      company={company}
      showAnswers={showAnswers}
    />
  );
}
