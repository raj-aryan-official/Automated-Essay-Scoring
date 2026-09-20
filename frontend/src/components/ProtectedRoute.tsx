import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../api';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-slate-400 space-y-3">
        <div className="inline-block w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono">Authenticating session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div
        id="access-restricted-card"
        className="max-w-xl mx-auto my-12 p-8 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl text-center space-y-4"
      >
        <div className="inline-flex p-3 bg-amber-500/10 text-amber-400 rounded-full">
          <span className="text-xl font-bold">!</span>
        </div>
        <h2 className="text-lg font-bold text-white">Access Restricted</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          This route requires authorization for role(s):{' '}
          <span className="font-semibold text-slate-200">
            {allowedRoles.join(', ')}
          </span>
          . Your active role is{' '}
          <span className="font-semibold text-amber-400">{user?.role}</span>.
        </p>
        <div className="pt-2 flex justify-center space-x-3">
          <Link
            to="/login"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white rounded-lg transition"
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
