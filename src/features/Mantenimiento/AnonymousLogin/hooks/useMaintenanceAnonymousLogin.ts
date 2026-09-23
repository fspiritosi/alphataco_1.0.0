'use client';

import {
  completeMaintenanceEmployeeAnonymousSession,
  setActiveCompanyForEquipment,
} from '@/features/Mantenimiento/actions/maintenance-actions';
import { handleSupabaseError } from '@/lib/errorHandler';
import { supabaseBrowser } from '@/lib/supabase/browser'; // P4: auth
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { CredentialsValues, MaintenanceLoginType } from '../utils/login-schemas';

/**
 * Login del QR de mantenimiento.
 *
 * Dos caminos: el invitado entra con email y contraseña, el empleado con una sesión anónima
 * validada contra su CUIL. En los dos casos la empresa activa la fija el SERVIDOR desde el
 * equipo escaneado o desde el legajo — el cliente ya no escribe la cookie `actualComp`.
 *
 * El contacto con Supabase Auth es lo único que queda acá (P4 lo reemplaza).
 */
export function useMaintenanceAnonymousLogin(equipmentId: string | null) {
  const router = useRouter();
  const supabase = supabaseBrowser(); // P4: auth

  // Si se llega al QR con una sesión de dashboard abierta, se cierra: el flujo de
  // mantenimiento corre siempre con la sesión del operario o del invitado.
  useEffect(() => {
    const clearDashboardSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser(); // P4: auth
      if (user && !user.is_anonymous) {
        await supabase.auth.signOut(); // P4: auth
      }
    };
    clearDashboardSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(loginType: MaintenanceLoginType, { cuil, email, password }: CredentialsValues) {
    await toast
      .promise(
        async () => {
          if (!equipmentId) {
            throw new Error('No se ha seleccionado un equipo. Por favor, seleccione un equipo primero.');
          }

          if (loginType === 'invitado' && email && password) {
            const { error } = await supabase.auth.signInWithPassword({ email, password }); // P4: auth
            if (error) {
              throw new Error(handleSupabaseError(error.message));
            }
            // La empresa activa sale del equipo escaneado y la cookie la escribe el servidor.
            await setActiveCompanyForEquipment(equipmentId);
          } else {
            const { error: anonError } = await supabase.auth.signInAnonymously(); // P4: auth
            if (anonError) {
              throw new Error(handleSupabaseError(anonError.message));
            }

            // Valida el CUIL contra el legajo y fija la empresa activa server-side.
            const res = await completeMaintenanceEmployeeAnonymousSession({
              cuil: cuil || '',
              equipmentId,
            });
            if (!res.ok) {
              throw new Error(res.error);
            }
          }

          router.push(`/maintenance/equipment/${equipmentId}`);
        },
        {
          loading: 'Iniciando sesión...',
          success: 'Sesión iniciada correctamente.',
          error: (error) => error,
        }
      )
      .unwrap()
      .catch(() => {
        // el error ya se informa en el toast
      });
  }

  return { login };
}
