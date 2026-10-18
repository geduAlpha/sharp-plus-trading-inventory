import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles, capability }) => {
  const { user, loading, can } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-slate-200 border-t-blue-600" />
        <span className="text-xs font-semibold text-slate-500 tracking-wide">Loading Sharp Plus System...</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (capability && !can(capability)) {
    return <Navigate to="/" replace />;
  }

  if (roles && !capability && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;

