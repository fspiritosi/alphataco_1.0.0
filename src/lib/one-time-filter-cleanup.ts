/**
 * One-time cleanup utility for obsolete table filters
 *
 * This script runs once when the app loads and cleans up old filters
 * from both localStorage and cookies that might cause issues.
 *
 * To trigger a new cleanup, simply change the CLEANUP_VERSION string.
 */

const CLEANUP_VERSION = '2025-01-v2'; // Change this to trigger a new cleanup
const CLEANUP_KEY = 'table-filters-cleanup-done';

/**
 * Cleans up obsolete table filters from localStorage and cookies
 * This function is idempotent - it only runs once per version
 */
export function cleanupObsoleteFilters() {
  // Only run on client side
  if (typeof window === 'undefined') return;

  try {
    const lastCleanup = localStorage.getItem(CLEANUP_KEY);

    // Check if cleanup has already been done for this version
    if (lastCleanup === CLEANUP_VERSION) {
      return; // Already cleaned up
    }

    // 1. Clean localStorage - remove all table filter entries
    const localStorageKeys = Object.keys(localStorage);
    let localStorageCount = 0;

    localStorageKeys.forEach((key) => {
      if (key.startsWith('table-filters-') || key.includes('Table') || key.includes('Columns')) {
        localStorage.removeItem(key);
        localStorageCount++;
      }
    });

    // 2. Clean cookies - remove table-related cookies
    let cookieCount = 0;
    const cookies = document.cookie.split(';');

    cookies.forEach((cookie) => {
      const cookieName = cookie.split('=')[0].trim();

      // Remove cookies that contain table-related keywords
      if (
        cookieName.includes('Table') ||
        cookieName.includes('table') ||
        cookieName.includes('filters') ||
        cookieName.includes('Columns') ||
        cookieName.includes('visibility')
      ) {
        // Set cookie to expire in the past to delete it
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        cookieCount++;
      }
    });

    // Mark cleanup as done for this version
    localStorage.setItem(CLEANUP_KEY, CLEANUP_VERSION);
  } catch (error) {
    console.error('[Filter Cleanup] ❌ Error during cleanup:', error);
  }
}

/**
 * Force cleanup regardless of version
 * Useful for debugging or manual cleanup
 */
export function forceCleanupFilters() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(CLEANUP_KEY);
  cleanupObsoleteFilters();
}
