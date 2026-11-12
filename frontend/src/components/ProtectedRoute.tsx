import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../api';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: UserRole[];
}

// WHY: Client-side route guard enforcing authentication and role permissions before rendering protected pages
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  // WHY: Displays non-blocking loading spinner while JWT token liveness is verified against the backend
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-slate-400 space-y-3">
        <div className="inline-block w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono">Authenticating session...</p>
      </div>
    );
  }

  // WHY: Redirects unauthenticated requests to /login while preserving original destination URL in router state
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div
        id="access-restricted-card"
        className="max-w-xl mx-auto my-12 p-8 bg-surface border border-base rounded-2xl shadow-sm text-center space-y-4"
      >
        <div className="inline-flex p-3 bg-amber-50 text-amber-700 rounded-full">
          <span className="text-xl font-bold">!</span>
        </div>
        <h2 className="text-lg font-bold text-heading">Access Restricted</h2>
        <p className="text-xs text-muted leading-relaxed">
          This route requires authorization for role(s):{' '}
          <span className="font-semibold text-body">{allowedRoles.join(', ')}</span>. Your
          active role is <span className="font-semibold text-amber-700">{user?.role}</span>.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-ink-500 hover:bg-ink-600 text-xs font-semibold text-white rounded-lg transition"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 bg-surface-level hover:bg-stone-200 text-xs font-semibold text-body rounded-lg border border-base transition"
          >
            Switch Account
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
