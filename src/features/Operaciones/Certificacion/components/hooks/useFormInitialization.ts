import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type DefaultValues } from 'react-hook-form';
import type { z } from 'zod';
import type { DailyReportRowFormValues } from '../form-types';

type UseFormInitializationProps = {
  /** El schema cambia entre alta y edición (`useFormSchema`), por eso no se infiere el tipo de él. */
  schema: z.ZodSchema;
  defaultValues: DefaultValues<DailyReportRowFormValues>;
};

export function useFormInitialization({ schema, defaultValues }: UseFormInitializationProps) {
  const form = useForm<DailyReportRowFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return form;
}
