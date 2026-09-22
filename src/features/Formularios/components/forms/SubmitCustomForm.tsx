'use client';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import FieldRenderer from '@/features/Formularios/utils/fieldRenderer';
import { buildFormData, buildFormSchema } from '@/features/Formularios/utils/formUtils';
import { createFormAnswer } from '@/features/Formularios/actions/form-actions';
import { FormField } from '@/shared/types/legacy';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

/** Formulario personalizado a responder: el primer elemento trae el `id` de `custom_form`. */
type CustomFormInput = { id: string; form?: unknown } | null | undefined;

interface Props {
  campos: CustomFormInput[] | null;
  fetchAnswers?: () => Promise<void>;
}

export function SubmitCustomForm({ campos, fetchAnswers }: Props) {
  const formObject = buildFormData(campos, false);
  const FormSchema = buildFormSchema(formObject);
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });
  const router = useRouter();

  async function handleCustomFormSubmit(data: z.infer<typeof FormSchema>) {
    await toast
      .promise(
        async () => {
          const formId = campos?.[0]?.id;
          if (!formId) throw new Error('No se encontró el formulario a responder');
          await createFormAnswer(formId, JSON.stringify(data));
          if (fetchAnswers) await fetchAnswers();
        },
        {
          loading: 'Guardando...',
          success: () => {
            document.getElementById('close-drawer')?.click();
            return 'Respuesta guardada exitosamente';
          },
          error: (error) => {
            return error;
          },
        }
      )
      .unwrap()
      .catch(() => {
        // el error ya se informa en el toast
      });
  }

  return (
    <div className=" w-full rounded-e-xl rounded">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleCustomFormSubmit)}>
          <div className="w-full space-y-6 grid grid-cols-3 gap-x-10">
            {formObject?.map((campo: FormField, index: number) => (
              <FieldRenderer
                key={crypto.randomUUID()}
                campo={campo}
                form={form}
                index={index}
                completObjet={formObject}
              />
            ))}
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Submit
          </Button>
        </form>
      </Form>
    </div>
  );
}
