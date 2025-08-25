'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import React, { useEffect } from 'react';

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const supabase = supabaseBrowser();
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      const user = session.user;
      posthog.identify(user.email, {
        email: user.email,
      });
    }
  });

  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      defaults: '2025-05-24',
      capture_exceptions: true,
      debug: false,
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
