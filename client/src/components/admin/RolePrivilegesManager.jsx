import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useThemeSidebar } from '../../context/ThemeSidebarContext';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
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
  Eye,
  PlusCircle,
  Pencil,
  Ban,
  Scale,
  Activity,
  Printer,
  ChevronDown,
  ChevronRight,
  Filter,
  AlertCircle,
  Info,
  Sparkles,
  UserCheck,
  XCircle,
} from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

// ── Roles Available in Sharp Plus ──
export const SYSTEM_ROLES = [
  {
    key: 'admin',
    label: 'Admin',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    description: 'System Administrator with operational authority',
  },
  {
    key: 'manager',
    label: 'Manager',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    description: 'Department & operations manager with check, review and approval authority',
  },
  {
    key: 'storekeeper',
    label: 'Storekeeper',
    badge: 'bg-blue-100 text-blue-900 border-blue-300',
    description: 'Warehouse & inventory custodian managing stock receiving, issues & counts',
  },
  {
    key: 'cashier',
    label: 'Cashier',
    badge: 'bg-purple-100 text-purple-900 border-purple-300',
    description: 'Front-desk operator handling over-the-counter cash and credit sales',
  },
];

// ── 7 Standard Matrix Columns ──
export const MATRIX_ACTIONS = [
  { key: 'view', label: 'View', aliases: ['read', 'view'], icon: Eye, color: 'blue' },
  { key: 'create', label: 'Create', aliases: ['create', 'add'], icon: PlusCircle, color: 'emerald' },
  { key: 'edit', label: 'Edit', aliases: ['edit', 'update'], icon: Pencil, color: 'amber' },
  { key: 'delete', label: 'Delete', aliases: ['delete', 'void'], icon: Ban, color: 'rose' },
  { key: 'approve', label: 'Approve', aliases: ['approve'], icon: CheckCircle2, color: 'purple' },
  { key: 'reject', label: 'Reject', aliases: ['reject'], icon: XCircle, color: 'red' },
  { key: 'export', label: 'Print / Export', aliases: ['export', 'print'], icon: Printer, color: 'cyan' },
];

// ── System Modules Grouped Logically ──
export const MODULE_GROUPS = [
  {
    group: 'Inventory & Stock Operations',
    modules: [
      {
        key: 'items',
        label: 'Items & Raw Materials',
        description: 'Catalog items, inventory balances, reorder alerts & store allocations',
        icon: Package,
      },
      {
        key: 'products',
        label: 'Products & Recipes',
        description: 'Finished products, recipe formulations & menu prices',
        icon: Coffee,
      },
      {
        key: 'purchases',
        label: 'Purchases & Receiving (GRV)',
        description: 'Cash GRV, Credit GRV, supplier deliveries & receiving vouchers',
        icon: ShoppingCart,
      },
      {
        key: 'stockMovements',
        label: 'Stock Movements & Adjustments',
        description: '+ve/-ve stock adjustments, transfers & disposal write-offs',
        icon: ArrowLeftRight,
      },
      {
        key: 'stockRequests',
        label: 'Stock Issue & Requisitions',
        description: 'Inter-department stock requisitions & warehouse issue approvals',
        icon: SendToBack,
      },
      {
        key: 'inventoryCount',
        label: 'Inventory Count & Audits',
        description: 'Periodic physical inventory counts, variance checks & reconciliation',
        icon: Scale,
      },
      {
        key: 'consumption',
        label: 'Branch & Internal Consumption',
        description: 'Kitchen consumption tracking, staff meals, and production usage',
        icon: Flame,
      },
    ],
  },
  {
    group: 'Sales & Commercial Operations',
    modules: [
      {
        key: 'cashSales',
        label: 'Cash Sales (Counter POS)',
        description: 'Direct counter cash sales, receipt printing & instant stock deductions',
        icon: ShoppingBag,
      },
      {
        key: 'creditSales',
        label: 'Credit Sales & Invoicing',
        description: 'Credit sales vouchers, customer balances & payment due tracking',
        icon: CreditCard,
      },
      {
        key: 'customers',
        label: 'Customer Accounts',
        description: 'Customer directory, contact numbers & credit limits',
        icon: Users,
      },
      {
        key: 'suppliers',
        label: 'Suppliers & Vendors',
        description: 'Supplier directory, categories, payment terms & contact details',
        icon: Truck,
      },
    ],
  },
  {
    group: 'Reports, Analytics & Administration',
    modules: [
      {
        key: 'reports',
        label: 'Financial & Stock Reports',
        description: 'Balance sheets, daily summaries, GRV registries & Excel/PDF export',
        icon: BarChart3,
      },
      {
        key: 'analytics',
        label: 'Analytics & Profit / Loss',
        description: 'Stock valuation trends, category distribution & P&L intelligence',
        icon: Activity,
      },
      {
        key: 'staffAccounts',
        label: 'Staff Accounts & Passwords',
        description: 'Staff directory, account credentials, roles & system access',
        icon: ShieldCheck,
      },
      {
        key: 'settings',
        label: 'System Configurations',
        description: 'Company profile, currency, tax parameters & business rules',
        icon: Settings,
      },
      {
        key: 'recycleBin',
        label: 'Recycle Bin & Data Recovery',
        description: 'Restoring soft-deleted documents, materials & permanent purge',
        icon: Trash2,
      },
    ],
  },
  {
    group: 'Workflow & Authorization Authorities',
    modules: [
      {
        key: 'workflow_checkReview',
        canonicalKey: 'checkReview',
        label: 'Check & Review Transactions (Stage 1)',
        description: 'Authority to examine and verify prepared GRV, adjustments & sales vouchers',
        icon: Eye,
      },
      {
        key: 'workflow_approveGoods',
        canonicalKey: 'approveGoods',
        label: 'Approve Goods & Vouchers (Stage 2)',
        description: 'Authority to officially approve receiving vouchers and release stock',
        icon: CheckCircle2,
      },
      {
        key: 'workflow_postLedger',
        canonicalKey: 'postLedger',
        label: 'Post Documents to Ledger (Final Stage)',
        description: 'Final posting authority that locks transactions into the general ledger',
        icon: Layers,
      },
      {
        key: 'workflow_voidTransactions',
        canonicalKey: 'voidTransactions',
        label: 'Void / Reverse Posted Transactions',
        description: 'Authority to cancel or void already posted inventory vouchers',
        icon: Ban,
      },
    ],
  },
];

