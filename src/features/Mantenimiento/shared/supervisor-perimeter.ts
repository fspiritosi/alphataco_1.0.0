import 'server-only';

import { prisma } from '@/shared/lib/prisma';

/**
 * El supervisor elegido tiene que ser un perfil de la empresa del recurso.
 *
 * `supervisorId` es un `profile.id` que llega del cliente y termina en
 * `maintenance_requests.supervisor_id`: sin esta verificación se podía asignar la solicitud
 * a un usuario de otra empresa, que después la vería en su bandeja de aprobación.
 *
 * Se valida la pertenencia a la empresa (`share_company_users`), no el rol: el rol lo filtra
 * el selector y endurecerlo acá cambiaría quién puede ser supervisor, que es decisión del
 * flujo, no de esta migración.
 */
export async function assertSupervisorInCompany(supervisorId: string, companyId: string): Promise<void> {
  const profile = await prisma.profile.findFirst({
    where: { id: supervisorId, share_company_users: { some: { company_id: companyId } } },
    select: { id: true },
  });

  if (!profile) throw new Error('El supervisor elegido no pertenece a la empresa del equipo');
}
