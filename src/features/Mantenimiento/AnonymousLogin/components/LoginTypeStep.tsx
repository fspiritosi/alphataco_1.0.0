'use client';

import { Button } from '@/components/ui/button';
import type { MaintenanceLoginType } from '../utils/login-schemas';

interface LoginTypeStepProps {
  onSelect: (loginType: Exclude<MaintenanceLoginType, ''>) => void;
}

/**
 * Paso 2: tipo de acceso. "Mecanico" entra por el mismo camino que "Invitado"
 * (usuario y contraseña); sólo el empleado usa la sesión anónima con CUIL.
 */
export function LoginTypeStep({ onSelect }: LoginTypeStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-center text-gray-700 mb-4">Seleccione su tipo de usuario para continuar:</p>
      <Button className="w-full" onClick={() => onSelect('empleado')}>
        Empleado
      </Button>
      <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white" onClick={() => onSelect('invitado')}>
        Invitado
      </Button>
      <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white" onClick={() => onSelect('invitado')}>
        Mecanico
      </Button>
    </div>
  );
}
