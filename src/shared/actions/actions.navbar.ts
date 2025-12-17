'use server';

import { headers } from 'next/headers';
import { cleanPath } from '../../features/Layout/sidebar/utils/utils.sidebar';

export async function getCurrentPath() {
  const headersList = await headers();
  const referer = headersList.get('referer') || '';

  const cleanedPath = cleanPath(referer);

  if (cleanedPath === '/' || cleanedPath === '' || cleanedPath === '/dashboard') {
    return '/dashboard';
  }

  return cleanedPath || '/';
}
