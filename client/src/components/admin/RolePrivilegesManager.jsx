import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  ShieldCheck,
  User,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Lock,
  Unlock,
  Layers,
  Package,
  Coffee,
  ShoppingBag,
  CreditCard,
  Truck,
  ShoppingCart,
  ArrowLeftRight,
  SendToBack,
  Flame,
  BarChart3,
  Settings,
  Trash2,
  Search,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

export const CRUD_MODULES = [
  {
    key: 'items',
    label: 'Items & Raw Materials',
    icon: Package,
    description: 'Raw materials, stock levels, reorder alerts & pricing',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    key: 'products',
    label: 'Products & Recipes',
    icon: Coffee,
    description: 'Finished products, recipe formulations & menu prices',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    key: 'cashSales',
    label: 'Cash Sales (Counter POS)',
    icon: ShoppingBag,
    description: 'Direct counter cash sales, receipt printing & stock deductions',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    key: 'creditSales',
    label: 'Credit Sales & Debtors',
    icon: CreditCard,
    description: 'Credit invoices, customer balances & payment due tracking',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    key: 'customers',
    label: 'Customer Accounts',
    icon: Users,
    description: 'Customer directory, contact numbers & credit limits',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    key: 'suppliers',
    label: 'Suppliers & Vendors',
    icon: Truck,
    description: 'Supplier directory, categories & contact details',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    key: 'purchases',
    label: 'Purchases & Receiving (GRV)',
    icon: ShoppingCart,
    description: 'Cash & Credit Goods Receiving Vouchers from suppliers',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    key: 'stockMovements',
    label: 'Stock Movements & Adjustments',
    icon: ArrowLeftRight,
    description: 'Physical count corrections (+ve/-ve) and disposal write-offs',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    key: 'stockRequests',
    label: 'Stock Issue & Requisitions',
    icon: SendToBack,
    description: 'Inter-department requisitions and warehouse stock issue',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    key: 'consumption',
    label: 'Branch & Kitchen Consumption',
    icon: Flame,
    description: 'Daily consumption logging, production usage & kitchen waste',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    key: 'reports',
    label: 'Financial Reports & Analytics',
    icon: BarChart3,
    description: 'Stock valuation, daily summaries, profit & loss analysis',
    actions: ['read', 'export'],
  },
  {
    key: 'staffAccounts',
    label: 'Staff Accounts & Passwords',
    icon: ShieldCheck,
    description: 'User registration, staff roles & password management',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    key: 'settings',
    label: 'System & Pricing Config',
    icon: Settings,
    description: 'Company info, VAT rate, price adjustments & Telegram alerts',
    actions: ['read', 'update'],
  },
  {
    key: 'recycleBin',
    label: 'Recycle Bin & Data Recovery',
    icon: Trash2,
    description: 'Restore soft-deleted items or permanently purge records',
    actions: ['read', 'restore', 'delete'],
  },
];

export const WORKFLOW_CAPABILITIES = [
  { key: 'recordGoods', label: 'Record Goods Receiving (Cash/Credit GRV)' },
  { key: 'checkReview', label: 'Check & Review Transactions (Stage 1 Review)' },
  { key: 'approveGoods', label: 'Approve Goods & Vouchers (Stage 2 Approval)' },
  { key: 'postLedger', label: 'Post Documents to Ledger (Final Stage)' },
  { key: 'voidTransactions', label: 'Void / Reverse Posted Transactions' },
  { key: 'viewReports', label: 'View Financial & Valuation Reports' },
  { key: 'manageAccounts', label: 'Manage Staff Accounts & Security' },
];

