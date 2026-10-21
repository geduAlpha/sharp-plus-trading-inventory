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
  HelpCircle,
  Eye,
  PlusCircle,
  Pencil,
  Ban,
  SlidersHorizontal,
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
    description: 'Internal food consumption tracking, staff meals & wastage',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    key: 'reports',
    label: 'Financial & Stock Reports',
    icon: BarChart3,
    description: 'Balance sheets, P&L, GRV reports, daily summaries & Excel export',
    actions: ['read', 'export'],
  },
  {
    key: 'staffAccounts',
    label: 'Staff Accounts & Passwords',
    icon: Users,
    description: 'Managing staff login credentials, roles and system accounts',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    key: 'settings',
    label: 'System Configurations',
    icon: Settings,
    description: 'Company profile, currency, taxes & business rules',
    actions: ['read', 'update'],
  },
  {
    key: 'recycleBin',
    label: 'Recycle Bin & Data Recovery',
    icon: Trash2,
    description: 'Restoring accidentally deleted records and permanent purge',
    actions: ['read', 'restore', 'delete'],
  },
];

export const WORKFLOW_CAPABILITIES = [
  { key: 'recordGoods', label: 'Record Goods Receiving (Cash/Credit GRV)' },
  { key: 'checkReview', label: 'Check & Review Transactions (Stage 1)' },
  { key: 'approveGoods', label: 'Approve Goods & Vouchers (Stage 2)' },
  { key: 'postLedger', label: 'Post Documents to Ledger (Final Stage)' },
  { key: 'voidTransactions', label: 'Void / Reverse Posted Transactions' },
  { key: 'viewReports', label: 'View Financial & Valuation Reports' },
  { key: 'manageAccounts', label: 'Manage Staff Accounts & Security' },
];

export const SYSTEM_ROLES = [
  {
    key: 'admin',
    label: 'Admin',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    description: 'Master Super-Administrator with full system ownership and permissions',
  },
  {
    key: 'manager',
    label: 'Manager',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    description: 'Department & operations manager with approval and reporting privileges',
  },
  {
    key: 'storekeeper',
    label: 'Storekeeper',
    badge: 'bg-blue-100 text-blue-900 border-blue-300',
    description: 'Store & inventory operator responsible for goods receiving & counts',
  },
  {
    key: 'cashier',
    label: 'Cashier',
    badge: 'bg-purple-100 text-purple-900 border-purple-300',
    description: 'Front-desk point-of-sale operator processing counter cash & credit sales',
  },
];

export const ACTION_LABELS = {
  create: { label: 'Create / Add', icon: PlusCircle },
  read: { label: 'View / Read', icon: Eye },
  update: { label: 'Edit / Update', icon: Pencil },
  delete: { label: 'Delete / Void', icon: Ban },
  export: { label: 'Export Data', icon: ArrowLeftRight },
  restore: { label: 'Restore Data', icon: RotateCcw },
};

