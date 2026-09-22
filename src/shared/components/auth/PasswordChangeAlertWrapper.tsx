import { getCachedSession } from '@/shared/lib/session';
import { PasswordChangeAlert } from './PasswordChangeAlert';

export async function PasswordChangeAlertWrapper() {
  const session = await getCachedSession();
  const user = session?.user;

  if (!user) {
    return null;
  }

  return <PasswordChangeAlert userMetadata={user.user_metadata} />;
}
