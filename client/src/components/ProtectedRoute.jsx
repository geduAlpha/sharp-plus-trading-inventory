import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const ProtectedRoute = ({ children, roles, capability, navKey }) => {
  const { user, loading, can, canSeeNav } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-slate-200 border-t-blue-600" />
        <span className="text-xs font-semibold text-slate-500 tracking-wide">Loading Sharp Plus System...</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Developer role has universal master access over all routes
  if (user.role === 'developer') return children;

  // Flexible permission evaluation: check both dynamic nav visibility and capability
  const hasNavAccess = navKey ? (canSeeNav(navKey) || can(navKey, 'view') || can(navKey)) : false;
  const hasCapAccess = capability ? can(capability) : false;

  const isNavDenied = navKey && !hasNavAccess;
  const isCapDenied = capability && !hasCapAccess;
  // If access was explicitly granted via navKey or capability matrix by Admin/Developer, do NOT block by hardcoded role!
  const isRoleDenied = roles && !hasNavAccess && !hasCapAccess && !roles.includes(user.role);

  if (isNavDenied || isCapDenied || isRoleDenied) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-600 shadow-sm mb-4">
          <ShieldAlert size={38} />
        </div>
        <h2 className="text-2xl font-black text-ink-900 tracking-tight">Access Restricted</h2>
        <p className="mt-2 max-w-md text-sm text-ink-500 leading-relaxed">
          Your assigned role (<strong className="capitalize text-ink-800">{user.role}</strong>) does not have access permissions for this section.
          Access privileges are configured and enforced by the <strong className="text-blue-700">System Developer &amp; Owner</strong>.
        </p>
        <div className="mt-6 flex items-center gap-3">
          {canSeeNav('dashboard') && (
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </Link>
          )}
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;

