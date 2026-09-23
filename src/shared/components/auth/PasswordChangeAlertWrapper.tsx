import { getSessionNeedsPasswordChange } from '@/shared/lib/session';
import { PasswordChangeAlert } from './PasswordChangeAlert';

export async function PasswordChangeAlertWrapper() {
  // `needsPasswordChange` es un campo propio del usuario de Better Auth, `input: false`: lo
  // pone el alta con contraseña temporal y lo baja `changePassword()`. El cliente no lo escribe.
  if (!(await getSessionNeedsPasswordChange())) return null;

  return <PasswordChangeAlert />;
}
