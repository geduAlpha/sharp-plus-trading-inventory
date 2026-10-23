import React, { useState, useEffect } from 'react';
import {
  ToggleLeft, ToggleRight, ShieldAlert, AlertTriangle, CheckCircle2,
  Package, TrendingUp, Clock, User2, History, RefreshCw, X
} from 'lucide-react';
import api from '../../api/axios';
import { useThemeSidebar } from '../../context/ThemeSidebarContext';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import Button from '../ui/Button';

const MODULE_CATALOG = [
  {
    key: 'salesMarketing',
    name: 'Sales & Marketing Module',
    description: 'Enables Cash Sales, Credit Sales, Sales Import, Customer accounts, fiscal receipts, payment collection and all related analytics and reports.',
    icon: TrendingUp,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    affectedRoutes: ['/sales/cash', '/sales/credit', '/sales-import'],
    affectedAPIs: ['/api/transactions (sales vouchers)', '/api/customers'],
    affectedMenus: ['Sales and Marketing MS', 'Cash Sales', 'Credit Sales', 'Import Sales Report'],
    warningText: 'All existing sales records and customer data will remain preserved. The module can be re-activated at any time.',
  },
  {
    key: 'accounting',
    name: 'Accounting Module',
    description: 'Controls ledger posting, financial reports, analytics and P&L visibility. Restricts access to accounting-related settings when disabled.',
    icon: Package,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    affectedRoutes: ['/analytics', '/reports'],
    affectedAPIs: ['/api/analytics', '/api/reports (ledger views)'],
    affectedMenus: ['Analytics & P&L', 'Financial Reports'],
    warningText: 'All existing accounting records and analytics data will remain preserved and intact.',
  },
];

