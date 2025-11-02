import { supabaseServer } from '@/lib/supabase/server';
import { PasswordChangeAlert } from './PasswordChangeAlert';

export async function PasswordChangeAlertWrapper() {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return <PasswordChangeAlert userMetadata={user.user_metadata} />;
}