export const ACTION_LABELS = {
  create: { label: 'Create', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  read: { label: 'View / Read', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  update: { label: 'Edit / Update', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  delete: { label: 'Delete / Void', badge: 'bg-red-50 text-red-700 border-red-200' },
  export: { label: 'Export Data', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  restore: { label: 'Restore Data', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
};

export default function RolePrivilegesManager({
  systemForm,
  setSystemForm,
  handleSystemSubmit,
  systemSaving,
}) {
  const { user, hasRole, refreshPermissions, updateUser } = useAuth();
  const isAdmin = hasRole('admin');

  // Mode: 'matrix' (Role Defaults) vs 'employee' (Individual Staff)
  const [activeMode, setActiveMode] = useState('employee');

  // Employee Selection State
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Individual Employee Permissions Buffer
  const [employeePerms, setEmployeePerms] = useState({});
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeeSuccess, setEmployeeSuccess] = useState('');
  const [employeeError, setEmployeeError] = useState('');

  // Load Users List
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/users');
      const list = Array.isArray(res.data) ? res.data : [];
      setUsersList(list);
      if (list.length > 0 && !selectedUserId) {
        // default select first non-admin or first user
        const target = list.find((u) => u.role !== 'admin') || list[0];
        setSelectedUserId(target._id);
        initEmployeeBuffer(target, systemForm.rolePermissions);
      }
    } catch (err) {
      console.warn('Failed to load users for permissions manager:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Selected User Object
  const selectedUser = useMemo(() => {
    return usersList.find((u) => u._id === selectedUserId) || null;
  }, [usersList, selectedUserId]);

  // Initialize buffer for employee
  const initEmployeeBuffer = (targetUser, rolePerms) => {
    if (!targetUser) return;
    const role = targetUser.role || 'storekeeper';
    const fallbackPerms = rolePerms || systemForm.rolePermissions || {};

    // If employee already has customPermissions saved in DB
    if (targetUser.customPermissions && typeof targetUser.customPermissions === 'object') {
      setEmployeePerms(JSON.parse(JSON.stringify(targetUser.customPermissions)));
      return;
    }

    // Otherwise, build from their role's defaults
    const initial = {};
    CRUD_MODULES.forEach((mod) => {
      initial[mod.key] = {};
      mod.actions.forEach((act) => {
        const roleVal =
          fallbackPerms?.[mod.key]?.[act]?.[role] ??
          (role === 'admin' ? true : role === 'manager' && act !== 'delete' ? true : act === 'read');
        initial[mod.key][act] = Boolean(roleVal);
      });
    });

    WORKFLOW_CAPABILITIES.forEach((cap) => {
      const roleVal = fallbackPerms?.[cap.key]?.[role] ?? (role === 'admin');
      initial[cap.key] = Boolean(roleVal);
    });

    setEmployeePerms(initial);
  };

  // When selected user changes
  const handleSelectUser = (uid) => {
    setSelectedUserId(uid);
    setEmployeeSuccess('');
    setEmployeeError('');
    const u = usersList.find((item) => item._id === uid);
    if (u) {
      initEmployeeBuffer(u, systemForm.rolePermissions);
    }
  };

  // Check if an employee's permission is currently ALLOWED
  const isEmployeeAllowed = (moduleKey, action) => {
    if (!selectedUser) return false;
    if (action) {
      return Boolean(employeePerms?.[moduleKey]?.[action]);
    }
    return Boolean(employeePerms?.[moduleKey]);
  };

  // Toggle single action for selected employee
  const toggleEmployeeAction = (moduleKey, action) => {
    if (!isAdmin) return;
    setEmployeePerms((prev) => {
      const next = { ...prev };
      if (!next[moduleKey]) next[moduleKey] = {};
      next[moduleKey] = {
        ...next[moduleKey],
        [action]: !next[moduleKey][action],
      };
      return next;
    });
  };

  // Toggle workflow capability for employee
  const toggleEmployeeWorkflow = (capKey) => {
    if (!isAdmin) return;
    setEmployeePerms((prev) => ({
      ...prev,
      [capKey]: !prev[capKey],
    }));
  };

  // Quick Action: Grant All Access
  const handleGrantAll = () => {
    const updated = {};
    CRUD_MODULES.forEach((mod) => {
      updated[mod.key] = {};
      mod.actions.forEach((act) => {
        updated[mod.key][act] = true;
      });
    });
    WORKFLOW_CAPABILITIES.forEach((cap) => {
      updated[cap.key] = true;
    });
    setEmployeePerms(updated);
  };

  // Quick Action: Deny All Write/Delete (Read Only)
  const handleDenyWrite = () => {
    const updated = {};
    CRUD_MODULES.forEach((mod) => {
      updated[mod.key] = {};
      mod.actions.forEach((act) => {
        updated[mod.key][act] = act === 'read';
      });
    });
    WORKFLOW_CAPABILITIES.forEach((cap) => {
      updated[cap.key] = cap.key === 'viewReports';
    });
    setEmployeePerms(updated);
  };

  // Quick Action: Reset to Role Defaults
  const handleResetToRoleDefault = () => {
    if (!selectedUser) return;
    const role = selectedUser.role || 'storekeeper';
    const fallbackPerms = systemForm.rolePermissions || {};
    const updated = {};

    CRUD_MODULES.forEach((mod) => {
      updated[mod.key] = {};
      mod.actions.forEach((act) => {
        const val =
          fallbackPerms?.[mod.key]?.[act]?.[role] ??
          (role === 'admin' ? true : role === 'manager' && act !== 'delete');
        updated[mod.key][act] = Boolean(val);
      });
    });

    WORKFLOW_CAPABILITIES.forEach((cap) => {
      updated[cap.key] = Boolean(fallbackPerms?.[cap.key]?.[role]);
    });

    setEmployeePerms(updated);
  };

  // Save Employee Privileges
  const handleSaveEmployeePerms = async () => {
    if (!selectedUser) return;
    setSavingEmployee(true);
    setEmployeeSuccess('');
    setEmployeeError('');

    try {
      const res = await api.put(`/users/${selectedUser._id}`, {
        customPermissions: employeePerms,
      });

      // Update user in local list
      setUsersList((prev) =>
        prev.map((u) =>
          u._id === selectedUser._id
            ? { ...u, customPermissions: employeePerms }
            : u
        )
      );

      // If current logged in user was modified, update their auth context
      if (user && user._id === selectedUser._id) {
        updateUser({ customPermissions: employeePerms });
      }

      setEmployeeSuccess(`Privileges successfully updated for ${selectedUser.name}!`);
      setTimeout(() => setEmployeeSuccess(''), 5000);
    } catch (err) {
      setEmployeeError(err.response?.data?.message || 'Failed to update employee permissions.');
    } finally {
      setSavingEmployee(false);
    }
  };

  // Filtered users for employee search
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return usersList;
    const q = userSearch.toLowerCase();
    return usersList.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [usersList, userSearch]);

  const hasCustomOverrides = Boolean(selectedUser?.customPermissions);

  return (
    <div className="space-y-6">
      {/* ── Mode Switcher & Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h3 className="font-bold text-base text-white">
                Role &amp; Employee Privileges Manager
              </h3>
              <p className="text-xs text-blue-200/80">
                Grant access or deny individual Create, Read, Update, Delete (CRUD) operations for each employee or configure role defaults.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Pills */}
        <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveMode('employee')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeMode === 'employee'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <User size={14} />
            Employee Privileges
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('matrix')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeMode === 'matrix'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield size={14} />
            Role Default Matrix
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODE 1: EMPLOYEE SPECIFIC PRIVILEGES (User's primary request)
         ═══════════════════════════════════════════════════════════════════ */}
      {activeMode === 'employee' && (
        <div className="space-y-6">
          {/* Employee Selector Bar */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-base border border-blue-100">
                  {selectedUser?.name?.[0]?.toUpperCase() || 'E'}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Employee / Staff Member:
                  </label>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-bold text-ink-900 text-sm">
                      {selectedUser?.name || 'Select Staff'}
                    </span>
                    {selectedUser && (
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          selectedUser.role === 'admin'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : selectedUser.role === 'manager'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {selectedUser.role}
                      </span>
                    )}
                    {hasCustomOverrides ? (
                      <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Sparkles size={11} /> Custom Overrides Active
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        Using Role Defaults
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Employee Selection Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => handleSelectUser(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                >
                  {usersList.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.role}) — {u.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Bulk Actions for this Employee */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 mr-1">Quick Presets:</span>
                <button
                  type="button"
                  onClick={handleGrantAll}
                  disabled={!isAdmin}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1 transition"
                  title="Allow all CRUD actions for this employee"
                >
                  <Unlock size={13} /> Grant All Access
                </button>
                <button
                  type="button"
                  onClick={handleDenyWrite}
                  disabled={!isAdmin}
                  className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold flex items-center gap-1 transition"
                  title="Allow View/Read only, deny all Create, Edit & Delete"
                >
                  <Lock size={13} /> Read Only / Deny Write
                </button>
                <button
                  type="button"
                  onClick={handleResetToRoleDefault}
                  disabled={!isAdmin}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium flex items-center gap-1 transition"
                  title="Reset to their base role default permissions"
                >
                  <RotateCcw size={13} /> Reset to Role Defaults
                </button>
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSaveEmployeePerms}
                disabled={savingEmployee || !isAdmin}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition disabled:opacity-50"
              >
                <Save size={14} />
                {savingEmployee ? 'Saving...' : `Save Privileges for ${selectedUser?.name || 'Staff'}`}
              </button>
            </div>

            {/* Feedback Alerts */}
            {employeeSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{employeeSuccess}</span>
              </div>
            )}
            {employeeError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
                <span>{employeeError}</span>
              </div>
            )}
          </div>

          {/* Granular CRUD Privileges Table for Employee */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-ink-900 flex items-center gap-2">
                  <Layers size={16} className="text-blue-600" />
                  Granular Module Access Matrix
                </h4>
                <p className="text-xs text-slate-500">
                  Toggle individual checkboxes below to give access (green checked) or deny access (unchecked) for <strong>{selectedUser?.name}</strong>.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">
                {CRUD_MODULES.length} Modules
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-bold uppercase text-[11px]">
                    <th className="py-3 px-4">System Module &amp; Description</th>
                    <th className="py-3 px-3 text-center">Create</th>
                    <th className="py-3 px-3 text-center">Read / View</th>
                    <th className="py-3 px-3 text-center">Update / Edit</th>
                    <th className="py-3 px-3 text-center">Delete / Void</th>
                    <th className="py-3 px-4 text-center">Status Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CRUD_MODULES.map((mod) => {
                    const Icon = mod.icon;
                    const canC = mod.actions.includes('create') ? isEmployeeAllowed(mod.key, 'create') : null;
                    const canR = mod.actions.includes('read') ? isEmployeeAllowed(mod.key, 'read') : null;
                    const canU = mod.actions.includes('update')
                      ? isEmployeeAllowed(mod.key, 'update')
                      : mod.actions.includes('restore')
                      ? isEmployeeAllowed(mod.key, 'restore')
                      : null;
                    const canD = mod.actions.includes('delete')
                      ? isEmployeeAllowed(mod.key, 'delete')
                      : mod.actions.includes('export')
                      ? isEmployeeAllowed(mod.key, 'export')
                      : null;

                    const allAllowed =
                      (canC !== false) && (canR !== false) && (canU !== false) && (canD !== false);
                    const allDenied =
                      (canC === false || canC === null) &&
                      (canR === false || canR === null) &&
                      (canU === false || canU === null) &&
                      (canD === false || canD === null);

                    return (
                      <tr key={mod.key} className="hover:bg-slate-50/80 transition">
                        {/* Module Info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                              <Icon size={16} />
                            </div>
                            <div>
                              <div className="font-bold text-ink-900 text-xs">{mod.label}</div>
                              <div className="text-[11px] text-slate-400">{mod.description}</div>
                            </div>
                          </div>
                        </td>

                        {/* CREATE Checkbox */}
                        <td className="py-3 px-3 text-center">
                          {mod.actions.includes('create') ? (
                            <label className="inline-flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={!isAdmin}
                                checked={isEmployeeAllowed(mod.key, 'create')}
                                onChange={() => toggleEmployeeAction(mod.key, 'create')}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                              />
                            </label>
                          ) : (
                            <span className="text-slate-300 font-mono">—</span>
                          )}
                        </td>

                        {/* READ Checkbox */}
                        <td className="py-3 px-3 text-center">
                          {mod.actions.includes('read') ? (
                            <label className="inline-flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={!isAdmin}
                                checked={isEmployeeAllowed(mod.key, 'read')}
                                onChange={() => toggleEmployeeAction(mod.key, 'read')}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                              />
                            </label>
                          ) : (
                            <span className="text-slate-300 font-mono">—</span>
                          )}
                        </td>

                        {/* UPDATE / EDIT Checkbox */}
                        <td className="py-3 px-3 text-center">
                          {mod.actions.includes('update') ? (
                            <label className="inline-flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={!isAdmin}
                                checked={isEmployeeAllowed(mod.key, 'update')}
                                onChange={() => toggleEmployeeAction(mod.key, 'update')}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                              />
                            </label>
                          ) : mod.actions.includes('restore') ? (
                            <label className="inline-flex items-center justify-center cursor-pointer" title="Restore Data">
                              <input
                                type="checkbox"
                                disabled={!isAdmin}
                                checked={isEmployeeAllowed(mod.key, 'restore')}
                                onChange={() => toggleEmployeeAction(mod.key, 'restore')}
                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer disabled:opacity-40"
                              />
                            </label>
                          ) : (
                            <span className="text-slate-300 font-mono">—</span>
                          )}
                        </td>

                        {/* DELETE / VOID Checkbox */}
                        <td className="py-3 px-3 text-center">
                          {mod.actions.includes('delete') ? (
                            <label className="inline-flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={!isAdmin}
                                checked={isEmployeeAllowed(mod.key, 'delete')}
                                onChange={() => toggleEmployeeAction(mod.key, 'delete')}
                                className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer disabled:opacity-40"
                              />
                            </label>
                          ) : mod.actions.includes('export') ? (
                            <label className="inline-flex items-center justify-center cursor-pointer" title="Export Reports">
                              <input
                                type="checkbox"
                                disabled={!isAdmin}
                                checked={isEmployeeAllowed(mod.key, 'export')}
                                onChange={() => toggleEmployeeAction(mod.key, 'export')}
                                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer disabled:opacity-40"
                              />
                            </label>
                          ) : (
                            <span className="text-slate-300 font-mono">—</span>
                          )}
                        </td>

                        {/* Status Summary Pill */}
                        <td className="py-3 px-4 text-center">
                          {allAllowed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check size={11} /> Full Access
                            </span>
                          ) : allDenied ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                              <X size={11} /> Denied
                            </span>
                          ) : canR ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Custom Access
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Restricted
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Workflow Approval Capabilities for this Employee */}
            <div className="p-5 bg-slate-50/60 border-t border-slate-200">
              <h5 className="font-bold text-xs text-ink-900 mb-2">
                Approval &amp; Workflow Stage Privileges for {selectedUser?.name}:
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {WORKFLOW_CAPABILITIES.map((cap) => (
                  <label
                    key={cap.key}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 cursor-pointer transition text-xs"
                  >
                    <input
                      type="checkbox"
                      disabled={!isAdmin}
                      checked={Boolean(employeePerms[cap.key])}
                      onChange={() => toggleEmployeeWorkflow(cap.key)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                    />
                    <span className="font-medium text-slate-700 text-[11px] leading-tight">
                      {cap.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Bottom Save Bar */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Changes apply immediately to <strong>{selectedUser?.name}</strong> upon saving.
              </p>
              <button
                type="button"
                onClick={handleSaveEmployeePerms}
                disabled={savingEmployee || !isAdmin}
                className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
              >
                <Save size={15} />
                {savingEmployee ? 'Saving...' : `Save Privileges for ${selectedUser?.name}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODE 2: GLOBAL ROLE DEFAULT MATRIX (Storekeeper | Manager | Admin)
         ═══════════════════════════════════════════════════════════════════ */}
      {activeMode === 'matrix' && (
        <form onSubmit={handleSystemSubmit} className="space-y-6">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-ink-900 flex items-center gap-2">
                  <Shield size={16} className="text-blue-600" />
                  Global Role Default CRUD Matrix
                </h4>
                <p className="text-xs text-slate-500">
                  Defines the baseline permissions for each role. Staff members inherit these permissions unless individually overridden in Employee Privileges mode.
                </p>
              </div>
              <button
                type="submit"
                disabled={systemSaving || !isAdmin}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition disabled:opacity-50"
              >
                <Save size={14} />
                {systemSaving ? 'Saving Matrix...' : 'Save Role Matrix'}
              </button>
            </div>

            {/* Granular CRUD by Role Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-bold uppercase text-[11px]">
                    <th className="py-3 px-4">Module &amp; Action</th>
                    <th className="py-3 px-4 text-center">Storekeeper</th>
                    <th className="py-3 px-4 text-center">Manager</th>
                    <th className="py-3 px-4 text-center">Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CRUD_MODULES.map((mod) => (
                    <React.Fragment key={mod.key}>
                      {/* Module Header Row */}
                      <tr className="bg-slate-50/70 border-t border-slate-200">
                        <td colSpan={4} className="py-2 px-4 font-bold text-ink-900 text-xs flex items-center gap-2">
                          <mod.icon size={15} className="text-blue-600" />
                          <span>{mod.label}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({mod.description})
                          </span>
                        </td>
                      </tr>

                      {/* Action Sub-rows */}
                      {mod.actions.map((act) => {
                        const actInfo = ACTION_LABELS[act] || { label: act };
                        return (
                          <tr key={`${mod.key}-${act}`} className="hover:bg-slate-50/50 transition">
                            <td className="py-2 px-6 pl-10 text-slate-700 font-medium text-xs">
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300 mr-2" />
                              {actInfo.label}
                            </td>

                            {['storekeeper', 'manager', 'admin'].map((role) => (
                              <td key={role} className="py-2 px-4 text-center">
                                <input
                                  type="checkbox"
                                  disabled={!isAdmin || role === 'admin'}
                                  checked={
                                    role === 'admin'
                                      ? true
                                      : Boolean(
                                          systemForm.rolePermissions?.[mod.key]?.[act]?.[role]
                                        )
                                  }
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSystemForm((prev) => ({
                                      ...prev,
                                      rolePermissions: {
                                        ...prev.rolePermissions,
                                        [mod.key]: {
                                          ...prev.rolePermissions?.[mod.key],
                                          [act]: {
                                            ...prev.rolePermissions?.[mod.key]?.[act],
                                            [role]: checked,
                                          },
                                        },
                                      },
                                    }));
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Workflow Capabilities Matrix */}
            <div className="p-5 bg-slate-50/70 border-t border-slate-200">
              <h5 className="font-bold text-xs text-ink-900 mb-3">
                Workflow Approval Capabilities:
              </h5>
              <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold text-[11px]">
                      <th className="py-2.5 px-4">Workflow Action</th>
                      <th className="py-2.5 px-4 text-center">Storekeeper</th>
                      <th className="py-2.5 px-4 text-center">Manager</th>
                      <th className="py-2.5 px-4 text-center">Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {WORKFLOW_CAPABILITIES.map((cap) => (
                      <tr key={cap.key} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-medium text-slate-700">{cap.label}</td>
                        {['storekeeper', 'manager', 'admin'].map((role) => (
                          <td key={role} className="py-2.5 px-4 text-center">
                            <input
                              type="checkbox"
                              disabled={!isAdmin}
                              checked={Boolean(systemForm.rolePermissions?.[cap.key]?.[role])}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSystemForm((prev) => ({
                                  ...prev,
                                  rolePermissions: {
                                    ...prev.rolePermissions,
                                    [cap.key]: {
                                      ...prev.rolePermissions?.[cap.key],
                                      [role]: checked,
                                    },
                                  },
                                }));
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Save Bar */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end">
              <button
                type="submit"
                disabled={systemSaving || !isAdmin}
                className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
              >
                <Save size={15} />
                {systemSaving ? 'Saving...' : 'Save Role Default Matrix'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
