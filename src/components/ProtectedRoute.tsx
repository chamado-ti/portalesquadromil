import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import type { AppRole } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role, profile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingPage message="Verificando permissões..." />;
  }

  if (!isAuthenticated || !profile) {
    // Redirect to login, saving the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile.is_active) {
    // User is inactive
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // User doesn't have permission for this route
    // Redirect to their appropriate dashboard
    switch (role) {
      case 'ti':
        return <Navigate to="/ti" replace />;
      case 'guarita':
        return <Navigate to="/guarita" replace />;
      case 'colaborador':
        return <Navigate to="/colaborador" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
