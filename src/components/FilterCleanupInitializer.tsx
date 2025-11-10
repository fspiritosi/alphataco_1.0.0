'use client';

import { cleanupObsoleteFilters } from '@/lib/one-time-filter-cleanup';
import { useEffect } from 'react';

/**
 * Component that runs the one-time filter cleanup on mount
 * This should be included once in the app layout
 */
export function FilterCleanupInitializer() {
  useEffect(() => {
    // Run cleanup on mount
    cleanupObsoleteFilters();
  }, []); // Empty dependency array - runs once on mount

  // This component doesn't render anything
  return null;
}
