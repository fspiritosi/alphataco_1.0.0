# Forms con shadcn/ui + React Hook Form + Zod

## Principio Fundamental

**TODO formulario que recolecte datos del usuario DEBE implementarse con el componente `Form` de shadcn/ui**, usando `react-hook-form` + `zod` para validación. Esto garantiza:

- Tipado inferido automáticamente del schema (sin `:any`)
- Validaciones declarativas y mensajes de error consistentes
- UX uniforme en toda la app

**NUNCA** usar `<form>` nativo sin `react-hook-form`, ni `useState` para manejar valores de formulario.

## Regla: Consultar MCP de shadcn ANTES de implementar

**SIEMPRE** usar el MCP de shadcn para consultar la sintaxis del componente `Form` y sus sub-componentes antes de escribir cualquier formulario. Esto asegura usar la API más actualizada.

## Patrón Canónico

```typescript
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// 1. Definir el schema con Zod
const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
});

// 2. Inferir el tipo del schema — NUNCA definir el tipo manualmente
type FormValues = z.infer<typeof formSchema>;

export function MyForm() {
  // 3. Inicializar el form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  // 4. Handler de submit — recibe values ya tipados y validados
  async function onSubmit(values: FormValues) {
    await createSomething(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Nombre completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email@ejemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
        </Button>
      </form>
    </Form>
  );
}
```

## Tipado desde el Schema (NO desde el server action)

El tipo de los valores del formulario se infiere del schema de Zod, **no** del tipo de retorno de la server action:

```typescript
// ✅ CORRECTO — tipo inferido del schema Zod
const formSchema = z.object({ name: z.string(), age: z.number() });
type FormValues = z.infer<typeof formSchema>;

// ❌ INCORRECTO — tipo manual (puede desincronizarse del schema)
type FormValues = {
  name: string;
  age: number;
};
```

## Sub-componentes Disponibles

| Componente          | Uso                                                |
| ------------------- | -------------------------------------------------- |
| `<Form>`            | Wrapper raiz — recibe el spread de `form`          |
| `<FormField>`       | Conecta un campo al `control` del form             |
| `<FormItem>`        | Contenedor del campo (label + input + mensaje)     |
| `<FormLabel>`       | Label del campo                                    |
| `<FormControl>`     | Envuelve el input para conectar al estado del form |
| `<FormDescription>` | Descripcion/hint debajo del input                  |
| `<FormMessage>`     | Muestra el error de validacion del campo           |

## Validaciones Comunes con Zod

```typescript
z.object({
  // Texto obligatorio
  name: z.string().min(1, 'Requerido'),

  // Texto opcional
  description: z.string().optional(),

  // Email
  email: z.string().email('Email inválido'),

  // Número
  age: z.number().min(18, 'Debe ser mayor de edad'),

  // Número desde input de texto (siempre string en el DOM)
  amount: z.coerce.number().positive('Debe ser positivo'),

  // Enum
  status: z.enum(['active', 'inactive']),

  // Fecha
  date: z.date({ required_error: 'La fecha es requerida' }),

  // UUID (para FKs)
  employeeId: z.string().uuid('ID inválido'),

  // Booleano
  isActive: z.boolean().default(true),
});
```

## Reset y Default Values

```typescript
// Reset al valor inicial
form.reset();

// Reset con nuevos valores (ej: al editar un registro existente)
form.reset({
  name: employee.name,
  email: employee.email,
});
```

## Formularios de Edicion

Al editar un registro existente, los `defaultValues` deben provenir del dato a editar:

```typescript
const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    name: employee?.name ?? '',
    email: employee?.email ?? '',
  },
});
```

## Reglas

1. **SIEMPRE** `Form` de shadcn — nunca `<form>` nativo sin `react-hook-form`
2. **SIEMPRE** `zodResolver` para validación
3. **SIEMPRE** `z.infer<typeof formSchema>` para el tipo — nunca definir el tipo manualmente
4. **SIEMPRE** `<FormMessage />` en cada campo para mostrar errores
5. **SIEMPRE** deshabilitar el botón submit con `form.formState.isSubmitting`
6. **SIEMPRE** consultar el MCP de shadcn antes de implementar para verificar la API actual
7. **NUNCA** usar `useState` para manejar valores del formulario
8. **NUNCA** manejar validaciones con `if/else` manual — usarlas en el schema Zod
