'use client';

import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CATEGORIES, type CategorySlug } from '../constants/categories';
import { useCreateTicket } from '../hooks/useCreateTicket';

const formSchema = z.object({
  category: z.enum([
    'dashboard',
    'empresa',
    'empleados',
    'equipos',
    'comercial',
    'documentacion',
    'operaciones',
    'mantenimiento',
    'formularios',
    'otro',
  ]),
  title: z
    .string()
    .trim()
    .min(3, 'Mínimo 3 caracteres')
    .max(200, 'Máximo 200 caracteres'),
  description: z
    .string()
    .trim()
    .min(10, 'Contanos un poco más (mínimo 10 caracteres)')
    .max(5000, 'Máximo 5000 caracteres'),
});

type FormValues = z.infer<typeof formSchema>;

export function TicketForm() {
  const mutation = useCreateTicket();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: 'otro' as CategorySlug,
      title: '',
      description: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await mutation.mutateAsync(values);
      toast.success('Tu reporte fue enviado. Te avisaremos cuando haya novedades.');
      form.reset({ category: values.category, title: '', description: '' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos enviar tu reporte');
    }
  }

  const isSubmitting = form.formState.isSubmitting || mutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>Reportar un problema</CardTitle>
          <CardDescription>Contanos qué pasó y vamos a ocuparnos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegí una categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORIES.map((c) => {
                      const Icon = c.icon;
                      return (
                        <SelectItem key={c.slug} value={c.slug}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {c.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asunto</FormLabel>
                <FormControl>
                  <Input placeholder="Resumí en una línea qué te pasa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    rows={6}
                    placeholder="Pasos para reproducir, qué esperabas vs qué pasó…"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Enviando…' : 'Enviar reporte'}
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}