function ConfirmToggleModal({ module, targetState, onConfirm, onCancel, saving }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-red-200 max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <AlertTriangle className="text-white" size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {targetState ? 'Activate' : 'Deactivate'} Module
              </h3>
              <p className="text-red-100 text-xs">{module.name}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Impact summary */}
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-2">
            <p className="text-sm font-bold text-red-800">
              {targetState ? '✅ This will ACTIVATE the module and restore access to:' : '⚠️ This will DEACTIVATE the module and block access to:'}
            </p>
            <ul className="text-sm text-red-700 space-y-1 pl-3 list-disc">
              <li><span className="font-semibold">Frontend Routes:</span> {module.affectedRoutes.join(', ')}</li>
              <li><span className="font-semibold">Backend APIs:</span> {module.affectedAPIs.join(', ')}</li>
              <li><span className="font-semibold">Sidebar Menus:</span> {module.affectedMenus.join(', ')}</li>
            </ul>
          </div>

          {/* Data safety notice */}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-700">
              🔒 <span className="font-bold">Data Safety Guarantee:</span> {module.warningText}
            </p>
          </div>

          <p className="text-sm text-slate-600">
            Are you sure you want to{' '}
            <span className="font-bold text-red-700">{targetState ? 'activate' : 'deactivate'}</span>{' '}
            the <span className="font-bold">{module.name}</span>?
            {!targetState && ' This will immediately restrict access for all non-developer users.'}
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <button
              onClick={onConfirm}
              disabled={saving}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all ${
                targetState
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-60`}
            >
              {saving ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : targetState ? (
                <CheckCircle2 size={14} />
              ) : (
                <AlertTriangle size={14} />
              )}
              {saving ? 'Processing…' : targetState ? 'Yes, Activate Module' : 'Yes, Deactivate Module'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModuleManagement() {
  const { user } = useAuth();
  const { modulesEnabled, toggleModule, refreshSettings } = useThemeSidebar();

  const isDeveloper = user?.role === 'developer';
  const [confirmModal, setConfirmModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Load audit logs on mount
  const loadAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await api.get('/settings');
      const logs = (res.data?.auditLogs || []).filter(
        (l) => l.action === 'MODULE_TOGGLED' || l.action === 'THEME_UPDATED'
      );
      setAuditLogs(logs.slice(0, 40));
    } catch (err) {
      console.warn('[ModuleManagement] Could not load audit logs:', err.message);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const handleToggleRequest = (moduleKey, targetState) => {
    const mod = MODULE_CATALOG.find((m) => m.key === moduleKey);
    if (!mod) return;
    setConfirmModal({ module: mod, targetState });
  };

  const handleConfirmToggle = async () => {
    if (!confirmModal) return;
    setSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await toggleModule(confirmModal.module.key, confirmModal.targetState);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `"${confirmModal.module.name}" has been ${confirmModal.targetState ? 'activated ✅' : 'deactivated 🚫'} successfully.`,
        });
        setConfirmModal(null);
        await refreshSettings();
        await loadAuditLogs();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to update module status. Please try again.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'An unexpected error occurred.',
      });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback({ type: '', message: '' }), 7000);
    }
  };

  if (!isDeveloper) {
    return (
      <Card className="p-6 flex flex-col items-center text-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 border border-red-100">
          <ShieldAlert className="text-red-500" size={28} />
        </div>
        <h3 className="text-base font-bold text-slate-800">Access Restricted</h3>
        <p className="text-sm text-slate-500 max-w-xs">
          Module management is exclusively available to the System Owner & Developer. Contact your system administrator for access.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">System Module Control Center</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Activate or deactivate system modules. All data remains preserved when disabled.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5">
          <ShieldAlert size={13} className="text-indigo-600" />
          <span className="text-xs font-bold text-indigo-700">Developer Control Panel</span>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback.message && (
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {feedback.message}
          <button onClick={() => setFeedback({ type: '', message: '' })} className="ml-auto opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Module Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {MODULE_CATALOG.map((mod) => {
          const isEnabled = modulesEnabled?.[mod.key] !== false;
          const Icon = mod.icon;
          return (
            <Card key={mod.key} className={`relative overflow-hidden border-2 transition-all ${
              isEnabled
                ? 'border-emerald-200 bg-white'
                : 'border-red-200 bg-red-50/30'
            }`}>
              {/* Status ribbon */}
              <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-bl-xl ${
                isEnabled ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {isEnabled ? 'Active' : 'Disabled'}
              </div>

              <div className="p-5 space-y-4">
                {/* Icon + Title */}
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${mod.iconBg} border border-slate-100`}>
                    <Icon className={mod.iconColor} size={22} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900">{mod.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{mod.description}</p>
                  </div>
                </div>

                {/* Affected items */}
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Affected Resources</p>
                  <div className="flex flex-wrap gap-1">
                    {mod.affectedRoutes.map((r) => (
                      <span key={r} className="rounded-md bg-blue-50 border border-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        {r}
                      </span>
                    ))}
                    {mod.affectedMenus.slice(0, 3).map((m) => (
                      <span key={m} className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    {isEnabled ? (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    ) : (
                      <AlertTriangle size={14} className="text-red-500" />
                    )}
                    <span className={`text-xs font-bold ${isEnabled ? 'text-emerald-700' : 'text-red-700'}`}>
                      {isEnabled ? 'Module is Active & Accessible' : 'Module is Deactivated & Blocked'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleRequest(mod.key, !isEnabled)}
                    className={`group flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all shadow-sm ${
                      isEnabled
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isEnabled ? (
                      <><ToggleLeft size={16} /> Deactivate</>
                    ) : (
                      <><ToggleRight size={16} /> Activate</>
                    )}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Audit Trail */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={17} className="text-slate-600" />
            <h3 className="text-sm font-black text-slate-900">System Action Audit Trail</h3>
          </div>
          <button
            onClick={loadAuditLogs}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw size={11} className={logsLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {logsLoading ? (
          <div className="flex items-center justify-center h-20">
            <RefreshCw size={18} className="animate-spin text-slate-400" />
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No audit events recorded yet. Actions taken here will appear in this log.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {auditLogs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                  log.action === 'MODULE_TOGGLED'
                    ? log.details?.includes('ON') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {log.action === 'MODULE_TOGGLED' ? (
                    log.details?.includes('ON') ? '▶' : '■'
                  ) : '🎨'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 leading-tight">{log.details}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User2 size={9} /> {log.actorName || 'System Owner'} ({log.actorRole || 'developer'})
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={9} /> {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                  log.action === 'MODULE_TOGGLED' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {log.action === 'MODULE_TOGGLED' ? 'Module' : 'Theme'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmToggleModal
          module={confirmModal.module}
          targetState={confirmModal.targetState}
          onConfirm={handleConfirmToggle}
          onCancel={() => setConfirmModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
