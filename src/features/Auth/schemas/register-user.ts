import { z } from 'zod';

/**
 * Schema del alta de usuario (`registerUserWithRole`).
 *
 * Vive en un módulo SIN directiva a propósito: si el schema se definiera en un archivo
 * `'use client'`, Next entregaría el módulo como referencia de cliente y el objeto Zod no
 * existiría en el servidor (falla en runtime con `X.parse is not a function`, y `check-types` no
 * lo detecta). El formulario de cliente importa `passwordSchema` de acá; la Server Action importa
 * `registerUserSchema`.
 */
export const passwordSchema = z
  .string()
  .min(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  .max(50, { message: 'La contraseña debe tener menos de 50 caracteres.' })
  .regex(/[A-Z]/, { message: 'La contraseña debe tener al menos una mayúscula.' })
  .regex(/[a-z]/, { message: 'La contraseña debe tener al menos una minúscula.' })
  .regex(/[0-9]/, { message: 'La contraseña debe tener al menos un número.' })
  .regex(/[^A-Za-z0-9]/, { message: 'La contraseña debe tener al menos un carácter especial.' });

const optionalName = z
  .string()
  .trim()
  .max(30, { message: 'El nombre debe tener menos de 30 caracteres.' })
  .optional();

export const registerUserSchema = z
  .object({
    firstname: optionalName,
    lastname: optionalName,
    email: z.string().trim().min(1, { message: 'El email es requerido' }).email({ message: 'Email inválido' }),
    /** Vacío = invitación: el usuario se crea sin contraseña y recibe el mail para definirla. */
    password: z.string().optional(),
    /** Id de `roles`; llega como string desde el `<Select>` del formulario. */
    role: z
      .union([z.string(), z.number()])
      .transform((value) => Number(value))
      .pipe(
        z
          .number({ invalid_type_error: 'Debes seleccionar un rol.' })
          .int('Debes seleccionar un rol.')
          .positive('Debes seleccionar un rol.')
      ),
  })
  .superRefine((values, ctx) => {
    if (!values.password?.trim()) return;
    const result = passwordSchema.safeParse(values.password);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: issue.message });
      }
    }
  });

/** Lo que manda el cliente (`role` todavía es string). */
export type RegisterUserInput = z.input<typeof registerUserSchema>;
/** Lo que queda después de validar (`role` ya es number). */
export type RegisterUserValues = z.output<typeof registerUserSchema>;

/** Nombre completo para `profile.fullname`: vacío si falta alguna de las dos partes. */
export function buildFullname(values: Pick<RegisterUserValues, 'firstname' | 'lastname'>): string {
  return values.firstname && values.lastname ? `${values.firstname} ${values.lastname}`.trim() : '';
}
