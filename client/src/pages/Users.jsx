import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Users as UsersIcon,
  Phone,
  Send,
  Pencil,
  X,
  Shield,
  ShieldCheck,
  Key,
  Activity,
  Search,
  RefreshCw,
  Check,
  AlertCircle,
  Clock,
  Globe,
  Sliders,
  CheckSquare,
  Square,
  Lock,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth, DEFAULT_PERMISSIONS } from '../context/AuthContext';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'employee',
  phone: '',
  telegramChatId: '',
};

const MODULES_CONFIG = [
  { key: 'items', label: 'Raw Materials & Items', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { key: 'products', label: 'Finished Products', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { key: 'customers', label: 'Customer Management', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'suppliers', label: 'Supplier Directory', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'stockMovements', label: 'Stock Movements (GRV, SIV, Transfers)', actions: ['view', 'create', 'edit', 'delete', 'approve', 'void'] },
  { key: 'purchases', label: 'Purchases & Orders', actions: ['view', 'create', 'edit', 'delete', 'approve', 'void'] },
  { key: 'stockRequests', label: 'Stock Issue & Requests', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { key: 'consumption', label: 'Material Consumption', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'reports', label: 'Reports & Business Analytics', actions: ['view', 'export'] },
  { key: 'staffAccounts', label: 'Staff Accounts & Roles', actions: ['view', 'create', 'edit', 'delete', 'manageAccess'] },
  { key: 'recycleBin', label: 'Recycle Bin & Record Recovery', actions: ['view', 'restore', 'delete'] },
];

const ACTION_LABELS = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  void: 'Void',
  approve: 'Approve',
  export: 'Export',
  restore: 'Restore',
  manageAccess: 'Manage Access',
};

const roleBadge = (role) => {
  switch (role) {
    case 'developer':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-xs font-bold text-purple-700 shadow-xs">
          <Shield size={11} className="text-purple-600" /> Developer / Owner
        </span>
      );
    case 'admin':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800 shadow-xs">
          <ShieldCheck size={11} className="text-amber-600" /> Administrator
        </span>
      );
    case 'employee':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-700 shadow-xs">
          <UsersIcon size={11} className="text-blue-500" /> Employee
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700 capitalize">
          {role}
        </span>
      );
  }
};

