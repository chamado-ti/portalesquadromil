import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { prefetchRoutesForRole } from '@/lib/routePrefetch';

/**
 * Once the user is authenticated, prefetch all route chunks for their role
 * during idle time. This eliminates the lazy-load flash when switching modules.
 */
export function RoutePrefetcher() {
  const { role, isAuthenticated } = useAuth();
  useEffect(() => {
    if (isAuthenticated && role) prefetchRoutesForRole(role);
  }, [isAuthenticated, role]);
  return null;
}
