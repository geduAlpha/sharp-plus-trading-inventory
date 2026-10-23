import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeSidebar } from '../context/ThemeSidebarContext';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

/**
 * ModuleGuard wraps routes that belong to a specific module.
 * If the module is disabled by the System Owner/Developer, it shows a blocked screen.
 * The developer role always bypasses module gates.
 *
 * @param {string} moduleKey - 'salesMarketing' | 'accounting'
 * @param {ReactNode} children
 */
const ModuleGuard = ({ moduleKey, children }) => {
  const { user } = useAuth();
  const { modulesEnabled } = useThemeSidebar();

  // Developer always has bypass access
  if (user?.role === 'developer') return children;

  const isEnabled = modulesEnabled?.[moduleKey] !== false;

  if (!isEnabled) {
    const moduleNames = {
      salesMarketing: 'Sales & Marketing',
      accounting: 'Accounting & Analytics',
    };
    const moduleName = moduleNames[moduleKey] || moduleKey;

    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 border-2 border-red-100 shadow-sm">
          <ShieldAlert className="text-red-500" size={40} />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-black text-slate-800 mb-2">Module Deactivated</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            The <span className="font-bold text-red-700">{moduleName}</span> module has been
            deactivated by the System Owner & Developer. Access to this section is currently restricted.
          </p>
          <p className="text-xs text-slate-400 mt-3">
            All existing data is safely preserved. Contact the System Owner to re-activate this module.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5">
          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
          <span className="text-xs font-semibold text-amber-700">
            Data is preserved — only access is restricted
          </span>
        </div>
      </div>
    );
  }

  return children;
};

export default ModuleGuard;
