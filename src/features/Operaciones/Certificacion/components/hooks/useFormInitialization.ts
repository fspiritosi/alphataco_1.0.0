import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

type UseFormInitializationProps = {
  schema: z.ZodSchema;
  defaultValues: any;
};

export function useFormInitialization({ schema, defaultValues }: UseFormInitializationProps) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return form;
}
