import { supabaseServer } from '@/lib/supabase/server';
import { cache } from 'react';

/**
 * Cached session reader — 0 network calls.
 *
 * getSession() reads the JWT from the cookie without contacting the Auth server.
 * React.cache() deduplicates within the same server request, so multiple server
 * components calling getCachedSession() only decode the JWT once.
 *
 * IMPORTANT: Only use this AFTER middleware has already validated the user
 * with getUser(). In the middleware itself, use getUser() for security.
 */
export const getCachedSession = cache(async () => {
  const supabase = await supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
});