export default function RolePrivilegesManager() {
  const { user, rolePermissions: contextRolePermissions, refreshPermissions } = useAuth();
  const themeContext = useThemeSidebar();
  const toggleModule = themeContext?.toggleModule;
  const isDeveloper = user?.role === 'developer';
  const isAdmin = user?.role === 'admin';

  // Authority Delegation state
  const [allowAdminManage, setAllowAdminManage] = useState(false);
  const [togglingAdminAuth, setTogglingAdminAuth] = useState(false);
  const [allowAdminVoidDelete, setAllowAdminVoidDelete] = useState(false);
  const [togglingAdminVoidAuth, setTogglingAdminVoidAuth] = useState(false);

  // Company-Level Sales & Marketing Module Activation State (Developer Controlled)
  const [salesMarketingEnabled, setSalesMarketingEnabled] = useState(true);
  const [togglingSalesModule, setTogglingSalesModule] = useState(false);

  // Mode: 'role' (Access Roles) vs 'staff' (Individual Staff Member)
  const [activeTab, setActiveTab] = useState('role');
  const [selectedRole, setSelectedRole] = useState('manager');

  // Authority check for managing individual employee permissions
  const canManageStaff = isDeveloper || (isAdmin && allowAdminManage);

  // Helper: check if a module belongs to Sales and Marketing MS (Developer/Owner exclusive)
  const isSalesModule = (modKey) => {
    return ['cashSales', 'creditSales', 'customers', 'salesMarketing', 'sales_cash', 'sales_credit'].includes(modKey);
  };

  // Specific authority check for a given module: Admin cannot manage Sales & Marketing MS
  const canManageModuleForStaff = (modKey) => {
    if (isDeveloper) return true;
    if (isAdmin && allowAdminManage) {
      if (isSalesModule(modKey)) return false;
      return true;
    }
    return false;
  };

  // Staff Mode State
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');

  // Working State for Role Permissions & Staff Overrides
  const [workingRolePermissions, setWorkingRolePermissions] = useState({});
  const [workingStaffPermissions, setWorkingStaffPermissions] = useState({});

  // UI Search & Group Collapsing
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Confirmation Modal & Feedback State
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Load Settings & Staff on mount
  const loadInitialData = useCallback(async () => {
    try {
      const res = await api.get('/settings');
      if (res.data?.rolePermissions) {
        setWorkingRolePermissions(JSON.parse(JSON.stringify(res.data.rolePermissions)));
      }
      if (res.data?.allowAdminManagePermissions !== undefined) {
        setAllowAdminManage(Boolean(res.data.allowAdminManagePermissions));
      }
      if (res.data?.allowAdminVoidDelete !== undefined) {
        setAllowAdminVoidDelete(Boolean(res.data.allowAdminVoidDelete));
      }
      if (res.data?.modulesEnabled?.salesMarketing !== undefined) {
        setSalesMarketingEnabled(Boolean(res.data.modulesEnabled.salesMarketing));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }

    try {
      setStaffLoading(true);
      const res = await api.get('/users');
      const users = Array.isArray(res.data) ? res.data : [];
      setStaffList(users);

      const availableStaff = isDeveloper ? users : users.filter(s => s.role !== 'developer' && s.role !== 'admin');
      if (availableStaff.length > 0 && !selectedStaffId) {
        setSelectedStaffId(availableStaff[0]._id);
        setWorkingStaffPermissions(availableStaff[0].customPermissions ? JSON.parse(JSON.stringify(availableStaff[0].customPermissions)) : {});
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setStaffLoading(false);
    }
  }, [selectedStaffId, isDeveloper]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Developer toggle to authorize System Admin to manage employee permissions
  const handleToggleAdminManage = async (enable) => {
    if (!isDeveloper) return;
    setTogglingAdminAuth(true);
    try {
      await api.put('/settings', { allowAdminManagePermissions: enable });
      setAllowAdminManage(enable);
      await refreshPermissions();
      setFeedback({
        type: 'success',
        message: `System Admin authority to configure employee privileges has been ${enable ? 'AUTHORIZED' : 'REVOKED'}.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update admin delegation authority.',
      });
    } finally {
      setTogglingAdminAuth(false);
    }
  };

  // Developer toggle to authorize System Admin to void and delete inventory transactions (GRVs, etc.)
  const handleToggleAdminVoidDelete = async (enable) => {
    if (!isDeveloper) return;
    setTogglingAdminVoidAuth(true);
    try {
      await api.put('/settings', { allowAdminVoidDelete: enable });
      setAllowAdminVoidDelete(enable);
      await refreshPermissions();
      setFeedback({
        type: 'success',
        message: `System Admin authority to Void & Delete transactions (GRVs, Sales, Adjustments) has been ${enable ? 'AUTHORIZED' : 'REVOKED'}.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update transaction void/delete delegation authority.',
      });
    } finally {
      setTogglingAdminVoidAuth(false);
    }
  };

  // Developer Master Toggle: Turn Sales & Marketing MS ON or OFF for Company
  const handleToggleSalesMarketing = async (enable) => {
    if (!isDeveloper) return;
    setTogglingSalesModule(true);
    try {
      await api.put('/settings', {
        modulesEnabled: { salesMarketing: enable },
      });
      setSalesMarketingEnabled(enable);
      if (toggleModule) {
        await toggleModule('salesMarketing', enable);
      }
      await refreshPermissions();
      setFeedback({
        type: 'success',
        message: `Sales and Marketing MS has been ${enable ? 'ACTIVATED' : 'DEACTIVATED'} for the company. Sidebar menus are now ${enable ? 'VISIBLE to authorized employees' : 'HIDDEN from all company staff'}.`,
      });
      setTimeout(() => setFeedback(null), 4500);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update Sales & Marketing module status.',
      });
    } finally {
      setTogglingSalesModule(false);
    }
  };

  // Filter staff list: Admins can only see and manage employee accounts
  const displayedStaffList = useMemo(() => {
    if (isDeveloper) return staffList;
    return staffList.filter(s => s.role !== 'developer' && s.role !== 'admin');
  }, [staffList, isDeveloper]);

  // Sync working staff permissions when selected staff changes
  const selectedStaff = useMemo(() => {
    return displayedStaffList.find(s => s._id === selectedStaffId) || null;
  }, [displayedStaffList, selectedStaffId]);

  useEffect(() => {
    if (selectedStaff) {
      setWorkingStaffPermissions(
        selectedStaff.customPermissions ? JSON.parse(JSON.stringify(selectedStaff.customPermissions)) : {}
      );
    }
  }, [selectedStaff]);

  // Helper: Read a permission for a role
  const getRolePermission = (moduleKey, actionKey, role) => {
    // If it's a workflow single-capability module
    if (moduleKey.startsWith('workflow_')) {
      const capKey = moduleKey.replace('workflow_', '');
      const val = workingRolePermissions?.[capKey]?.[role];
      return val !== undefined ? Boolean(val) : false;
    }

    const mod = workingRolePermissions?.[moduleKey];
    if (!mod) return false;

    // Check specific action
    if (mod[actionKey] && mod[actionKey][role] !== undefined) {
      return Boolean(mod[actionKey][role]);
    }

    // Check action aliases (e.g. read -> view)
    const actionDef = MATRIX_ACTIONS.find(a => a.key === actionKey);
    if (actionDef) {
      for (const alias of actionDef.aliases) {
        if (mod[alias] && mod[alias][role] !== undefined) {
          return Boolean(mod[alias][role]);
        }
      }
    }

    // Default admin true, others false
    return role === 'admin';
  };

  // Helper: Set a permission for a role
  const setRolePermission = (moduleKey, actionKey, role, value) => {
    setWorkingRolePermissions(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}));

      // Workflow single-capability
      if (moduleKey.startsWith('workflow_')) {
        const capKey = moduleKey.replace('workflow_', '');
        if (!next[capKey]) next[capKey] = {};
        next[capKey][role] = value;
        return next;
      }

      if (!next[moduleKey]) next[moduleKey] = {};
      if (!next[moduleKey][actionKey]) next[moduleKey][actionKey] = {};
      next[moduleKey][actionKey][role] = value;

      // Sync aliases (e.g. view <-> read, edit <-> update)
      if (actionKey === 'view') {
        if (!next[moduleKey].read) next[moduleKey].read = {};
        next[moduleKey].read[role] = value;
      }
      if (actionKey === 'edit') {
        if (!next[moduleKey].update) next[moduleKey].update = {};
        next[moduleKey].update[role] = value;
      }

      return next;
    });
  };

  // Helper: Get staff status for a cell: { state: 'inherited' | 'override_granted' | 'override_denied', value: boolean }
  const getStaffPermissionStatus = (moduleKey, actionKey) => {
    const staffRole = selectedStaff?.role || 'employee';
    const roleVal = getRolePermission(moduleKey, actionKey, staffRole);

    let customVal = undefined;
    if (moduleKey.startsWith('workflow_')) {
      const capKey = moduleKey.replace('workflow_', '');
      customVal = workingStaffPermissions?.[capKey];
    } else {
      customVal = workingStaffPermissions?.[moduleKey]?.[actionKey];
      if (customVal === undefined) {
        const actionDef = MATRIX_ACTIONS.find(a => a.key === actionKey);
        if (actionDef) {
          for (const alias of actionDef.aliases) {
            if (workingStaffPermissions?.[moduleKey]?.[alias] !== undefined) {
              customVal = workingStaffPermissions[moduleKey][alias];
              break;
            }
          }
        }
      }
    }

    if (customVal === true) {
      return { state: 'override_granted', value: true, inherited: roleVal };
    }
    if (customVal === false) {
      return { state: 'override_denied', value: false, inherited: roleVal };
    }
    return { state: 'inherited', value: roleVal, inherited: roleVal };
  };

  // Helper: Cycle staff permission: Inherited -> Override Granted -> Override Denied -> Inherited
  const toggleStaffPermission = (moduleKey, actionKey) => {
    if (!canManageModuleForStaff(moduleKey) || !selectedStaffId) {
      if (!isDeveloper && isSalesModule(moduleKey)) {
        setFeedback({
          type: 'error',
          message: 'Sales & Marketing MS privileges are reserved exclusively for the System Developer & Owner. Administrators cannot assign or modify access to this module.',
        });
        setTimeout(() => setFeedback(null), 4000);
      }
      return;
    }

    const current = getStaffPermissionStatus(moduleKey, actionKey);

    setWorkingStaffPermissions(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}));

      // Workflow single-capability
      if (moduleKey.startsWith('workflow_')) {
        const capKey = moduleKey.replace('workflow_', '');
        if (current.state === 'inherited') {
          // If inherited was true, flip to denied false; if false, flip to granted true
          next[capKey] = !current.inherited;
        } else if ((current.state === 'override_granted' && !current.inherited) ||
                   (current.state === 'override_denied' && current.inherited)) {
          // Flip to the opposite override
          next[capKey] = !current.value;
        } else {
          // Return to inherited
          delete next[capKey];
        }
        return next;
      }

      if (!next[moduleKey]) next[moduleKey] = {};

      if (current.state === 'inherited') {
        next[moduleKey][actionKey] = !current.inherited;
      } else if ((current.state === 'override_granted' && !current.inherited) ||
                 (current.state === 'override_denied' && current.inherited)) {
        next[moduleKey][actionKey] = !current.value;
      } else {
        // Clear override
        delete next[moduleKey][actionKey];
        if (Object.keys(next[moduleKey]).length === 0) {
          delete next[moduleKey];
        }
      }

      return next;
    });
  };

  // Bulk Actions
  const handleBulkRoleAction = (type) => {
    const roleName = SYSTEM_ROLES.find(r => r.key === selectedRole)?.label || selectedRole;
    setConfirmModal({
      open: true,
      title: type === 'enable' ? `Enable All Permissions for ${roleName}?` : `Disable All Permissions for ${roleName}?`,
      message: type === 'enable'
        ? `This will grant all permissions across all modules to the ${roleName} role. Are you sure you want to proceed?`
        : `This will revoke all permissions across all modules for the ${roleName} role. Are you sure you want to proceed?`,
      onConfirm: () => {
        const val = type === 'enable';
        setWorkingRolePermissions(prev => {
          const next = JSON.parse(JSON.stringify(prev || {}));
          MODULE_GROUPS.forEach(g => {
            g.modules.forEach(m => {
              if (m.key.startsWith('workflow_')) {
                const cap = m.canonicalKey;
                if (!next[cap]) next[cap] = {};
                next[cap][selectedRole] = val;
              } else {
                if (!next[m.key]) next[m.key] = {};
                MATRIX_ACTIONS.forEach(a => {
                  if (!next[m.key][a.key]) next[m.key][a.key] = {};
                  next[m.key][a.key][selectedRole] = val;
                  if (a.key === 'view') {
                    if (!next[m.key].read) next[m.key].read = {};
                    next[m.key].read[selectedRole] = val;
                  }
                  if (a.key === 'edit') {
                    if (!next[m.key].update) next[m.key].update = {};
                    next[m.key].update[selectedRole] = val;
                  }
                });
              }
            });
          });
          return next;
        });
        setConfirmModal({ open: false });
      },
    });
  };

  // Toggle all modules for a specific column in the active role
  const handleToggleColumnForRole = (actionKey) => {
    if (!isDeveloper) return;
    // Check if majority are enabled
    let enabledCount = 0;
    let totalCount = 0;
    MODULE_GROUPS.forEach(g => {
      g.modules.forEach(m => {
        if (!m.key.startsWith('workflow_')) {
          totalCount++;
          if (getRolePermission(m.key, actionKey, selectedRole)) enabledCount++;
        }
      });
    });

    const targetVal = enabledCount < totalCount;
    setWorkingRolePermissions(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}));
      MODULE_GROUPS.forEach(g => {
        g.modules.forEach(m => {
          if (!m.key.startsWith('workflow_')) {
            if (!next[m.key]) next[m.key] = {};
            if (!next[m.key][actionKey]) next[m.key][actionKey] = {};
            next[m.key][actionKey][selectedRole] = targetVal;
            if (actionKey === 'view') {
              if (!next[m.key].read) next[m.key].read = {};
              next[m.key].read[selectedRole] = targetVal;
            }
            if (actionKey === 'edit') {
              if (!next[m.key].update) next[m.key].update = {};
              next[m.key].update[selectedRole] = targetVal;
            }
          }
        });
      });
      return next;
    });
  };

  // Clear Staff Overrides
  const handleClearStaffOverrides = () => {
    if (!canManageStaff || !selectedStaff) return;
    setConfirmModal({
      open: true,
      title: `Reset All Custom Overrides for ${selectedStaff.name}?`,
      message: `This will remove all individual permissions overrides for ${selectedStaff.name}. They will immediately inherit the standard permissions of their "${selectedStaff.role}" role.`,
      onConfirm: () => {
        if (isDeveloper) {
          setWorkingStaffPermissions({});
        } else {
          // Admin can only clear non-sales overrides; retain sales module overrides
          setWorkingStaffPermissions(prev => {
            const next = {};
            ['cashSales', 'creditSales', 'customers', 'salesMarketing'].forEach(k => {
              if (prev?.[k] !== undefined) next[k] = prev[k];
            });
            return next;
          });
        }
        setConfirmModal({ open: false });
      },
    });
  };

  // Save Role Permissions
  const handleSaveRolePermissions = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await api.put('/settings', {
        rolePermissions: workingRolePermissions,
      });

      await refreshPermissions();
      setFeedback({ type: 'success', message: 'Role Privileges Matrix saved successfully! Changes apply immediately.' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save role privileges. Make sure you are authenticated as System Developer & Owner.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Save Staff Permissions
  const handleSaveStaffPermissions = async () => {
    if (!canManageStaff || !selectedStaffId) return;
    setSaving(true);
    setFeedback(null);
    try {
      const cleanCustom = Object.keys(workingStaffPermissions).length > 0 ? workingStaffPermissions : null;
      const res = await api.put(`/users/${selectedStaffId}`, {
        customPermissions: cleanCustom,
      });

      // Update local staff list
      setStaffList(prev => prev.map(u => u._id === selectedStaffId ? res.data : u));

      await refreshPermissions();
      setFeedback({
        type: 'success',
        message: `Custom privileges for ${selectedStaff.name} saved successfully!`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save staff permissions.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset unsaved changes
  const handleReset = () => {
    loadInitialData();
    setFeedback({ type: 'info', message: 'Permissions reset to last saved state.' });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Filter Modules by search and group
  const filteredGroups = useMemo(() => {
    return MODULE_GROUPS.map(g => {
      if (selectedGroupFilter !== 'all' && g.group !== selectedGroupFilter) return null;

      const matchedModules = g.modules.filter(m => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
      });

      if (matchedModules.length === 0) return null;
      return { ...g, modules: matchedModules };
    }).filter(Boolean);
  }, [searchQuery, selectedGroupFilter]);

  // Statistics for active role
  const roleStats = useMemo(() => {
    let total = 0;
    let enabled = 0;
    MODULE_GROUPS.forEach(g => {
      g.modules.forEach(m => {
        if (m.key.startsWith('workflow_')) {
          total++;
          if (getRolePermission(m.key, null, selectedRole)) enabled++;
        } else {
          MATRIX_ACTIONS.forEach(a => {
            total++;
            if (getRolePermission(m.key, a.key, selectedRole)) enabled++;
          });
        }
      });
    });
    return { total, enabled, percent: total > 0 ? Math.round((enabled / total) * 100) : 0 };
  }, [workingRolePermissions, selectedRole]);

  // Statistics for active staff overrides
  const staffStats = useMemo(() => {
    let grants = 0;
    let denials = 0;
    let inherited = 0;

    MODULE_GROUPS.forEach(g => {
      g.modules.forEach(m => {
        if (m.key.startsWith('workflow_')) {
          const s = getStaffPermissionStatus(m.key, null);
          if (s.state === 'override_granted') grants++;
          else if (s.state === 'override_denied') denials++;
          else inherited++;
        } else {
          MATRIX_ACTIONS.forEach(a => {
            const s = getStaffPermissionStatus(m.key, a.key);
            if (s.state === 'override_granted') grants++;
            else if (s.state === 'override_denied') denials++;
            else inherited++;
          });
        }
      });
    });
    return { grants, denials, inherited };
  }, [workingStaffPermissions, workingRolePermissions, selectedStaff]);

  return (
    <div className="space-y-5 w-full">
      {/* ── Security & Authority Header ── */}
      <div className={`rounded-2xl p-4.5 border transition shadow-sm ${
        isDeveloper
          ? 'bg-slate-900 border-indigo-900/60 text-white'
          : canManageStaff
            ? 'bg-emerald-950/90 border-emerald-800 text-white'
            : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2.5 ${
              isDeveloper
                ? 'bg-indigo-600 text-white'
                : canManageStaff
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-200 text-amber-800'
            }`}>
              {isDeveloper || canManageStaff ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">
                  Access Control &amp; Role Privileges Matrix
                </h3>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isDeveloper
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : canManageStaff
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  <Sparkles size={11} />
                  {isDeveloper
                    ? 'System Developer & Owner Mode'
                    : canManageStaff
                      ? 'Admin Mode (Authorized by Developer)'
                      : 'Read-Only Mode'}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${
                isDeveloper || canManageStaff ? 'text-slate-300' : 'text-amber-700'
              }`}>
                {isDeveloper
                  ? 'You have unrestricted authority over all user roles, module access, employee permissions, and administrative privileges.'
                  : canManageStaff
                    ? 'You are authorized by the System Developer & Owner to assign or revoke module access and permissions for individual employees (Sales & Marketing MS is reserved exclusively for the Owner).'
                    : 'Role Privileges and Employee Permissions are managed exclusively by the System Developer & Owner. Modifications are locked.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-black/20 border border-white/10 text-slate-300">
              User: <strong className="text-white">{user?.name}</strong> ({user?.role})
            </span>
          </div>
        </div>
      </div>

      {/* ── Developer Authority Delegation & System Master Controls (Exclusive to System Developer/Owner) ── */}
      {isDeveloper && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card 1: System Admin Permission Delegation Authority */}
          <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/90 via-white to-blue-50/90 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-xl p-2 bg-indigo-600 text-white shadow-xs shrink-0 mt-0.5">
                  <Shield size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      Admin Permission Delegation
                    </h4>
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      allowAdminManage
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}>
                      {allowAdminManage ? 'ADMINS AUTHORIZED' : 'DEVELOPER EXCLUSIVE'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                    Authorize the System Admin to assign or revoke module access and feature privileges for individual employees.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <span className="text-xs font-bold text-slate-700">
                  {allowAdminManage ? 'Active' : 'Disabled'}
                </span>
                <button
                  type="button"
                  disabled={togglingAdminAuth}
                  onClick={() => handleToggleAdminManage(!allowAdminManage)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    allowAdminManage ? 'bg-indigo-600' : 'bg-slate-300'
                  } ${togglingAdminAuth ? 'opacity-60 cursor-wait' : ''}`}
                  title="Toggle System Admin authority to manage employee permissions"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      allowAdminManage ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Admin Transaction Void & Delete Authority (Exclusive Developer Control) */}
          <div className="rounded-2xl border border-rose-200/90 bg-gradient-to-r from-rose-50/90 via-white to-amber-50/90 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-xl p-2 bg-rose-600 text-white shadow-xs shrink-0 mt-0.5">
                  <Trash2 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      Admin Void &amp; Delete Access
                    </h4>
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      allowAdminVoidDelete
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {allowAdminVoidDelete ? 'ADMINS AUTHORIZED' : 'DEVELOPER EXCLUSIVE'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                    Grant System Admin authority to void or delete transactions (GRVs, Sales, Adjustments). When disabled, only the Developer can void/delete.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <span className="text-xs font-bold text-slate-700">
                  {allowAdminVoidDelete ? 'Active' : 'Disabled'}
                </span>
                <button
                  type="button"
                  disabled={togglingAdminVoidAuth}
                  onClick={() => handleToggleAdminVoidDelete(!allowAdminVoidDelete)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    allowAdminVoidDelete ? 'bg-rose-600' : 'bg-slate-300'
                  } ${togglingAdminVoidAuth ? 'opacity-60 cursor-wait' : ''}`}
                  title="Toggle System Admin authority to void and delete inventory transactions"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      allowAdminVoidDelete ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Company Access to Sales & Marketing MS (Master Switch) */}
          <div className="rounded-2xl border border-violet-200/90 bg-gradient-to-r from-violet-50/90 via-white to-purple-50/90 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-xl p-2 bg-violet-600 text-white shadow-xs shrink-0 mt-0.5">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      Company Access: Sales MS
                    </h4>
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      salesMarketingEnabled
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {salesMarketingEnabled ? 'ACTIVE' : 'HIDDEN'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                    Master gate for Sales &amp; Marketing MS. When switched OFF by the Owner, all sales menus are hidden from company staff.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <span className="text-xs font-bold text-slate-700">
                  {salesMarketingEnabled ? 'Active' : 'Disabled'}
                </span>
                <button
                  type="button"
                  disabled={togglingSalesModule}
                  onClick={() => handleToggleSalesMarketing(!salesMarketingEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    salesMarketingEnabled ? 'bg-violet-600' : 'bg-slate-300'
                  } ${togglingSalesModule ? 'opacity-60 cursor-wait' : ''}`}
                  title="Toggle Company Access to Sales & Marketing MS"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      salesMarketingEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Tab Navigation (By Access Role vs By User / Staff Member) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-1">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('role')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'role'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield size={15} /> By Access Role
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'staff'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck size={15} /> By User / Staff Member
          </button>
        </div>

        {/* Global Save / Reset Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={saving || (activeTab === 'role' ? !isDeveloper : !canManageStaff)}
            className="text-xs text-slate-600 hover:bg-slate-100"
          >
            <RotateCcw size={14} /> Reset
          </Button>

          <Button
            type="button"
            variant="brass"
            onClick={activeTab === 'role' ? handleSaveRolePermissions : handleSaveStaffPermissions}
            disabled={saving || (activeTab === 'role' ? !isDeveloper : !canManageStaff)}
            className="shadow-sm font-semibold"
          >
            <Save size={15} />
            {saving ? 'Saving Changes…' : activeTab === 'role' ? 'Save Role Matrix' : 'Save User Overrides'}
          </Button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium animate-fadeIn ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Mode 1: BY ACCESS ROLE CONTROLS ── */}
      {activeTab === 'role' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Select Access Role to Configure:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {SYSTEM_ROLES.map(r => {
                  const isSelected = selectedRole === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setSelectedRole(r.key)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-blue-500/30'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <Shield size={14} className={isSelected ? 'text-amber-400' : 'text-slate-400'} />
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Bulk Actions for this role */}
            <div className="flex items-center flex-wrap gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              <span className="text-xs text-slate-500 font-semibold mr-1">Bulk Role Controls:</span>
              <button
                type="button"
                onClick={() => isDeveloper && handleBulkRoleAction('enable')}
                disabled={!isDeveloper}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition disabled:opacity-50"
              >
                <CheckCircle2 size={13} /> Enable All
              </button>
              <button
                type="button"
                onClick={() => isDeveloper && handleBulkRoleAction('disable')}
                disabled={!isDeveloper}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition disabled:opacity-50"
              >
                <XCircle size={13} /> Disable All
              </button>
            </div>
          </div>

          {/* Role Status Summary Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-slate-800">
                Active Role: <span className="capitalize text-blue-700 font-black">{selectedRole}</span>
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600">
                {SYSTEM_ROLES.find(r => r.key === selectedRole)?.description}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-600 font-medium">
                Granted: <strong className="text-emerald-700">{roleStats.enabled}</strong> / {roleStats.total} actions ({roleStats.percent}%)
              </span>
              <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${roleStats.percent}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mode 2: BY USER / STAFF MEMBER CONTROLS ── */}
      {activeTab === 'staff' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="w-full lg:max-w-md">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Select Individual Staff Member to Configure:
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition"
              >
                {displayedStaffList.map(s => {
                  const overrideCount = s.customPermissions ? Object.keys(s.customPermissions).length : 0;
                  return (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.email}) — Role: {s.role.toUpperCase()} {overrideCount > 0 ? `[${overrideCount} Overrides]` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedStaff && (
              <div className="flex items-center flex-wrap gap-2 pt-2 lg:pt-0">
                <button
                  type="button"
                  onClick={() => canManageStaff && handleClearStaffOverrides()}
                  disabled={!canManageStaff || Object.keys(workingStaffPermissions).length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200 transition disabled:opacity-50"
                  title="Remove all custom overrides for this user and revert to role default"
                >
                  <RotateCcw size={13} /> Reset All to Role Baseline
                </button>
              </div>
            )}
          </div>

          {selectedStaff && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl text-xs">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {selectedStaff.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <span className="font-bold text-slate-900">{selectedStaff.name}</span>
                  <span className="text-slate-500 ml-1.5">({selectedStaff.email})</span>
                  <span className="ml-2 px-2 py-0.2 rounded-full text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200 uppercase">
                    Role: {selectedStaff.role}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-100/80 px-2 py-0.5 rounded">
                  <Check size={12} /> {staffStats.grants} Custom Grants
                </span>
                <span className="inline-flex items-center gap-1 text-rose-800 font-bold bg-rose-100/80 px-2 py-0.5 rounded">
                  <Ban size={12} /> {staffStats.denials} Custom Denials
                </span>
                <span className="text-slate-500 font-medium">
                  {staffStats.inherited} Inherited from {selectedStaff.role}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Search & Filter Bar ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search module or action…"
            className="w-full rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-500 transition"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter size={13} className="text-slate-400" />
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="all">All Module Groups</option>
            {MODULE_GROUPS.map(g => (
              <option key={g.group} value={g.group}>{g.group}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              const allCollapsed = Object.keys(collapsedGroups).length === MODULE_GROUPS.length;
              if (allCollapsed) setCollapsedGroups({});
              else {
                const map = {};
                MODULE_GROUPS.forEach(g => { map[g.group] = true; });
                setCollapsedGroups(map);
              }
            }}
            className="text-xs text-blue-600 hover:underline font-semibold ml-2 whitespace-nowrap"
          >
            {Object.keys(collapsedGroups).length === MODULE_GROUPS.length ? 'Expand All' : 'Collapse All'}
          </button>
        </div>
      </div>

      {/* ── Structured Permission Matrix Table (8 Columns) ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[720px] overflow-y-auto">
          <table className="min-w-full text-xs text-left border-collapse">
            {/* Sticky Header */}
            <thead className="sticky top-0 bg-slate-900 text-white z-20 shadow-md">
              <tr className="border-b border-slate-800">
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider min-w-[280px]">
                  Module / Feature
                </th>
                {MATRIX_ACTIONS.map(action => {
                  const Icon = action.icon;
                  return (
                    <th key={action.key} className="py-3.5 px-2.5 text-center font-bold text-xs uppercase tracking-wider min-w-[95px]">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-1">
                          <Icon size={14} className="opacity-80" />
                          <span>{action.label}</span>
                        </div>
                        {activeTab === 'role' && isDeveloper && (
                          <button
                            type="button"
                            onClick={() => handleToggleColumnForRole(action.key)}
                            className="text-[10px] text-slate-400 hover:text-white underline font-normal mt-0.5"
                            title={`Toggle ${action.label} for all modules in ${selectedRole}`}
                          >
                            toggle all
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Matrix Body with Groups */}
            <tbody className="divide-y divide-slate-100">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No modules match your search query "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredGroups.map(group => {
                  const isCollapsed = Boolean(collapsedGroups[group.group]);

                  return (
                    <React.Fragment key={group.group}>
                      {/* Group Header Row */}
                      <tr
                        onClick={() => setCollapsedGroups(p => ({ ...p, [group.group]: !p[group.group] }))}
                        className="bg-slate-100/90 hover:bg-slate-200/80 cursor-pointer border-t-2 border-slate-200 transition"
                      >
                        <td colSpan={8} className="py-2.5 px-4 font-black text-slate-800 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                              <span>{group.group}</span>
                              <span className="ml-1 text-[11px] font-normal text-slate-500">
                                ({group.modules.length} modules)
                              </span>
                              {group.group === 'Sales & Commercial Operations' && !salesMarketingEnabled && (
                                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                  <Lock size={10} /> Disabled for Company (Hidden from Sidebar)
                                </span>
                              )}
                              {group.group === 'Sales & Commercial Operations' && !isDeveloper && (
                                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title="Sales & Marketing MS privileges are reserved exclusively for the Owner">
                                  <Lock size={10} /> Sales &amp; Marketing MS: Developer/Owner Only
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500">
                              {isCollapsed ? 'Click to expand' : 'Click to collapse'}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Module Rows */}
                      {!isCollapsed && group.modules.map(mod => {
                        const Icon = mod.icon;
                        const isWorkflow = mod.key.startsWith('workflow_');

                        return (
                          <tr key={mod.key} className="hover:bg-blue-50/30 transition">
                            {/* Column 1: Module / Feature Description */}
                            <td className="py-3 px-4">
                              <div className="flex items-start gap-2.5">
                                <div className="rounded-lg bg-slate-100 p-2 text-slate-700 mt-0.5 shrink-0 border border-slate-200">
                                  <Icon size={16} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-bold text-slate-900 text-xs leading-tight">
                                      {mod.label}
                                    </p>
                                    {!isDeveloper && isSalesModule(mod.key) && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title="Reserved for Developer/Owner only">
                                        <Lock size={9} /> Owner Only
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                    {mod.description}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Columns 2 - 8: The 7 Matrix Actions */}
                            {isWorkflow ? (
                              // Workflow capabilities are binary (Single Authority Switch)
                              <td colSpan={7} className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-3">
                                  <span className="text-xs font-semibold text-slate-600">
                                    Workflow Execution Power:
                                  </span>
                                  {activeTab === 'role' ? (
                                    (() => {
                                      const isEnabled = getRolePermission(mod.key, null, selectedRole);
                                      return (
                                        <button
                                          type="button"
                                          disabled={!isDeveloper}
                                          onClick={() => isDeveloper && setRolePermission(mod.key, null, selectedRole, !isEnabled)}
                                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            isEnabled ? 'bg-purple-600' : 'bg-slate-300'
                                          } ${!isDeveloper ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        >
                                          <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                              isEnabled ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                          />
                                        </button>
                                      );
                                    })()
                                  ) : (
                                    (() => {
                                      const s = getStaffPermissionStatus(mod.key, null);
                                      const isModAllowed = canManageModuleForStaff(mod.key);
                                      return (
                                        <div className="inline-flex items-center gap-2">
                                          <button
                                            type="button"
                                            disabled={!isModAllowed}
                                            onClick={() => isModAllowed && toggleStaffPermission(mod.key, null)}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                              s.value
                                                ? s.state === 'override_granted' ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'bg-purple-600'
                                                : s.state === 'override_denied' ? 'bg-rose-600 ring-2 ring-rose-300' : 'bg-slate-300'
                                            } ${!isModAllowed ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            title={!isModAllowed ? 'Sales & Marketing MS privileges are reserved for Developer/Owner only' : `Click to toggle override: Current: ${s.state}`}
                                          >
                                            <span
                                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                                s.value ? 'translate-x-5' : 'translate-x-0'
                                              }`}
                                            />
                                          </button>
                                          {s.state === 'override_granted' && (
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Custom ON</span>
                                          )}
                                          {s.state === 'override_denied' && (
                                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">Custom OFF</span>
                                          )}
                                          {s.state === 'inherited' && (
                                            <span className="text-[10px] font-medium text-slate-500">Role Default</span>
                                          )}
                                        </div>
                                      );
                                    })()
                                  )}
                                </div>
                              </td>
                            ) : (
                              // Regular CRUD Matrix (7 Actions)
                              MATRIX_ACTIONS.map(action => {
                                return (
                                  <td key={action.key} className="py-2.5 px-2 text-center align-middle">
                                    {activeTab === 'role' ? (
                                      // Role Mode
                                      (() => {
                                        const isEnabled = getRolePermission(mod.key, action.key, selectedRole);
                                        return (
                                          <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                            <input
                                              type="checkbox"
                                              disabled={!isDeveloper}
                                              checked={isEnabled}
                                              onChange={(e) => isDeveloper && setRolePermission(mod.key, action.key, selectedRole, e.target.checked)}
                                              className={`h-5 w-5 rounded-md cursor-pointer transition focus:ring-0 ${
                                                isEnabled ? 'accent-blue-600 text-blue-600' : 'text-slate-300'
                                              } ${!isDeveloper ? 'cursor-not-allowed opacity-50' : ''}`}
                                              title={`${action.label} for ${mod.label} (${selectedRole}: ${isEnabled ? 'Allowed' : 'Denied'})`}
                                            />
                                          </label>
                                        );
                                      })()
                                    ) : (
                                      // Staff Mode with Overrides
                                      (() => {
                                        const s = getStaffPermissionStatus(mod.key, action.key);
                                        const isModAllowed = canManageModuleForStaff(mod.key);
                                        return (
                                          <div className="flex flex-col items-center justify-center gap-0.5">
                                            <button
                                              type="button"
                                              disabled={!isModAllowed}
                                              onClick={() => isModAllowed && toggleStaffPermission(mod.key, action.key)}
                                              className={`h-5 w-5 rounded-md border flex items-center justify-center transition shadow-2xs ${
                                                s.state === 'override_granted'
                                                  ? 'bg-emerald-600 border-emerald-700 text-white ring-2 ring-emerald-300'
                                                  : s.state === 'override_denied'
                                                    ? 'bg-rose-600 border-rose-700 text-white ring-2 ring-rose-300'
                                                    : s.value
                                                      ? 'bg-blue-600 border-blue-700 text-white'
                                                      : 'bg-white border-slate-300 text-transparent'
                                              } ${!isModAllowed ? 'cursor-not-allowed opacity-30 bg-slate-100' : 'cursor-pointer hover:scale-105'}`}
                                              title={!isModAllowed ? 'Sales & Marketing MS privileges are reserved for Developer/Owner only' : `Click to cycle override: Current: ${s.state} (${s.value ? 'Allowed' : 'Denied'})`}
                                            >
                                              {s.state === 'override_denied' ? <X size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}
                                            </button>

                                            {/* Micro-badge indicating override status */}
                                            {s.state === 'override_granted' && (
                                              <span className="text-[9px] font-bold text-emerald-700 leading-none">ON</span>
                                            )}
                                            {s.state === 'override_denied' && (
                                              <span className="text-[9px] font-bold text-rose-700 leading-none">OFF</span>
                                            )}
                                          </div>
                                        );
                                      })()
                                    )}
                                  </td>
                                );
                              })
                            )}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Legend & Guidance Footer ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-slate-800">Legend:</span>
          {activeTab === 'role' ? (
            <>
              <span className="flex items-center gap-1.5">
                <input type="checkbox" checked readOnly className="h-4 w-4 rounded accent-blue-600" />
                <span>Permission Granted (Enabled)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <input type="checkbox" checked={false} readOnly className="h-4 w-4 rounded" />
                <span>Permission Denied (Disabled)</span>
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-blue-600 inline-block" />
                <span>Role Default (Inherited)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-emerald-600 ring-1 ring-emerald-300 inline-block" />
                <span>Custom Override: Granted</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-rose-600 ring-1 ring-rose-300 inline-block" />
                <span>Custom Override: Denied</span>
              </span>
            </>
          )}
        </div>

        <span className="text-[11px] text-slate-500">
          Changes take effect system-wide in real-time without requiring staff sign-out.
        </span>
      </div>

      {/* ── Confirmation Modal for Bulk Changes ── */}
      <Modal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false })}
        title={confirmModal.title}
        width="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-700 leading-relaxed">
            {confirmModal.message}
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmModal({ open: false })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brass"
              onClick={() => confirmModal.onConfirm && confirmModal.onConfirm()}
            >
              Confirm &amp; Apply
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