const Users = () => {
  const { user: currentUser, isDeveloper, isAdmin } = useAuth();

  // Active view tab
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'audit'

  // Users data
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Granular permissions modal
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [permTargetUser, setPermTargetUser] = useState(null);
  const [customPerms, setCustomPerms] = useState({});
  const [savingPerms, setSavingPerms] = useState(false);
  const [permError, setPermError] = useState('');
  const [permSuccess, setPermSuccess] = useState('');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditModuleFilter, setAuditModuleFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await api.get('/backup/audit-logs');
      setAuditLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    if (isAdmin) loadAuditLogs();
  }, [isAdmin]);

  // Handle open create user
  const openCreate = () => {
    setEditUser(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  // Handle open edit user
  const openEdit = (u) => {
    setEditUser(u);
    setForm({
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role || 'employee',
      phone: u.phone || '',
      telegramChatId: u.telegramChatId || '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editUser) {
        const payload = {
          name: form.name,
          role: form.role,
          phone: form.phone,
          telegramChatId: form.telegramChatId,
        };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editUser._id}`, payload);
      } else {
        await api.post('/auth/register', form);
      }
      setModalOpen(false);
      setForm(emptyForm);
      loadUsers();
      if (isAdmin) loadAuditLogs();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save account.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u._id}`, { isActive: !u.isActive });
      loadUsers();
      if (isAdmin) loadAuditLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle account status');
    }
  };

  // ── Permissions Modal Helpers ──
  const openPermissionsModal = (targetUser) => {
    setPermTargetUser(targetUser);
    setPermError('');
    setPermSuccess('');

    // Pre-populate permissions from target user's customPermissions or fallback to role defaults
    const currentRole = targetUser.role || 'employee';
    const initialPerms = {};

    MODULES_CONFIG.forEach((mod) => {
      initialPerms[mod.key] = {};
      mod.actions.forEach((act) => {
        // If user has customPermissions set explicitly, use that; else evaluate role default
        if (targetUser.customPermissions?.[mod.key]?.[act] !== undefined) {
          initialPerms[mod.key][act] = Boolean(targetUser.customPermissions[mod.key][act]);
        } else {
          const roleDef = DEFAULT_PERMISSIONS[mod.key]?.[act];
          initialPerms[mod.key][act] = roleDef ? Boolean(roleDef[currentRole]) : false;
        }
      });
    });

    setCustomPerms(initialPerms);
    setPermModalOpen(true);
  };

  const togglePerm = (moduleKey, actionKey) => {
    setCustomPerms((prev) => ({
      ...prev,
      [moduleKey]: {
        ...(prev[moduleKey] || {}),
        [actionKey]: !prev[moduleKey]?.[actionKey],
      },
    }));
  };

  const toggleModuleAll = (moduleKey, state) => {
    const mod = MODULES_CONFIG.find((m) => m.key === moduleKey);
    if (!mod) return;
    setCustomPerms((prev) => {
      const updated = { ...(prev[moduleKey] || {}) };
      mod.actions.forEach((act) => {
        updated[act] = state;
      });
      return { ...prev, [moduleKey]: updated };
    });
  };

  const applyPreset = (presetName) => {
    const next = {};
    MODULES_CONFIG.forEach((mod) => {
      next[mod.key] = {};
      mod.actions.forEach((act) => {
        if (presetName === 'all') {
          next[mod.key][act] = true;
        } else if (presetName === 'readonly') {
          next[mod.key][act] = act === 'view';
        } else if (presetName === 'employee') {
          next[mod.key][act] = ['view', 'create', 'edit'].includes(act) && mod.key !== 'staffAccounts';
        } else if (presetName === 'storekeeper') {
          next[mod.key][act] =
            ['items', 'products', 'stockMovements', 'purchases', 'stockRequests'].includes(mod.key) &&
            ['view', 'create', 'edit'].includes(act);
        } else if (presetName === 'cashier') {
          next[mod.key][act] =
            (mod.key === 'cashSales' && ['view', 'create'].includes(act)) ||
            (mod.key === 'products' && act === 'view') ||
            (mod.key === 'customers' && ['view', 'create'].includes(act));
        }
      });
    });
    setCustomPerms(next);
  };

  const handleSavePermissions = async () => {
    if (!permTargetUser) return;
    setSavingPerms(true);
    setPermError('');
    setPermSuccess('');
    try {
      await api.put(`/users/${permTargetUser._id}`, {
        customPermissions: customPerms,
      });
      setPermSuccess('Custom permissions assigned and saved successfully.');
      loadUsers();
      if (isAdmin) loadAuditLogs();
      setTimeout(() => setPermModalOpen(false), 900);
    } catch (err) {
      setPermError(err.response?.data?.message || 'Failed to update user permissions.');
    } finally {
      setSavingPerms(false);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        u.phone?.includes(q)
    );
  }, [users, userSearch]);

  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.toLowerCase().trim();
    return auditLogs.filter((log) => {
      const matchSearch =
        !q ||
        log.userName?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.module?.toLowerCase().includes(q) ||
        log.resourceName?.toLowerCase().includes(q);
      const matchModule = auditModuleFilter === 'all' || log.module === auditModuleFilter;
      return matchSearch && matchModule;
    });
  }, [auditLogs, auditSearch, auditModuleFilter]);

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner ── */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wide">
              <ShieldCheck size={13} className="text-blue-400" />
              <span>Identity &amp; Granular Access Control</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Staff &amp; Role Management</h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Govern user accounts across Developer, Administrator, and Employee roles. Assign granular module permissions
              and inspect audited staff transactions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                loadUsers();
                if (isAdmin) loadAuditLogs();
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              title="Refresh lists"
            >
              <RefreshCw size={13} className={loadingUsers || auditLoading ? 'animate-spin' : ''} />
              <span>Sync</span>
            </button>
            {isAdmin && (
              <Button variant="brass" onClick={openCreate} className="shadow-lg">
                <Plus size={15} /> Add User Account
              </Button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="relative z-10 flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('users')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <UsersIcon size={14} />
            <span>Staff Accounts ({users.length})</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'audit'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Activity size={14} />
              <span>Employee Activity &amp; Audit Logs ({auditLogs.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* ── TAB 1: USERS LIST ── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search staff by name, email, or role..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-ink-200 bg-white outline-none focus:border-blue-500 shadow-xs"
              />
            </div>
            <div className="text-xs text-ink-400 font-medium">
              Showing {filteredUsers.length} active account{filteredUsers.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead style={{ background: 'linear-gradient(90deg,#1e3a8a 0%,#1d4ed8 50%,#2563eb 100%)' }}>
                  <tr>
                    {['Name', 'Email', 'Phone', 'Role & Authority', 'Custom Access', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-blue-100"
                        style={{ borderBottom: '1px solid rgba(147,197,253,0.3)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-ink-400">
                        {loadingUsers ? 'Loading accounts...' : 'No staff accounts found.'}
                      </td>
                    </tr>
                  )}
                  {paginatedUsers.map((u) => {
                    const hasCustom = u.customPermissions && Object.keys(u.customPermissions).length > 0;
                    const isDevAccount = u.role === 'developer';
                    const canModifyThisUser = isDeveloper || (!isDevAccount && isAdmin);

                    return (
                      <tr key={u._id} className="hover:bg-blue-50/25 transition-colors border-b border-ink-100/70">
                        <td className="px-4 py-3 font-semibold text-ink-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                              {u.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-ink-900">{u.name}</p>
                              {u._id === currentUser?._id && (
                                <span className="text-[10px] text-blue-600 font-semibold">(Current User)</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-500 whitespace-nowrap">{u.email}</td>
                        <td className="px-4 py-3 text-xs text-ink-500 whitespace-nowrap">
                          {u.phone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone size={11} className="text-ink-400" /> {u.phone}
                            </span>
                          ) : (
                            <span className="text-ink-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{roleBadge(u.role)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {hasCustom ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <Key size={10} /> Custom Overrides Active
                            </span>
                          ) : (
                            <span className="text-xs text-ink-400">Role Default</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge color={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Disabled'}</Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {/* Granular Permissions Button */}
                            {canModifyThisUser && (
                              <button
                                onClick={() => openPermissionsModal(u)}
                                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 transition"
                                title="Configure module permissions"
                              >
                                <Sliders size={11} /> Permissions
                              </button>
                            )}
                            {/* Edit Button */}
                            {canModifyThisUser && (
                              <button
                                onClick={() => openEdit(u)}
                                className="inline-flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white transition"
                              >
                                <Pencil size={11} /> Edit
                              </button>
                            )}
                            {/* Disable / Enable Button */}
                            {canModifyThisUser && u._id !== currentUser?._id && (
                              <button
                                onClick={() => toggleActive(u)}
                                className={`text-xs font-semibold hover:underline ${
                                  u.isActive ? 'text-red-600' : 'text-emerald-600'
                                }`}
                              >
                                {u.isActive ? 'Disable' : 'Enable'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={filteredUsers.length}
              onPage={setPage}
              onPageSize={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* ── TAB 2: AUDIT & ACTIVITY LOGS ── */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search by staff name, action, or resource..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-ink-200 bg-white outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              <select
                value={auditModuleFilter}
                onChange={(e) => setAuditModuleFilter(e.target.value)}
                className="rounded-xl border border-ink-200 px-3 py-2 text-xs outline-none focus:border-blue-500 bg-white"
              >
                <option value="all">All Modules</option>
                <option value="auth">Authentication</option>
                <option value="users">Staff &amp; Permissions</option>
                <option value="stockMovements">Stock Movements</option>
                <option value="purchases">Purchases &amp; POs</option>
                <option value="stockRequests">Stock Requests</option>
                <option value="materials">Materials</option>
                <option value="backup">Disaster Recovery</option>
              </select>
            </div>

            <div className="text-xs text-ink-400 font-medium">
              Showing {filteredAuditLogs.length} activity event{filteredAuditLogs.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Timestamp', 'User & Role', 'Action', 'Module', 'Target Resource', 'Details', 'IP Address'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-ink-400">
                        {auditLoading ? 'Loading audit trail...' : 'No activity records match your filter.'}
                      </td>
                    </tr>
                  )}
                  {filteredAuditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock size={11} className="text-slate-400" />
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{log.userName || 'System'}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{log.userRole || '—'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.action?.includes('delete') || log.action?.includes('void')
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : log.action?.includes('approve')
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.action?.includes('create')
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-700">{log.module}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {log.resourceName || log.resourceId || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={JSON.stringify(log.details)}>
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '—')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-400 text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <Globe size={10} /> {log.ip || '127.0.0.1'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT STAFF ACCOUNT ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editUser ? `Edit Staff Account — ${editUser.name}` : 'Add New Staff Account'}
        width="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-600">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">Full Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => f('name', e.target.value)}
              placeholder="e.g. Almaz Bekele"
              className="w-full rounded-xl border border-ink-200 px-3.5 py-2 text-xs outline-none focus:border-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-700">Email Address *</label>
            <input
              type="email"
              required={!editUser}
              value={form.email}
              onChange={(e) => f('email', e.target.value)}
              disabled={!!editUser}
              placeholder="almaz@company.com"
              className="w-full rounded-xl border border-ink-200 px-3.5 py-2 text-xs outline-none focus:border-blue-500 disabled:bg-ink-50 disabled:text-ink-400"
            />
          </div>

          {/* Phone + Telegram */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-700">
                <Phone size={11} className="inline mr-1" />
                Phone Number
              </label>
              <input
                value={form.phone}
                onChange={(e) => f('phone', e.target.value)}
                placeholder="+251 91 234 5678"
                className="w-full rounded-xl border border-ink-200 px-3.5 py-2 text-xs outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-700">
                <Send size={11} className="inline mr-1 text-sky-500" />
                Telegram Chat ID
              </label>
              <input
                value={form.telegramChatId}
                onChange={(e) => f('telegramChatId', e.target.value)}
                placeholder="e.g. 123456789"
                className="w-full rounded-xl border border-ink-200 px-3.5 py-2 text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Role + Password */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-700">Role &amp; Privilege *</label>
              <select
                value={form.role}
                onChange={(e) => f('role', e.target.value)}
                className="w-full rounded-xl border border-ink-200 px-3.5 py-2 text-xs outline-none focus:border-blue-500 bg-white"
              >
                {/* 3 Standard Roles */}
                {isDeveloper && <option value="developer">System Developer / Owner</option>}
                <option value="admin">System Administrator</option>
                <option value="employee">Employee (Standard)</option>
                {/* Legacy Presets */}
                <option value="storekeeper">Storekeeper (Legacy)</option>
                <option value="cashier">Cashier (Legacy)</option>
                <option value="manager">Manager (Legacy)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-700">
                {editUser ? 'New Password (optional)' : 'Password *'}
              </label>
              <input
                type="text"
                required={!editUser}
                minLength={6}
                value={form.password}
                onChange={(e) => f('password', e.target.value)}
                placeholder={editUser ? 'Leave blank to keep' : 'Min 6 characters'}
                className="w-full rounded-xl border border-ink-200 px-3.5 py-2 text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-ink-100">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brass" disabled={saving}>
              {saving ? 'Saving...' : editUser ? 'Save Account' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: GRANULAR PERMISSIONS ASSIGNMENT ── */}
      <Modal
        open={permModalOpen}
        onClose={() => setPermModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-blue-600" />
            <span>Granular Permissions: {permTargetUser?.name}</span>
            <span className="text-xs font-normal text-ink-400">({permTargetUser?.role})</span>
          </div>
        }
        width="max-w-4xl"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {permError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-600">
              <AlertCircle size={15} />
              <span>{permError}</span>
            </div>
          )}
          {permSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-700">
              <Check size={15} />
              <span>{permSuccess}</span>
            </div>
          )}

          {/* Quick Presets Toolbar */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700">Quick Permission Presets:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('employee')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                Standard Employee
              </button>
              <button
                type="button"
                onClick={() => applyPreset('storekeeper')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                Storekeeper Preset
              </button>
              <button
                type="button"
                onClick={() => applyPreset('cashier')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                Sales Cashier Preset
              </button>
              <button
                type="button"
                onClick={() => applyPreset('readonly')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                Read Only
              </button>
              {isDeveloper && (
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 hover:bg-blue-100 transition shadow-2xs"
                >
                  Grant All Access
                </button>
              )}
            </div>
          </div>

          {/* Granular Module Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100/80 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-left font-bold text-slate-700">Module / Resource</th>
                  <th className="px-4 py-2.5 text-left font-bold text-slate-700">Granular Actions &amp; Authority</th>
                  <th className="px-4 py-2.5 text-right font-bold text-slate-700">Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MODULES_CONFIG.map((mod) => {
                  const currentModPerms = customPerms[mod.key] || {};
                  const allActive = mod.actions.every((a) => currentModPerms[a]);

                  return (
                    <tr key={mod.key} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                        <div>{mod.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono">module: {mod.key}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {mod.actions.map((act) => {
                            const isChecked = Boolean(currentModPerms[act]);
                            return (
                              <label
                                key={act}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer select-none transition ${
                                  isChecked
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePerm(mod.key, act)}
                                  className="sr-only"
                                />
                                {isChecked ? <CheckSquare size={13} className="text-blue-600" /> : <Square size={13} />}
                                <span>{ACTION_LABELS[act] || act}</span>
                              </label>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleModuleAll(mod.key, !allActive)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {allActive ? 'Clear all' : 'Select all'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Lock size={12} />
              <span>Privilege boundaries enforced by server-side authorization.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => setPermModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="brass" onClick={handleSavePermissions} disabled={savingPerms}>
                {savingPerms ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
