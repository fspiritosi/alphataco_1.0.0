'use server';

import { Prisma } from '@/generated/prisma/client';
import { handleSupabaseError } from '@/lib/errorHandler';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server'; // P4: auth
import { prisma } from '@/shared/lib/prisma';
import { registerSchema } from '@/shared/schemas/schemas';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Registro público (`/register`): crea la credencial en Auth y su `profile`, sin empresa.
 *
 * El alta de credencial sigue en Supabase Auth (`// P4: auth`); el perfil ya va por Prisma.
 * Al ser un endpoint público se revalida el formulario en el servidor con `registerSchema`
 * (el cliente valida lo mismo, pero nadie garantiza que la llamada venga del formulario).
 * Devuelve el mensaje de error, o redirige a `/login` si salió bien.
 */
const logger = new Logger('features/Auth/register');

export async function signup(formData: FormData, url: string): Promise<string | undefined> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return parsed.error.issues[0]?.message ?? 'Datos inválidos';
  const { firstname, lastname, email, password } = parsed.data;

  const supabase = await supabaseServer(); // P4: auth
  const { error, data: user } = await supabase.auth.signUp({ // P4: auth
    email,
    password,
    options: { emailRedirectTo: url },
  });

  if (error) return error.message;

  const credentialId = user.user?.id;
  if (!credentialId) return 'No se pudo crear el usuario';

  try {
    await prisma.profile.create({
      data: {
        id: credentialId,
        credential_id: credentialId,
        email,
        role: 'User', // columna legacy: FK a roles.name
        fullname: `${firstname} ${lastname}`,
      },
    });
  } catch (createError) {
    logger.error('Error creando el perfil del usuario registrado', { data: { createError } });
    if (createError instanceof Prisma.PrismaClientKnownRequestError && createError.code === 'P2002') {
      return handleSupabaseError('User already registered');
    }
    return handleSupabaseError(createError instanceof Error ? createError.message : 'Error al crear el perfil');
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}
