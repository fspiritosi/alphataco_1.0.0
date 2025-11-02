import { supabaseServer } from '@/lib/supabase/server';
import { PasswordChangeAlert } from './PasswordChangeAlert';

export async function PasswordChangeAlertWrapper() {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log('🔍 [PASSWORD_ALERT] No hay usuario autenticado');
    return null;
  }

  console.log('🔍 [PASSWORD_ALERT] Usuario:', user.email);
  console.log('🔍 [PASSWORD_ALERT] Metadata:', user.user_metadata);
  console.log('🔍 [PASSWORD_ALERT] needs_password_change:', user.user_metadata?.needs_password_change);

  return <PasswordChangeAlert userMetadata={user.user_metadata} />;
}