export default function RolePrivilegesManager({
  systemForm,
  setSystemForm,
  handleSystemSubmit,
  systemSaving,
}) {
  const { user, hasRole, refreshPermissions, updateUser } = useAuth();
  const isAdmin = hasRole('admin');

  // Main Mode: 'role' (Access Roles) vs 'staff' (Individual User/Staff Member)
  const [targetType, setTargetType] = useState('role'); // 'role' | 'staff'

  // Selected Role in 'role' mode
  const [selectedRole, setSelectedRole] = useState('manager');

  // Staff Selection State
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Selected User Custom Permissions Buffer
  const [employeePerms, setEmployeePerms] = useState({});
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeeSuccess, setEmployeeSuccess] = useState('');
  const [employeeError, setEmployeeError] = useState('');

  // Filter modules inside permissions view
  const [moduleSearch, setModuleSearch] = useState('');

  // Load Users List
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/users');
      const list = Array.isArray(res.data) ? res.data : [];
      setUsersList(list);
      if (list.length > 0 && !selectedUserId) {
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

  const selectedUser = useMemo(() => {
    return usersList.find((u) => u._id === selectedUserId) || null;
  }, [usersList, selectedUserId]);

  // Initialize employee custom permissions buffer
  const initEmployeeBuffer = (targetUser, rolePerms) => {
    if (!targetUser) return;
    const role = targetUser.role || 'storekeeper';
    const fallbackPerms = rolePerms || systemForm.rolePermissions || {};

    if (targetUser.customPermissions && typeof targetUser.customPermissions === 'object') {
      setEmployeePerms(JSON.parse(JSON.stringify(targetUser.customPermissions)));
      return;
    }

    // Default to role baseline
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

  const handleSelectUser = (uid) => {
    setSelectedUserId(uid);
    setEmployeeSuccess('');
    setEmployeeError('');
    const u = usersList.find((item) => item._id === uid);
    if (u) {
      initEmployeeBuffer(u, systemForm.rolePermissions);
    }
  };

  // ── ROLE PERMISSIONS HELPERS ──
  const isRoleActionAllowed = (roleKey, moduleKey, action) => {
    if (roleKey === 'admin') return true;
    return Boolean(systemForm.rolePermissions?.[moduleKey]?.[action]?.[roleKey]);
  };

  const isRoleWorkflowAllowed = (roleKey, capKey) => {
    if (roleKey === 'admin') return true;
    return Boolean(systemForm.rolePermissions?.[capKey]?.[roleKey]);
  };

  const toggleRoleAction = (roleKey, moduleKey, action) => {
    if (!isAdmin || roleKey === 'admin') return;
    const current = isRoleActionAllowed(roleKey, moduleKey, action);
    setSystemForm((prev) => ({
      ...prev,
      rolePermissions: {
        ...prev.rolePermissions,
        [moduleKey]: {
          ...prev.rolePermissions?.[moduleKey],
          [action]: {
            ...prev.rolePermissions?.[moduleKey]?.[action],
            [roleKey]: !current,
          },
        },
      },
    }));
  };

  const toggleRoleWorkflow = (roleKey, capKey) => {
    if (!isAdmin || roleKey === 'admin') return;
    const current = isRoleWorkflowAllowed(roleKey, capKey);
    setSystemForm((prev) => ({
      ...prev,
      rolePermissions: {
        ...prev.rolePermissions,
        [capKey]: {
          ...prev.rolePermissions?.[capKey],
          [roleKey]: !current,
        },
      },
    }));
  };

  const grantAllToRole = (roleKey) => {
    if (!isAdmin || roleKey === 'admin') return;
    setSystemForm((prev) => {
      const rp = JSON.parse(JSON.stringify(prev.rolePermissions || {}));
      CRUD_MODULES.forEach((mod) => {
        if (!rp[mod.key]) rp[mod.key] = {};
        mod.actions.forEach((act) => {
          if (!rp[mod.key][act]) rp[mod.key][act] = {};
          rp[mod.key][act][roleKey] = true;
        });
      });
      WORKFLOW_CAPABILITIES.forEach((cap) => {
        if (!rp[cap.key]) rp[cap.key] = {};
        rp[cap.key][roleKey] = true;
      });
      return { ...prev, rolePermissions: rp };
    });
  };

  const denyWriteToRole = (roleKey) => {
    if (!isAdmin || roleKey === 'admin') return;
    setSystemForm((prev) => {
      const rp = JSON.parse(JSON.stringify(prev.rolePermissions || {}));
      CRUD_MODULES.forEach((mod) => {
        if (!rp[mod.key]) rp[mod.key] = {};
        mod.actions.forEach((act) => {
          if (!rp[mod.key][act]) rp[mod.key][act] = {};
          rp[mod.key][act][roleKey] = act === 'read';
        });
      });
      WORKFLOW_CAPABILITIES.forEach((cap) => {
        if (!rp[cap.key]) rp[cap.key] = {};
        rp[cap.key][roleKey] = cap.key === 'viewReports';
      });
      return { ...prev, rolePermissions: rp };
    });
  };

  const denyAllToRole = (roleKey) => {
    if (!isAdmin || roleKey === 'admin') return;
    setSystemForm((prev) => {
      const rp = JSON.parse(JSON.stringify(prev.rolePermissions || {}));
      CRUD_MODULES.forEach((mod) => {
        if (!rp[mod.key]) rp[mod.key] = {};
        mod.actions.forEach((act) => {
          if (!rp[mod.key][act]) rp[mod.key][act] = {};
          rp[mod.key][act][roleKey] = false;
        });
      });
      WORKFLOW_CAPABILITIES.forEach((cap) => {
        if (!rp[cap.key]) rp[cap.key] = {};
        rp[cap.key][roleKey] = false;
      });
      return { ...prev, rolePermissions: rp };
    });
  };

  // ── STAFF INDIVIDUAL HELPERS ──
  const isEmployeeAllowed = (moduleKey, action) => {
    if (!selectedUser) return false;
    if (action) {
      return Boolean(employeePerms?.[moduleKey]?.[action]);
    }
    return Boolean(employeePerms?.[moduleKey]);
  };

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

  const toggleEmployeeWorkflow = (capKey) => {
    if (!isAdmin) return;
    setEmployeePerms((prev) => ({
      ...prev,
      [capKey]: !prev[capKey],
    }));
  };

  const handleGrantAllEmployee = () => {
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

  const handleDenyWriteEmployee = () => {
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

  const handleDenyAllEmployee = () => {
    const updated = {};
    CRUD_MODULES.forEach((mod) => {
      updated[mod.key] = {};
      mod.actions.forEach((act) => {
        updated[mod.key][act] = false;
      });
    });
    WORKFLOW_CAPABILITIES.forEach((cap) => {
      updated[cap.key] = false;
    });
    setEmployeePerms(updated);
  };

  const handleResetToRoleDefault = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`Reset ${selectedUser.name}'s permissions back to their default role (${selectedUser.role}) permissions?`)) return;

    setSavingEmployee(true);
    try {
      await api.put(`/users/${selectedUser._id}`, { customPermissions: null });
      setUsersList((prev) =>
        prev.map((u) =>
          u._id === selectedUser._id ? { ...u, customPermissions: null } : u
        )
      );
      initEmployeeBuffer({ ...selectedUser, customPermissions: null }, systemForm.rolePermissions);
      if (user && user._id === selectedUser._id) {
        updateUser({ customPermissions: null });
      }
      setEmployeeSuccess(`Custom overrides cleared for ${selectedUser.name}. Now using ${selectedUser.role} role defaults.`);
      setTimeout(() => setEmployeeSuccess(''), 4000);
    } catch (err) {
      setEmployeeError('Failed to reset privileges.');
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleSaveEmployeePerms = async () => {
    if (!selectedUser) return;
    setSavingEmployee(true);
    setEmployeeSuccess('');
    setEmployeeError('');

    try {
      await api.put(`/users/${selectedUser._id}`, {
        customPermissions: employeePerms,
      });

      setUsersList((prev) =>
        prev.map((u) =>
          u._id === selectedUser._id
            ? { ...u, customPermissions: employeePerms }
            : u
        )
      );

      if (user && user._id === selectedUser._id) {
        updateUser({ customPermissions: employeePerms });
      }

      setEmployeeSuccess(`Privileges successfully saved and activated for ${selectedUser.name}!`);
      setTimeout(() => setEmployeeSuccess(''), 5000);
    } catch (err) {
      setEmployeeError(err.response?.data?.message || 'Failed to update employee permissions.');
    } finally {
      setSavingEmployee(false);
    }
  };

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

  const filteredModules = useMemo(() => {
    if (!moduleSearch.trim()) return CRUD_MODULES;
    const q = moduleSearch.toLowerCase();
    return CRUD_MODULES.filter(
      (m) => m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
    );
  }, [moduleSearch]);

  const hasCustomOverrides = Boolean(selectedUser?.customPermissions);

  return (
    <div className="space-y-6">
      {/* ── Mode Selection Header ── */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Access Control &amp; Privileges Management</h2>
              <p className="text-xs text-indigo-300">
                Configure baseline access for each Access Role or grant/deny specific access for individual staff members.
              </p>
            </div>
          </div>

          {/* Segmented Mode Switch */}
          <div className="inline-flex rounded-2xl bg-slate-950/80 p-1.5 border border-slate-700/60 self-start md:self-auto shadow-inner">
            <button
              type="button"
              onClick={() => setTargetType('role')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                targetType === 'role'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield size={14} />
              <span>By Access Role</span>
            </button>

            <button
              type="button"
              onClick={() => setTargetType('staff')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                targetType === 'staff'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User size={14} />
              <span>By User / Staff Member</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION A: CONFIGURE BY ACCESS ROLE (Admin, Manager, Storekeeper, Cashier)
         ═══════════════════════════════════════════════════════════════════ */}
      {targetType === 'role' && (
        <form onSubmit={handleSystemSubmit} className="space-y-6 animate-in fade-in duration-200">
          {/* Role Tabs Card */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select Access Role to Configure:
                </label>
                <h3 className="text-sm font-black text-slate-900 mt-0.5">
                  Role: {SYSTEM_ROLES.find(r => r.key === selectedRole)?.label}
                </h3>
              </div>

              {/* Role Selection Buttons */}
              <div className="flex flex-wrap gap-2">
                {SYSTEM_ROLES.map((role) => (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => setSelectedRole(role.key)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                      selectedRole === role.key
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{role.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Role Header Description & Quick Presets */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs text-slate-500 max-w-md">
                {SYSTEM_ROLES.find(r => r.key === selectedRole)?.description}
              </p>

              {selectedRole !== 'admin' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Role Presets:</span>
                  <button
                    type="button"
                    onClick={() => grantAllToRole(selectedRole)}
                    disabled={!isAdmin}
                    className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 transition shadow-xs"
                  >
                    <Unlock size={12} /> Give All Access
                  </button>
                  <button
                    type="button"
                    onClick={() => denyWriteToRole(selectedRole)}
                    disabled={!isAdmin}
                    className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1 transition shadow-xs"
                  >
                    <Lock size={12} /> Read-Only Access
                  </button>
                  <button
                    type="button"
                    onClick={() => denyAllToRole(selectedRole)}
                    disabled={!isAdmin}
                    className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1 transition shadow-xs"
                  >
                    <Ban size={12} /> Deny All Access
                  </button>
                </div>
              ) : (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                  👑 Super Admin always has full access to all features.
                </span>
              )}
            </div>
          </div>

          {/* Workflow Approval Capabilities for Role */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-indigo-600" />
                  Workflow &amp; Approval Privileges
                </h4>
                <p className="text-xs text-slate-500">
                  Allow or deny approval and authorization powers for the <strong>{selectedRole}</strong> role.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {WORKFLOW_CAPABILITIES.map((cap) => {
                const allowed = isRoleWorkflowAllowed(selectedRole, cap.key);
                return (
                  <div
                    key={cap.key}
                    onClick={() => toggleRoleWorkflow(selectedRole, cap.key)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                      allowed
                        ? 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50'
                        : 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50/80'
                    }`}
                  >
                    <div className="pr-2">
                      <span className="text-xs font-bold text-slate-800 block">{cap.label}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                          allowed
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-rose-600 text-white shadow-xs'
                        }`}
                      >
                        {allowed ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                        <span>{allowed ? 'GIVE ACCESS' : 'DENY ACCESS'}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Granular CRUD Module Access for Role */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Layers size={16} className="text-indigo-600" />
                  Module Operations: Give vs. Deny Access
                </h4>
                <p className="text-xs text-slate-500">
                  Toggle each action below to explicitly give access (green) or deny access (red) for <strong>{selectedRole}</strong>.
                </p>
              </div>

              {/* Module Search */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter modules..."
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <div key={mod.key} className="p-4 hover:bg-slate-50/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-[260px]">
                      <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Icon size={18} />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{mod.label}</span>
                        <span className="text-[11px] text-slate-400 block">{mod.description}</span>
                      </div>
                    </div>

                    {/* Action Buttons for this Module */}
                    <div className="flex flex-wrap items-center gap-2">
                      {mod.actions.map((act) => {
                        const actConfig = ACTION_LABELS[act] || { label: act, icon: Check };
                        const ActionIcon = actConfig.icon;
                        const allowed = isRoleActionAllowed(selectedRole, mod.key, act);
                        return (
                          <button
                            key={act}
                            type="button"
                            disabled={!isAdmin || selectedRole === 'admin'}
                            onClick={() => toggleRoleAction(selectedRole, mod.key, act)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                              allowed
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                            }`}
                          >
                            <ActionIcon size={12} strokeWidth={2.5} />
                            <span>{actConfig.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${allowed ? 'bg-emerald-200/80 text-emerald-900' : 'bg-rose-200/80 text-rose-900'}`}>
                              {allowed ? 'GIVE' : 'DENY'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Save Bar */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Saving updates baseline role privileges immediately across all accounts assigned to <strong>{selectedRole}</strong>.
              </p>
              <button
                type="submit"
                disabled={systemSaving || !isAdmin}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                <Save size={15} />
                <span>{systemSaving ? 'Saving Changes...' : `Save Privileges for ${selectedRole.toUpperCase()}`}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION B: CONFIGURE BY USER / STAFF MEMBER (Individual Overrides)
         ═══════════════════════════════════════════════════════════════════ */}
      {targetType === 'staff' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* User Selector Bar */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 font-black text-lg border border-indigo-100">
                  {selectedUser?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Individual Staff Member Selected:
                  </label>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-black text-slate-900 text-base">
                      {selectedUser?.name || 'Select Staff Member'}
                    </span>
                    {selectedUser && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {selectedUser.role}
                      </span>
                    )}
                    {hasCustomOverrides ? (
                      <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Sparkles size={11} /> Custom Overrides Active
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        Inheriting Role Defaults
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Staff Select Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => handleSelectUser(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 shadow-sm"
                >
                  {usersList.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.role.toUpperCase()}) — {u.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Presets for this individual staff */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Staff Presets:</span>
                <button
                  type="button"
                  onClick={handleGrantAllEmployee}
                  disabled={!isAdmin}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 transition shadow-xs"
                >
                  <Unlock size={12} /> Give Full Access
                </button>
                <button
                  type="button"
                  onClick={handleDenyWriteEmployee}
                  disabled={!isAdmin}
                  className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1 transition shadow-xs"
                >
                  <Lock size={12} /> Read-Only Access
                </button>
                <button
                  type="button"
                  onClick={handleDenyAllEmployee}
                  disabled={!isAdmin}
                  className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1 transition shadow-xs"
                >
                  <Ban size={12} /> Deny All Access
                </button>
                <button
                  type="button"
                  onClick={handleResetToRoleDefault}
                  disabled={!isAdmin}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1 transition shadow-xs"
                >
                  <RotateCcw size={12} /> Reset to {selectedUser?.role} Defaults
                </button>
              </div>

              {/* Save Button for Staff */}
              <button
                type="button"
                onClick={handleSaveEmployeePerms}
                disabled={savingEmployee || !isAdmin}
                className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
              >
                <Save size={15} />
                <span>{savingEmployee ? 'Saving...' : `Save Privileges for ${selectedUser?.name || 'Staff'}`}</span>
              </button>
            </div>

            {/* Status alerts */}
            {employeeSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{employeeSuccess}</span>
              </div>
            )}
            {employeeError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
                <span>{employeeError}</span>
              </div>
            )}
          </div>

          {/* Workflow Capabilities for Selected Staff Member */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-indigo-600" />
                  Individual Workflow &amp; Approval Authority
                </h4>
                <p className="text-xs text-slate-500">
                  Allow or revoke approval powers for <strong>{selectedUser?.name}</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {WORKFLOW_CAPABILITIES.map((cap) => {
                const allowed = Boolean(employeePerms[cap.key]);
                return (
                  <div
                    key={cap.key}
                    onClick={() => toggleEmployeeWorkflow(cap.key)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                      allowed
                        ? 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50'
                        : 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50/80'
                    }`}
                  >
                    <div className="pr-2">
                      <span className="text-xs font-bold text-slate-800 block">{cap.label}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                          allowed
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-rose-600 text-white shadow-xs'
                        }`}
                      >
                        {allowed ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                        <span>{allowed ? 'GIVE ACCESS' : 'DENY ACCESS'}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Granular Module Matrix for Staff Member */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Layers size={16} className="text-indigo-600" />
                  Individual Module Permissions: Give vs. Deny Access
                </h4>
                <p className="text-xs text-slate-500">
                  Click any action to switch between <strong>Give Access (Green)</strong> and <strong>Deny Access (Red)</strong> for <strong>{selectedUser?.name}</strong>.
                </p>
              </div>

              {/* Module Search */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter modules..."
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <div key={mod.key} className="p-4 hover:bg-slate-50/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-[260px]">
                      <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Icon size={18} />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{mod.label}</span>
                        <span className="text-[11px] text-slate-400 block">{mod.description}</span>
                      </div>
                    </div>

                    {/* Action Buttons for this Module */}
                    <div className="flex flex-wrap items-center gap-2">
                      {mod.actions.map((act) => {
                        const actConfig = ACTION_LABELS[act] || { label: act, icon: Check };
                        const ActionIcon = actConfig.icon;
                        const allowed = isEmployeeAllowed(mod.key, act);
                        return (
                          <button
                            key={act}
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => toggleEmployeeAction(mod.key, act)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                              allowed
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                            }`}
                          >
                            <ActionIcon size={12} strokeWidth={2.5} />
                            <span>{actConfig.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${allowed ? 'bg-emerald-200/80 text-emerald-900' : 'bg-rose-200/80 text-rose-900'}`}>
                              {allowed ? 'GIVE' : 'DENY'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Save Bar */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Custom privileges override role defaults and become active immediately for <strong>{selectedUser?.name}</strong>.
              </p>
              <button
                type="button"
                onClick={handleSaveEmployeePerms}
                disabled={savingEmployee || !isAdmin}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                <Save size={15} />
                <span>{savingEmployee ? 'Saving Changes...' : `Save Privileges for ${selectedUser?.name}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
